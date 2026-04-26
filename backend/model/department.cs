using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("departments")]
public class Department
{
    [Key][Column("id")]
    public Guid Id { get; set; }

    [Required][Column("name")]
    public required string Name { get; set; }

    [Required][Column("site")]
    public required string Site { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}