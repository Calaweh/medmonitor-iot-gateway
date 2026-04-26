using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("permissions")]
public class Permission
{
    [Key][Column("id")]
    public Guid Id { get; set; }

    [Required][Column("resource")]
    public required string Resource { get; set; }

    [Required][Column("action")]
    public required string Action { get; set; }

    [Column("description")]
    public string? Description { get; set; }
}