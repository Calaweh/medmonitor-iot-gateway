using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq; 

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MedicationService _medService;

    public PatientsController(AppDbContext db, MedicationService medService)
    {
        _db = db;
        _medService = medService;
    }

    [HttpGet("admissions")][RequirePermission("patients:view")]
    public async Task<IActionResult> GetAdmissionsHistory([FromQuery] string? deviceCode)
    {
        var query = _db.BedAssignments
            .Include(b => b.Patient)
            .Include(b => b.Device)
            .OrderByDescending(b => b.AdmittedAt)
            .AsQueryable();

        // If navigating from a specific bed, filter by it
        if (!string.IsNullOrEmpty(deviceCode))
        {
            query = query.Where(b => b.Device!.DeviceCode == deviceCode);
        }

        var history = await query.Select(b => new {
            b.Id,
            PatientId = b.Patient!.Id,
            PatientName = b.Patient.FullName,
            Mrn = b.Patient.Mrn,
            DeviceCode = b.Device!.DeviceCode,
            b.Diagnosis,
            b.AdmittedAt,
            b.DischargedAt
        }).Take(200).ToListAsync();

        return Ok(history);
    }
    
    [HttpPost("debug/check-meds")]
    [RequirePermission("users:manage")] 
    public async Task<IActionResult> TriggerMedCheck()
    {
        await _medService.CheckOverdueMedicationsAsync();
        return Ok(new { message = "Overdue medication scan completed manually." });
    }
    
    [HttpGet("{id}/export")]
    [RequirePermission("patients:export")]
    public async Task<IActionResult> ExportPatientData(Guid id)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null) return NotFound();
        
        // SRS-006: Patient data export shall require explicit consent=true flag
        if (!patient.Consent)
        {
            return StatusCode(403, new 
            { 
                error = "PDPA_CONSENT_REQUIRED", 
                message = "Patient has not provided explicit consent for data export." 
            });
        }

        // Map internal Patient model to FHIR R4 Patient Resource
        var fhirPatient = new
        {
            resourceType = "Patient",
            id = patient.Id.ToString(),
            meta = new
            {
                lastUpdated = DateTime.UtcNow.ToString("O"),
                security = new[] {
                    new {
                        system = "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                        code = "R",
                        display = "Restricted"
                    }
                }
            },
            text = new
            {
                status = "generated",
                @div = $"<div xmlns=\"http://www.w3.org/1999/xhtml\">Exported in accordance with PDPA guidelines. Contains PHI.</div>"
            },
            identifier = new[]
            {
                new {
                    use = "usual",
                    type = new {
                        coding = new[] { new { system = "http://terminology.hl7.org/CodeSystem/v2-0203", code = "MR" } }
                    },
                    system = "urn:oid:2.16.840.1.113883.4.1", // Generic OID for MRN
                    value = patient.Mrn
                }
            },
            name = new[]
            {
                new {
                    use = "official",
                    text = patient.FullName
                }
            },
            gender = patient.Gender?.ToLower() switch {
                "male" => "male", "female" => "female", "other" => "other", _ => "unknown"
            },
            birthDate = patient.DateOfBirth.ToString("yyyy-MM-dd"),
            extension = new List<object>()
        };

        // If Blood Type exists, add it as a standard FHIR observation/extension payload representation
        if (!string.IsNullOrEmpty(patient.BloodType))
        {
            fhirPatient.extension.Add(new {
                url = "http://hl7.org/fhir/StructureDefinition/patient-bloodType",
                valueString = patient.BloodType
            });
        }

        return Ok(fhirPatient);
    }

    [HttpPost("{id}/discharge")]
    [RequirePermission("patients:admit")]
    public async Task<IActionResult> DischargePatient(Guid id, [FromQuery] string? notes)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync<IActionResult>(async () => 
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try 
            {
                var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
                var assignment = await _db.BedAssignments
                    .FirstOrDefaultAsync(b => b.PatientId == id && b.DischargedAt == null);

                if (assignment == null) 
                    return BadRequest(new { error = "Patient is not currently admitted to any bed." });

                var deviceId = assignment.DeviceId;
                assignment.DischargedAt = DateTime.UtcNow;

                var transfer = new PatientTransfer {
                    PatientId = id,
                    FromDeviceId = deviceId,
                    ToDeviceId = null,
                    ActionType = "DISCHARGE",
                    PerformedBy = userId,
                    Notes = notes
                };

                _db.PatientTransfers.Add(transfer);
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok(new { message = "Patient discharged successfully." });
            } 
            catch 
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    [HttpGet("{patientId}/notes")]
    [RequirePermission("patients:view")]
    public async Task<IActionResult> GetNotes(Guid patientId)
    {
        var notes = await _db.ClinicalNotes
            .Include(n => n.Author)
            .Where(n => n.PatientId == patientId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new {
                n.Id,
                n.Subjective,
                n.Objective,
                n.Assessment,
                n.Plan,
                n.CreatedAt,
                AuthorName = n.Author!.FullName
            })
            .ToListAsync();

        return Ok(notes);
    }

    [HttpPost("{patientId}/notes")]
    [RequirePermission("patients:admit")] // Doctors/Senior Nurses
    public async Task<IActionResult> AddNote(Guid patientId, [FromBody] ClinicalNote dto)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        
        var note = new ClinicalNote
        {
            PatientId = patientId,
            AuthorId = userId,
            Subjective = dto.Subjective,
            Objective = dto.Objective,
            Assessment = dto.Assessment,
            Plan = dto.Plan,
            CreatedAt = DateTime.UtcNow
        };

        _db.ClinicalNotes.Add(note);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Clinical SOAP note recorded." });
    }
}