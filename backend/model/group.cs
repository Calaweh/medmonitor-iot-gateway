using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("groups")]
public class Group
{
    [Key][Column("id")]
    public Guid Id { get; set; }

    [Required][Column("name")]
    public required string Name { get; set; }

    [Column("department_id")]
    public Guid DepartmentId { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Department? Department { get; set; }
}