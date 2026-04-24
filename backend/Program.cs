using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using MedicalDeviceMonitor.Services;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using Serilog.Context;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

// Load .env.local and force overwrite existing env vars
var envDict = Env.Load("../.env", new LoadOptions(
    setEnvVars: true,
    clobberExistingVars: true,
    onlyExactPath: false
));

var lokiUrl = Environment.GetEnvironmentVariable("LOKI_URL") ?? "http://localhost:3100";

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information() // Your logs
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning) // Hide system noise
    .MinimumLevel.Override("System", Serilog.Events.LogEventLevel.Warning)    // Hide system noise
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.GrafanaLoki(lokiUrl, 
        labels: new[] { new LokiLabel { Key = "app", Value = "medmon_backend" } },
        propertiesAsLabels: new[] { "device", "level" } // Promotes these properties to indexed labels
    )
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog(); 
builder.Configuration.AddEnvironmentVariables();

var connectionString = Environment.GetEnvironmentVariable("SUPABASE_CONN_STRING") 
                       ?? builder.Configuration.GetConnectionString("Supabase");

if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("SUPABASE_CONN_STRING environment variable or configuration is missing. Check your .env.local file.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        // This tells .NET: "If the DB is busy, wait a second and try again up to 3 times"
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3, 
            maxRetryDelay: TimeSpan.FromSeconds(5), 
            errorCodesToAdd: null);
    })
);

// ─── JWT Authentication Setup ────────────────────────────────
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
                // If the request is for our hub, read the token from the query string
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/vitalsigns"))
                {
                    context.Token = accessToken;
                }
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

// ─── Swagger with JWT Support ────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
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

// Register ReadingService
builder.Services.AddScoped(typeof(ReadingService));

var app = builder.Build();

Log.Information("Medical Device Monitor Backend is starting up on {Time}", DateTime.Now);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.Use(async (context, next) =>
{
    // Try to get the Correlation ID from the Python simulator, or generate one if missing
    var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault() 
                        ?? Guid.NewGuid().ToString();

    // Push it into Serilog's Context so every log in this request shares the ID
    using (LogContext.PushProperty("correlation_id", correlationId))
    {
        // Add it to the response headers for good measure
        context.Response.Headers.Append("X-Correlation-ID", correlationId);
        
        await next();
    }
});

app.UseCors("AllowFrontend");
app.UseAuthentication(); 
app.UseAuthorization();
app.MapControllers();
app.MapHub<VitalSignsHub>("/hubs/vitalsigns");

app.Run();