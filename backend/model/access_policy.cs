using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("access_policies")]
public class AccessPolicy
{
    [Key][Column("id")] 
    public Guid Id { get; set; }
    
    [Column("user_id")] 
    public Guid UserId { get; set; }
    
    [Column("group_name")] 
    public string? GroupName { get; set; }
    
    [Column("allowed_site")] 
    public string? AllowedSite { get; set; }
    
    [Column("allowed_department")] 
    public string? AllowedDepartment { get; set; }
    
    [Column("allowed_room")] 
    public string? AllowedRoom { get; set; }
    
    [Column("allowed_labels", TypeName = "text[]")] 
    public string[]? AllowedLabels { get; set; }
    
    [Column("is_active")] 
    public bool IsActive { get; set; }
    
    [Column("expires_at")] 
    public DateTime? ExpiresAt { get; set; }
}