using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

using Microsoft.AspNetCore.SignalR;
using MedicalDeviceMonitor.Hubs;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuditService _auditService;
    private readonly IHubContext<VitalSignsHub> _hubContext;

    public AlertsController(AppDbContext db, AuditService auditService, IHubContext<VitalSignsHub> hubContext)
    {
        _db = db;
        _auditService = auditService;
        _hubContext = hubContext;
    }

    [HttpGet]
    [RequirePermission("alerts:view")]
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
            a.Id, DeviceCode = a.Device!.DeviceCode, a.AlertType, a.Severity, a.Message, a.CreatedAt, a.AcknowledgedAt
        }));
    }

    [HttpPost("{id}/acknowledge")]
    [RequirePermission("alerts:resolve")] // Reuse resolve permission for now or add alerts:acknowledge
    public async Task<IActionResult> AcknowledgeAlert(long id)
    {
        var alert = await _db.Alerts.FirstOrDefaultAsync(a => a.Id == id);
        if (alert == null) return NotFound();

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        alert.AcknowledgedAt = DateTime.UtcNow;
        alert.AcknowledgedBy = userIdString != null ? Guid.Parse(userIdString) : (Guid?)null;

        await _db.SaveChangesAsync();
        await _hubContext.Clients.All.SendAsync("AlertAcknowledged", new { id = alert.Id, acknowledgedAt = alert.AcknowledgedAt });
        return Ok(new { message = "Alert acknowledged." });
    }

    [HttpPost("{id}/resolve")]
    [RequirePermission("alerts:resolve")] 
    public async Task<IActionResult> ResolveAlert(long id)
    {
        var strategy = _db.Database.CreateExecutionStrategy();

        // Added <IActionResult> here to tell the compiler what the lambda returns
        return await strategy.ExecuteAsync<IActionResult>(async () => 
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var alert = await _db.Alerts
                    .Include(a => a.Device)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (alert == null) 
                {
                    // No need to commit if not found
                    return NotFound(); 
                }

                var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                alert.IsResolved = true;
                alert.ResolvedAt = DateTime.UtcNow;

                var userId = userIdString != null ? Guid.Parse(userIdString) : (Guid?)null;

                await _db.SaveChangesAsync(); 
                await _auditService.LogActionAsync(userId, "RESOLVE_ALERT", "Alert", id.ToString()); 
                
                await _hubContext.Clients.All.SendAsync("AlertResolved", id);

                await transaction.CommitAsync();
                return Ok(new { message = "Alert resolved and securely logged in audit trail." });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw; 
            }
        });
    }
}