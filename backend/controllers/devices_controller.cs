using System;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Authorization;

namespace MedicalDeviceMonitor.Controllers;

public class DevicePairingDto
{
    public required string CertificateThumbprint { get; set; }
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MedicalDeviceMonitor.Services.AuditService _auditService;

    public DevicesController(AppDbContext db, MedicalDeviceMonitor.Services.AuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDevices()
    {
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

    [HttpGet("assignments/{deviceCode}")]
    [RequirePermission("patients:view")]
    public async Task<IActionResult> GetDeviceAssignments(string deviceCode)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
        if (device == null) return NotFound();

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
    [RequirePermission("rbac:manage")] 
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

    [HttpPost("{id}/pair")]
    [RequirePermission("rbac:manage")] // Restrict to Admin/Tech roles
    public async Task<IActionResult> PairDevice(Guid id, [FromBody] DevicePairingDto dto)
    {
        var device = await _db.Devices.FindAsync(id);
        if (device == null) return NotFound(new { error = "Device not found." });

        device.CertificateThumbprint = dto.CertificateThumbprint;
        
        // Ensure tamper-evident audit logging for device modifications
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userId = string.IsNullOrEmpty(userIdString) ? Guid.Empty : Guid.Parse(userIdString);
        
        await _auditService.LogActionAsync(userId, "PAIR_DEVICE", "Device", id.ToString(), new { thumbprint = dto.CertificateThumbprint });
        
        await _db.SaveChangesAsync();

        return Ok(new { message = "Device successfully paired with hardware certificate." });
    }
}