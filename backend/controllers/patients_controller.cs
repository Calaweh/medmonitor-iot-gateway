using MedicalDeviceMonitor.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PatientsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{id}/export")]
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

        // Return the secure export payload
        return Ok(new
        {
            patient.Mrn,
            patient.FullName,
            patient.DateOfBirth,
            patient.Gender,
            patient.BloodType,
            patient.Allergies,
            ExportedAt = DateTime.UtcNow,
            Disclaimer = "Exported in accordance with PDPA guidelines. This document contains protected health information (PHI)."
        });
    }
}