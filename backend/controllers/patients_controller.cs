using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
                
                // 1. Find the active assignment (linked to filtered DbContext)
                var assignment = await _db.BedAssignments
                    .FirstOrDefaultAsync(b => b.PatientId == id && b.DischargedAt == null);

                if (assignment == null) 
                    return BadRequest(new { error = "Patient is not currently admitted to any bed." });

                var deviceId = assignment.DeviceId;

                // 2. End the assignment
                assignment.DischargedAt = DateTime.UtcNow;

                // 3. Record the ADT event
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
}
