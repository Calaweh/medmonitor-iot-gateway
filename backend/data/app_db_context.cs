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
    
    // Replacing old WardAssignments with the new ABAC AccessPolicies
    public DbSet<AccessPolicy> AccessPolicies { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // JSONB mapping
        modelBuilder.Entity<SensorReading>().Property(e => e.Payload).HasColumnType("jsonb");

        // ─── ABAC / Multi-Tenant Isolation Filters ──────────────────────────────────────
        // Devices Filter
        modelBuilder.Entity<Device>().HasQueryFilter(d =>
            SecurityContext.Current != null && (
                SecurityContext.Current.IsAdmin || 
                SecurityContext.Current.Policies.Any(p => 
                    (
                        (p.AllowedSite == null || p.AllowedSite == d.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == d.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == d.Room)
                    ) ||
                    (
                        p.AllowedLabels != null && d.Labels != null && p.AllowedLabels.Any(l => d.Labels.Contains(l))
                    )
                )
            )
        );

        // Alerts Filter (via a.Device)
        modelBuilder.Entity<Alert>().HasQueryFilter(a =>
            SecurityContext.Current != null && (
                SecurityContext.Current.IsAdmin || 
                SecurityContext.Current.Policies.Any(p => 
                    (
                        (p.AllowedSite == null || p.AllowedSite == a.Device!.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == a.Device!.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == a.Device!.Room)
                    ) ||
                    (
                        p.AllowedLabels != null && a.Device!.Labels != null && p.AllowedLabels.Any(l => a.Device!.Labels.Contains(l))
                    )
                )
            )
        );
        
        // SensorReadings Filter (via r.Device)
        modelBuilder.Entity<SensorReading>().HasQueryFilter(r =>
            SecurityContext.Current != null && (
                SecurityContext.Current.IsAdmin || 
                SecurityContext.Current.Policies.Any(p => 
                    (
                        (p.AllowedSite == null || p.AllowedSite == r.Device!.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == r.Device!.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == r.Device!.Room)
                    ) ||
                    (
                        p.AllowedLabels != null && r.Device!.Labels != null && p.AllowedLabels.Any(l => r.Device!.Labels.Contains(l))
                    )
                )
            )
        );

        // BedAssignments Filter (via b.Device)
        modelBuilder.Entity<BedAssignment>().HasQueryFilter(b =>
            SecurityContext.Current != null && (
                SecurityContext.Current.IsAdmin || 
                SecurityContext.Current.Policies.Any(p => 
                    (
                        (p.AllowedSite == null || p.AllowedSite == b.Device!.Site) &&
                        (p.AllowedDepartment == null || p.AllowedDepartment == b.Device!.Department) &&
                        (p.AllowedRoom == null || p.AllowedRoom == b.Device!.Room)
                    ) ||
                    (
                        p.AllowedLabels != null && b.Device!.Labels != null && p.AllowedLabels.Any(l => b.Device!.Labels.Contains(l))
                    )
                )
            )
        );
    }
}