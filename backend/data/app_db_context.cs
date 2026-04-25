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
    public DbSet<AccessPolicy> AccessPolicies { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // JSONB mapping
        modelBuilder.Entity<SensorReading>().Property(e => e.Payload).HasColumnType("jsonb");
        modelBuilder.Entity<AuditLog>().Property(e => e.Detail).HasColumnType("jsonb");

        // NOTE: Row-Level Security (RLS) is now enforced directly in PostgreSQL.
        // See supabase/migrations/20260430000000_rls_policies.sql
    }
}