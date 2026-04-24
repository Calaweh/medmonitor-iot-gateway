using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Data;

public class AppDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public AppDbContext(DbContextOptions<AppDbContext> options,
                        IHttpContextAccessor? httpContextAccessor = null) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<Device> Devices { get; set; }
    public DbSet<SensorReading> SensorReadings { get; set; }
    public DbSet<Alert> Alerts { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Patient> Patients { get; set; }
    public DbSet<BedAssignment> BedAssignments { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<PatientThreshold> PatientThresholds { get; set; }
    public DbSet<WardAssignment> WardAssignments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // JSONB mapping
        modelBuilder.Entity<SensorReading>().Property(e => e.Payload).HasColumnType("jsonb");

        // Ward isolation filters for complete data isolation
        modelBuilder.Entity<Device>().HasQueryFilter(d =>
            WardContext.AllowedLocations == null ||
            WardContext.AllowedLocations.Contains(d.Location));

        modelBuilder.Entity<Alert>().HasQueryFilter(a =>
            WardContext.AllowedLocations == null ||
            WardContext.AllowedLocations.Contains(a.Device!.Location));

        modelBuilder.Entity<SensorReading>().HasQueryFilter(r =>
            WardContext.AllowedLocations == null ||
            WardContext.AllowedLocations.Contains(r.Device!.Location));

        modelBuilder.Entity<BedAssignment>().HasQueryFilter(b =>
            WardContext.AllowedLocations == null ||
            WardContext.AllowedLocations.Contains(b.Device!.Location));
    }
}