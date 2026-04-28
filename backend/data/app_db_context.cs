using MedicalDeviceMonitor.Models;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Device> Devices { get; set; }
    public DbSet<SensorReading> SensorReadings { get; set; }
    public DbSet<Alert> Alerts { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Patient> Patients { get; set; }
    public DbSet<BedAssignment> BedAssignments { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<PatientThreshold> PatientThresholds { get; set; }
    public DbSet<CalibrationRecord> CalibrationRecords { get; set; }
    public DbSet<MedicationSchedule> MedicationSchedules { get; set; }
    public DbSet<ClinicalNote> ClinicalNotes { get; set; }
    public DbSet<PatientTransfer> PatientTransfers { get; set; } 
    public DbSet<Department> Departments { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<Group> Groups { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // JSONB mapping for Postgres
        modelBuilder.Entity<SensorReading>().Property(e => e.Payload).HasColumnType("jsonb");
        modelBuilder.Entity<AuditLog>().Property(e => e.Detail).HasColumnType("jsonb");
        
        // Ensure decimal precision for vitals if needed
        modelBuilder.Entity<PatientThreshold>().Property(p => p.MinValue).HasColumnType("decimal");
        modelBuilder.Entity<PatientThreshold>().Property(p => p.MaxValue).HasColumnType("decimal");

        modelBuilder.Entity<Role>()
            .HasMany(r => r.Permissions)
            .WithMany(p => p.Roles)
            .UsingEntity<Dictionary<string, object>>(
                "role_permissions", // Must match your SQL table name exactly
                j => j.HasOne<Permission>().WithMany().HasForeignKey("permission_id"),
                j => j.HasOne<Role>().WithMany().HasForeignKey("role_id")
            );
    }
}