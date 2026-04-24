using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AlertsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetActiveAlerts([FromQuery] string? deviceCode)
    {
        var query = _db.Alerts.Include(a => a.Device).AsQueryable();
        if (!string.IsNullOrEmpty(deviceCode))
            query = query.Where(a => a.Device!.DeviceCode == deviceCode);

        var alerts = await query.Where(a => !a.IsResolved).OrderByDescending(a => a.CreatedAt).Take(50).ToListAsync();
        
        return Ok(alerts.Select(a => new {
            a.Id, DeviceCode = a.Device!.DeviceCode, a.AlertType, a.Severity, a.Message, a.CreatedAt
        }));
    }

    [HttpPost("{id}/resolve")]
    public async Task<IActionResult> ResolveAlert(long id)
    {
        var alert = await _db.Alerts.FindAsync(id);
        if (alert == null) return NotFound();

        alert.IsResolved = true;
        alert.ResolvedAt = DateTime.UtcNow;

        // --- ADD IMMUTABLE AUDIT LOG ---
        // Read the ID of the user who clicked the button from the JWT Token
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var audit = new AuditLog
        {
            UserId = userIdString != null ? Guid.Parse(userIdString) : null,
            Action = "RESOLVE_ALERT",
            EntityType = "Alert",
            EntityId = id.ToString()
        };
        _db.AuditLogs.Add(audit);

        await _db.SaveChangesAsync();
        return Ok(new { message = "Alert resolved and logged in audit trail." });
    }
}