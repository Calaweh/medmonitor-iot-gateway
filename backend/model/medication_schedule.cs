using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("medication_schedules")]
public class MedicationSchedule
{
    [Key][Column("id")] public Guid Id { get; set; }
    [Column("patient_id")] public Guid PatientId { get; set; }
    [Column("medication_name")] public required string MedicationName { get; set; }
    [Column("dosage")] public required string Dosage { get; set; }
    [Column("route")] public string? Route { get; set; }
    [Column("scheduled_at")] public DateTime ScheduledAt { get; set; }
    [Column("administered_at")] public DateTime? AdministeredAt { get; set; }
    [Column("administered_by")] public Guid? AdministeredBy { get; set; }
    [Column("status")] public string Status { get; set; } = "scheduled";
    [Column("notes")] public string? Notes { get; set; }
    
    public Patient? Patient { get; set; }
}