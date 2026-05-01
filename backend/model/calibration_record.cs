using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("calibration_records")]
public class CalibrationRecord
{
    [Key][Column("id")] public long Id { get; set; }
    
    [Column("device_id")] public Guid DeviceId { get; set; }
    
    [Column("calibrated_at")] public DateTime CalibratedAt { get; set; } = DateTime.UtcNow;
    
    [Column("technician")] public required string Technician { get; set; }
    
    [Column("notes")] public string? Notes { get; set; }
    
    [Column("passed")] public bool Passed { get; set; }
    
    [ForeignKey("DeviceId")]
    public virtual Device? Device { get; set; }
}