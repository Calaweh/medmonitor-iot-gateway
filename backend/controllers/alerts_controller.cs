using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
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
    private readonly AuditService _auditService;
    public AlertsController(AppDbContext db, AuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveAlerts([FromQuery] string? deviceCode)
    {
        var query = _db.Alerts.Include(a => a.Device).AsQueryable();
        if (!string.IsNullOrEmpty(deviceCode))
        {
            var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
            if (device == null)
                return NotFound();
            
            // Thanks to Global Query Filters, if the device exists but isn't in an allowed location, 
            // the above device lookup returns null (404). No manual check required.
            query = query.Where(a => a.Device!.DeviceCode == deviceCode);
        }

        var alerts = await query.Where(a => !a.IsResolved).OrderByDescending(a => a.CreatedAt).Take(50).ToListAsync();
        
        return Ok(alerts.Select(a => new {
            a.Id, DeviceCode = a.Device!.DeviceCode, a.AlertType, a.Severity, a.Message, a.CreatedAt
        }));
    }

    [HttpPost("{id}/resolve")]
    public async Task<IActionResult> ResolveAlert(long id)
    {
        var alert = await _db.Alerts
            .Include(a => a.Device)
            .FirstOrDefaultAsync(a => a.Id == id);
            
        if (alert == null) return NotFound();

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        alert.IsResolved = true;
        alert.ResolvedAt = DateTime.UtcNow;

        var userId = userIdString != null ? Guid.Parse(userIdString) : (Guid?)null;

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            await _db.SaveChangesAsync(); // Saves the alert state
            await _auditService.LogActionAsync(userId, "RESOLVE_ALERT", "Alert", id.ToString()); // Creates secure log
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        return Ok(new { message = "Alert resolved and securely logged in audit trail." });
    }
}