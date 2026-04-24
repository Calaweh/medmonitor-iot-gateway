using MedicalDeviceMonitor.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AlertsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveAlerts([FromQuery] string? deviceCode)
    {
        var query = _db.Alerts.Include(a => a.Device).AsQueryable();
        
        if (!string.IsNullOrEmpty(deviceCode))
        {
            query = query.Where(a => a.Device!.DeviceCode == deviceCode);
        }

        var alerts = await query
            .Where(a => !a.IsResolved)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(alerts.Select(a => new {
            a.Id,
            DeviceCode = a.Device!.DeviceCode,
            a.AlertType,
            a.Severity,
            a.Message,
            a.CreatedAt
        }));
    }

    [HttpPost("{id}/resolve")]
    public async Task<IActionResult> ResolveAlert(long id)
    {
        var alert = await _db.Alerts.FindAsync(id);
        if (alert == null) return NotFound();

        alert.IsResolved = true;
        alert.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Alert resolved successfully" });
    }
}