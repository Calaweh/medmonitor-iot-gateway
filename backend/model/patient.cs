using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedicalDeviceMonitor.Models;

[Table("patients")]
public class Patient
{
    [Key][Column("id")] public Guid Id { get; set; }
    [Column("mrn")] public required string Mrn { get; set; }
    [Column("full_name")] public required string FullName { get; set; }
    [Column("date_of_birth")] public DateTime DateOfBirth { get; set; }
}