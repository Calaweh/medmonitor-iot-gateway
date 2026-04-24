using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("ward_assignments")]
public class WardAssignment
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Column("location")]
    public string? Location { get; set; }
}