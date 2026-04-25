using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("clinical_notes")]
public class ClinicalNote
{
    [Key][Column("id")] public Guid Id { get; set; }
    [Column("patient_id")] public Guid PatientId { get; set; }
    [Column("author_id")] public Guid AuthorId { get; set; }
    [Column("subjective")] public string? Subjective { get; set; }
    [Column("objective")] public string? Objective { get; set; }
    [Column("assessment")] public string? Assessment { get; set; }
    [Column("plan")] public string? Plan { get; set; }
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public Patient? Patient { get; set; }
    public User? Author { get; set; }
}