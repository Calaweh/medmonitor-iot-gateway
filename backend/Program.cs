using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ─── Database (Supabase / PostgreSQL) ───────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Supabase")));

// ─── SignalR ─────────────────────────────────────────────────
builder.Services.AddSignalR();

// ─── Controllers ─────────────────────────────────────────────
builder.Services.AddControllers();

// ─── CORS ────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                "http://localhost:5173",  // Vite dev server
                "http://localhost:3000"   // Docker / Nginx
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());       // Required for SignalR
});

// ─── Swagger ─────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ─── Business Services ───────────────────────────────────────
builder.Services.AddScoped<MedicalDeviceMonitor.Services.ReadingService>();
builder.Services.AddScoped<MedicalDeviceMonitor.Services.AlertService>();

var app = builder.Build();

// ─── Middleware Pipeline ─────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

// ─── SignalR Hub ─────────────────────────────────────────────
app.MapHub<VitalSignsHub>("/hubs/vitalsigns");

app.Run();
