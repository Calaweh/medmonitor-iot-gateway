using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController][Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly AppDbContext _db;
    public DevicesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetDevices()
    {
        // Fetch devices AND their currently admitted patient, plus last calibration record
        var devices = await _db.Devices
            .Select(d => new {
                d.Id,
                d.DeviceCode,
                d.Site,
                d.Department,
                d.Room,
                d.Labels,
                d.Description,
                CurrentAssignment = _db.BedAssignments
                    .Include(b => b.Patient)
                    .Where(b => b.DeviceId == d.Id && b.DischargedAt == null)
                    .FirstOrDefault(),
                LastCalibration = _db.CalibrationRecords
                    .Where(c => c.DeviceId == d.Id)
                    .OrderByDescending(c => c.CalibratedAt)
                    .FirstOrDefault()
            })
            .ToListAsync();
        return Ok(devices);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDevice(Guid id)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return NotFound();
        return Ok(device);
    }

    // --- NEW ENDPOINT: Fetch Past Patients for a Bed ---
    [HttpGet("assignments/{deviceCode}")][RequirePermission("patients:view")]
    public async Task<IActionResult> GetDeviceAssignments(string deviceCode)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
        if (device == null) return NotFound();

        // RLS handles visibility via the session claims 
        var assignments = await _db.BedAssignments
            .Include(b => b.Patient)
            .Where(b => b.DeviceId == device.Id)
            .OrderByDescending(b => b.AdmittedAt)
            .Select(b => new {
                b.Id,
                PatientName = b.Patient != null ? b.Patient.FullName : "Unknown",
                Mrn = b.Patient != null ? b.Patient.Mrn : "N/A",
                b.Diagnosis,
                b.AdmittedAt,
                b.DischargedAt
            })
            .ToListAsync();

        return Ok(assignments);
    }

    [HttpPost("{id}/calibrate")]
    [RequirePermission("rbac:manage")] // Restrict to Admin/Tech roles
    public async Task<IActionResult> LogCalibration(Guid id, [FromBody] CalibrationRecord dto)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return NotFound();

        var record = new CalibrationRecord
        {
            DeviceId = id,
            Technician = User.FindFirst("FullName")?.Value ?? "Unknown",
            Notes = dto.Notes,
            Passed = dto.Passed,
            CalibratedAt = DateTime.UtcNow
        };

        _db.CalibrationRecords.Add(record);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Calibration record persisted successfully." });
    }
}