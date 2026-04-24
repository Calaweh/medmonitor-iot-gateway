using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using MedicalDeviceMonitor.Services;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using Serilog.Context;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json;
using MedicalDeviceMonitor.Models;
using System.Security.Claims;
using Hangfire;
using Hangfire.PostgreSql;

// Load .env.local and force overwrite existing env vars
Env.Load("../.env", new LoadOptions(
    setEnvVars: true,
    clobberExistingVars: true,
    onlyExactPath: false
));

var lokiUrl = Environment.GetEnvironmentVariable("LOKI_URL") ?? "http://localhost:3100";

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

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    })
);

// ─── Health Checks ─────────────────────────────────────────────────────────
// /health      → liveness (always 200 if process is up)
// /health/db   → readiness — confirms Supabase Postgres is reachable
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>(
        name: "database",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "db", "ready" });

// ─── JWT Authentication ─────────────────────────────────────────────────────
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
                ?? builder.Configuration["Jwt:Secret"]
                ?? "FallbackSecretKeyThatIsAtLeast32BytesLong!";

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
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:3000"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddEndpointsApiExplorer();

// ─── Swagger with JWT bearer auth ──────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MedMonitor API",
        Version = "v2",
        Description = "Medical Device Monitoring System — IEC 62304 Class B"
    });

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

// Hangfire for scheduled jobs
builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(connectionString));
builder.Services.AddHangfireServer();

// Register the retention job as a service
builder.Services.AddScoped<RetentionService>();

var app = builder.Build();

Log.Information("Medical Device Monitor Backend starting on {Time}", DateTime.Now);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "MedMonitor v2"));
}

// ─── Health Check Endpoints ─────────────────────────────────────────────────
// Liveness — GitHub Actions keepalive should point here instead of /api/devices
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false, // Only checks that the app is alive (no DB query)
    ResponseWriter = async (ctx, _) =>
    {
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync("{\"status\":\"healthy\",\"service\":\"medmon-backend\"}");
    }
});

// Readiness — includes DB probe
app.MapHealthChecks("/health/db", new HealthCheckOptions
{
    Predicate = hc => hc.Tags.Contains("db"),
    ResponseWriter = async (ctx, report) =>
    {
        ctx.Response.ContentType = "application/json";
        var result = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description
            })
        };
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(result));
    }
});

// ─── Correlation ID Middleware ──────────────────────────────────────────────
app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
                        ?? Guid.NewGuid().ToString();
    using (LogContext.PushProperty("correlation_id", correlationId))
    {
        context.Response.Headers.Append("X-Correlation-ID", correlationId);
        await next();
    }
});

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var userRole = context.User?.FindFirst(ClaimTypes.Role)?.Value;

    try
    {
        if (userId != null)
        {
            if (userRole == "admin")
            {
                // Bypass filter entirely for admins
                WardContext.AllowedLocations = null; 
            }
            else
            {
                using var scope = context.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var locations = await db.Set<WardAssignment>()
                    .Where(w => w.UserId == Guid.Parse(userId))
                    .Select(w => w.Location)
                    .Distinct()
                    .ToListAsync();
                
                // If they have no locations assigned, this empty list correctly blocks all queries
                WardContext.AllowedLocations = locations; 
            }
        }
        else
        {
            // Fallback for unauthenticated or system requests
            WardContext.AllowedLocations = null;
        }

        await next();
    }
    finally
    {
        // CRITICAL: Prevent leaking the previous user's locations to the next request on the same thread
        WardContext.AllowedLocations = null; 
    }
});

app.MapControllers();
app.MapHub<VitalSignsHub>("/hubs/vitalsigns");

using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobManager.AddOrUpdate<RetentionService>(
        "purge-old-readings",
        svc => svc.PurgeOldReadingsAsync(),
        "0 2 * * *");
}

app.Run();