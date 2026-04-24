using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("audit_log")]
public class AuditLog
{
    [Key][Column("id")] public long Id { get; set; }
    [Column("user_id")] public Guid? UserId { get; set; }
    [Column("action")] public required string Action { get; set; }
    [Column("entity_type")] public required string EntityType { get; set; }
    [Column("entity_id")] public required string EntityId { get; set; }
    [Column("detail")] public string? Detail { get; set; }
    [Column("occurred_at")] public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    [Column("previous_hash")] public string? PreviousHash { get; set; }
    [Column("hash")] public string? Hash { get; set; }
}