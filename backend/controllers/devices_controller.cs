using MedicalDeviceMonitor.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DevicesController : ControllerBase
{
    private readonly AppDbContext _db;
    public DevicesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetDevices()
    {
        // Fetch devices AND their currently admitted patient
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
}