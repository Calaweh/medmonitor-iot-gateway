using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace MedicalDeviceMonitor.Models;

[Table("sensor_readings")]
public class SensorReading
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("device_id")]
    public Guid DeviceId { get; set; }

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; }

    [Column("payload", TypeName = "jsonb")]
    public required JsonDocument Payload { get; set; }
    
    public Device? Device { get; set; }
}