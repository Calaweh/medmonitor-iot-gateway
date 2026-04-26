using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("users")]
public class User
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("email")]
    public required string Email { get; set; }

    [Column("password_hash")]
    public required string PasswordHash { get; set; }

    [Column("role")]
    public required string Role { get; set; }

    [Column("full_name")]
    public required string FullName { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;
    
    [Column("totp_secret")]
    public string? TotpSecret { get; set; }
    
    [Column("is_totp_enabled")]
    public bool IsTotpEnabled { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("department_id")]
    public Guid? DepartmentId { get; set; }

    [Column("token_version")]
    public int TokenVersion { get; set; } = 1;

    public Department? Department { get; set; }
}