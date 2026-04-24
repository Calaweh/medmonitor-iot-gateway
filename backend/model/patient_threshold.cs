using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("patient_thresholds")]
public class PatientThreshold
{
    [Key][Column("id")]
    public long Id { get; set; }

    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Column("vital_sign")]
    public required string VitalSign { get; set; }

    [Column("min_value")]
    public double? MinValue { get; set; }

    [Column("max_value")]
    public double? MaxValue { get; set; }

    [Column("set_by")]
    public string? SetBy { get; set; }

    [Column("set_at")]
    public DateTime SetAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Patient? Patient { get; set; }
}