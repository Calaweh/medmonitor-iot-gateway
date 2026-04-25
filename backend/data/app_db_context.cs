using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Data;

public class AppDbContext : DbContext
{
    // Injected per-request
    public UserAccessContext AccessContext { get; }

    public AppDbContext(DbContextOptions<AppDbContext> options,
                        UserAccessContext accessContext) : base(options)
    {
        AccessContext = accessContext;
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
    public DbSet<AccessPolicy> AccessPolicies { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // JSONB mapping
        // JSONB mapping
        modelBuilder.Entity<SensorReading>().Property(e => e.Payload).HasColumnType("jsonb");
        modelBuilder.Entity<AuditLog>().Property(e => e.Detail).HasColumnType("jsonb");

        // ─── ABAC / Multi-Tenant Native Subquery Filters ───────────────────────────────
        modelBuilder.Entity<Device>().HasQueryFilter(d =>
            this.AccessContext.IsAuthenticated && (
                this.AccessContext.IsAdmin || 
                AccessPolicies.Any(p => 
                    p.UserId == this.AccessContext.UserId && p.IsActive && 
                    (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow) &&
                    (
                        (p.AllowedSite == null || p.AllowedSite == d.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == d.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == d.Room) ||
                        (p.AllowedLabels != null && p.AllowedLabels.Any(l => d.Labels.Contains(l)))
                    )
                )
            )
        );

        modelBuilder.Entity<Alert>().HasQueryFilter(d =>
            this.AccessContext.IsAuthenticated && (
                this.AccessContext.IsAdmin || 
                AccessPolicies.Any(p => 
                    p.UserId == this.AccessContext.UserId && p.IsActive && 
                    (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow) &&
                    (
                        (p.AllowedSite == null || p.AllowedSite == a.Device!.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == a.Device!.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == a.Device!.Room) ||
                        (p.AllowedLabels != null && p.AllowedLabels.Any(l => a.Device!.Labels.Contains(l)))
                    )
                )
            )
        );

        modelBuilder.Entity<SensorReading>().HasQueryFilter(d =>
            this.AccessContext.IsAuthenticated && (
                this.AccessContext.IsAdmin || 
                AccessPolicies.Any(p => 
                    p.UserId == this.AccessContext.UserId && p.IsActive && 
                    (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow) &&
                    (
                        (p.AllowedSite == null || p.AllowedSite == r.Device!.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == r.Device!.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == r.Device!.Room) ||
                        (p.AllowedLabels != null && p.AllowedLabels.Any(l => r.Device!.Labels.Contains(l)))
                    )
                )
            )
        );

        modelBuilder.Entity<BedAssignment>().HasQueryFilter(d =>
            this.AccessContext.IsAuthenticated && (
                this.AccessContext.IsAdmin || 
                AccessPolicies.Any(p => 
                    p.UserId == this.AccessContext.UserId && p.IsActive && 
                    (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow) &&
                    (
                        (p.AllowedSite == null || p.AllowedSite == b.Device!.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == b.Device!.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == b.Device!.Room) ||
                        (p.AllowedLabels != null && p.AllowedLabels.Any(l => b.Device!.Labels.Contains(l)))
                    )
                )
            )
        );
    }
}