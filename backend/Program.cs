using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using MedicalDeviceMonitor.Services;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using Npgsql;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using Serilog.Context;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using MedicalDeviceMonitor.Models;
using System.Security.Claims;
using System.Reflection; 
using Hangfire;
using Hangfire.PostgreSql;
using QuestPDF.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using MedicalDeviceMonitor.Authorization;



// Load .env.local and force overwrite existing env vars
Env.Load("../.env", new LoadOptions(
    setEnvVars: true,
    clobberExistingVars: true,
    onlyExactPath: false
));

var lokiUrl = Environment.GetEnvironmentVariable("LOKI_URL") ?? "http://localhost:3100";

// --- GLOBAL SETTINGS ---
QuestPDF.Settings.License = LicenseType.Community;
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear(); // Ensure 'sub' maps to ClaimTypes.NameIdentifier


Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.GrafanaLoki(lokiUrl,
        labels: new[] { new LokiLabel { Key = "app", Value = "medmon_backend" } },
        propertiesAsLabels: new[] { "device", "level" }
    )
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

builder.Configuration.AddEnvironmentVariables();
var connectionString = Environment.GetEnvironmentVariable("SUPABASE_CONN_STRING")
                       ?? builder.Configuration.GetConnectionString("Supabase");

if (string.IsNullOrEmpty(connectionString))
    throw new InvalidOperationException(
        "SUPABASE_CONN_STRING environment variable or configuration is missing. Check your .env.local file.");

// ─── Scalable Security Registration ──────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TenantInterceptor>();

builder.Services.AddDbContext<AppDbContext>((serviceProvider, options) =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(3);
        npgsqlOptions.CommandTimeout(30); 
    });
    options.AddInterceptors(serviceProvider.GetRequiredService<TenantInterceptor>());
});

// ─── Health Checks ─────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>(
        name: "database",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "ready" });

// ─── JWT Authentication & Validation ────────────────────────────────────────
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? builder.Configuration["Jwt:Secret"]
                ?? throw new InvalidOperationException("CRITICAL: JWT_SECRET is not configured.");


builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
        
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/vitalsigns"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            },
            
            // --- HSA CLS-MD LEVEL 2: TOKEN REVOCATION CHECK ---
            OnTokenValidated = async context =>
            {
                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var userIdString = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var tokenVersionString = context.Principal?.FindFirst("TokenVersion")?.Value;

                if (Guid.TryParse(userIdString, out var userId) && int.TryParse(tokenVersionString, out var tokenVersion))
                {
                    // Verify the JWT token version matches the DB. If lower, the token was revoked due to permission change
                    var userVersion = await db.Users.Where(u => u.Id == userId).Select(u => u.TokenVersion).FirstOrDefaultAsync();
                    if (userVersion != tokenVersion)
                    {
                        context.Fail("Security context expired. Token has been revoked due to a permission or role modification.");
                    }
                }
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddEndpointsApiExplorer();

// ─── Rate Limiting ──────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options => {
    options.AddFixedWindowLimiter("ingest", o => {
        o.PermitLimit = 60; // 60 readings per minute per device
        o.Window = TimeSpan.FromMinutes(1);
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
});


builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MedMonitor API",
        Version = "v2.1",
        Description = "Medical Device Monitoring System — IEC 62304 Class B. Enterprise Scale Edition."
    });
    
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization. Enter your token below. Example: \"Bearer eyJ...\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddScoped(typeof(ReadingService));
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<MedicationService>();

var isDevelopment = builder.Environment.IsDevelopment();

builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(connectionString)));

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 1;
    options.HeartbeatInterval = TimeSpan.FromMinutes(2);
    options.ServerCheckInterval = TimeSpan.FromMinutes(5);
    options.SchedulePollingInterval = TimeSpan.FromMinutes(1);
    options.CancellationCheckInterval = TimeSpan.FromMinutes(2);
});

builder.Services.AddScoped<RetentionService>();
builder.Services.AddScoped<AlertEscalationService>();
builder.Services.AddScoped<AlertEscalationService>();

var app = builder.Build();

Log.Information("Medical Device Monitor Backend starting on {Time}", DateTime.Now);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "MedMonitor v2.1"));
}

app.UseRateLimiter();

// ─── Hangfire Dashboard ─────────────────────────────────────────────────────
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireAuthFilter() }
});


app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = async (ctx, _) =>
    {
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync("{\"status\":\"healthy\",\"service\":\"medmon-backend\"}");
    }
});

app.MapHealthChecks("/health/db", new HealthCheckOptions
{
    Predicate = hc => hc.Tags.Contains("db"),
    ResponseWriter = async (ctx, report) =>
    {
        ctx.Response.ContentType = "application/json";
        var result = new { status = report.Status.ToString(), checks = report.Entries.Select(e => new { name = e.Key, status = e.Value.Status.ToString() }) };
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(result));
    }
});

// ─── Request Pipeline ────────────────────────────────────────────────────────
app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault() ?? Guid.NewGuid().ToString();
    using (LogContext.PushProperty("correlation_id", correlationId))
    {
        context.Response.Headers.Append("X-Correlation-ID", correlationId);
        await next();
    }
});

// --- HSA CLS-MD LEVEL 2: RLS CONTEXT PROPAGATION ---
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var db = context.RequestServices.GetRequiredService<AppDbContext>();
        var deptId = context.User.FindFirst("DepartmentId")?.Value;
        var role = context.User.FindFirst(ClaimTypes.Role)?.Value ?? "nurse";

        if (!string.IsNullOrEmpty(deptId))
        {
            try 
            {
                // Set session variables for Postgres RLS policies
                await db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_dept_id', @p0, false)", deptId);
                await db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', @p1, false)", role);
            }
            catch (DbUpdateException ex)
            {
                Log.Warning(ex, "Failed to set RLS context for user {User}", context.User.Identity.Name);
            }
            catch (InvalidOperationException ex)
            {
                Log.Warning(ex, "Failed to set RLS context for user {User}", context.User.Identity.Name);
            }
            catch (NpgsqlException ex)
            {
                Log.Warning(ex, "Failed to set RLS context for user {User}", context.User.Identity.Name);
            }
        }
    }
    await next();
});

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<VitalSignsHub>("/hubs/vitalsigns");

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        // --- SCHEMA HOTFIX: Apply missing columns that CREATE TABLE IF NOT EXISTS skipped ---
        try 
        {
            var migrationSql = @"
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS certificate_thumbprint VARCHAR(64);
                ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

                ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
                ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id);

                ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN DEFAULT FALSE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;
                ALTER TABLE users ALTER COLUMN token_version TYPE INT USING NULLIF(token_version::text, '')::integer;

                ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address INET;

                ALTER TABLE bed_assignments ADD COLUMN IF NOT EXISTS attending_physician VARCHAR(100);
                ALTER TABLE bed_assignments ADD COLUMN IF NOT EXISTS admission_type VARCHAR(50);
            ";
            await db.Database.ExecuteSqlRawAsync(migrationSql);
            
            // Apply seed data for devices that might be missing a department
            await db.Database.ExecuteSqlRawAsync("INSERT INTO departments (name, site) VALUES ('ICU', 'Main Campus') ON CONFLICT (name) DO NOTHING;");
            await db.Database.ExecuteSqlRawAsync("UPDATE devices SET department_id = (SELECT id FROM departments WHERE name = 'ICU') WHERE department_id IS NULL;");

            logger.LogInformation("Database schema hotfix applied successfully.");
        }
        catch (System.Data.Common.DbException ex)
        {
            logger.LogError(ex, "Failed to apply database schema hotfix.");
        }
        catch (InvalidOperationException ex)
        {
            logger.LogError(ex, "Failed to apply database schema hotfix.");
        }

        var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
        recurringJobManager.AddOrUpdate<RetentionService>(
            "purge-old-readings", 
            svc => svc.PurgeOldReadingsAsync(), 
            "0 2 * * *");
            
        recurringJobManager.AddOrUpdate<MedicationService>(
            "check-missed-meds", 
            svc => svc.CheckOverdueMedicationsAsync(), 
            "*/15 * * * *");
            
        recurringJobManager.AddOrUpdate<AlertEscalationService>(
            "escalate-unresolved-alerts", 
            svc => svc.EscalateAlertsAsync(), 
            "*/5 * * * *"); 
            
        logger.LogInformation("Hangfire recurring jobs registered successfully.");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, 
            "Hangfire job registration failed at startup (Supabase may be waking up). " +
            "Jobs will self-register on next Hangfire server heartbeat.");
    }
}

app.Run();