using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("bed_assignments")]
public class BedAssignment
{
    [Key][Column("id")] public long Id { get; set; }
    [Column("patient_id")] public Guid PatientId { get; set; }
    [Column("device_id")] public Guid DeviceId { get; set; }
    [Column("admitted_at")] public DateTime AdmittedAt { get; set; } = DateTime.UtcNow;
    [Column("discharged_at")] public DateTime? DischargedAt { get; set; }
    [Column("diagnosis")] public string? Diagnosis { get; set; }
    
    public Patient? Patient { get; set; }
}