using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("devices")]
public class Device
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("device_code")]
    public required string DeviceCode { get; set; }

    [Column("description")]
    public string? Description { get; set; }
    
    [Column("site")] 
    public string? Site { get; set; }
    
    [Column("department")] 
    public string? Department { get; set; }
    
    [Column("room")] 
    public string? Room { get; set; }
    
    [Column("labels", TypeName = "text[]")] 
    public string[] Labels { get; set; } = Array.Empty<string>();
    
    [Column("is_active")]
    public bool IsActive { get; set; }
}