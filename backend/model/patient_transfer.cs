using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("patient_transfers")]
public class PatientTransfer
{
    [Key][Column("id")] public long Id { get; set; }
    
    [Column("patient_id")] public Guid PatientId { get; set; }
    
    [Column("from_device_id")] public Guid? FromDeviceId { get; set; }
    
    [Column("to_device_id")] public Guid? ToDeviceId { get; set; }
    
    [Column("action_type")] public required string ActionType { get; set; } // ADMIT, TRANSFER, DISCHARGE
    
    [Column("performed_by")] public Guid PerformedBy { get; set; }
    
    [Column("occurred_at")] public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    
    [Column("notes")] public string? Notes { get; set; }

    public Patient? Patient { get; set; }
}