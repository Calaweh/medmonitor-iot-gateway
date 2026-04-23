using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("alerts")]
public class Alert
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("device_id")]
    public Guid DeviceId { get; set; }

    [Column("reading_id")]
    public long? ReadingId { get; set; }

    [Column("alert_type")]
    public required string AlertType { get; set; }

    [Column("severity")]
    public required string Severity { get; set; }

    [Column("message")]
    public required string Message { get; set; }

    [Column("is_resolved")]
    public bool IsResolved { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("resolved_at")]
    public DateTime? ResolvedAt { get; set; }

    // Navigation properties
    public Device? Device { get; set; }
    public SensorReading? Reading { get; set; }
}
