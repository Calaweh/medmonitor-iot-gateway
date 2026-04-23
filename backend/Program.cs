using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using MedicalDeviceMonitor.Services;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using Serilog;
using Serilog.Sinks.Grafana.Loki;
using Serilog.Context;

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
        filteredLabels: new[] { "device", "level" } // Promotes these properties to indexed labels
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
builder.Services.AddSwaggerGen();

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
app.UseAuthorization();
app.MapControllers();
app.MapHub<VitalSignsHub>("/hubs/vitalsigns");

app.Run();