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

    [Column("location")]
    public string? Location { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; }
}