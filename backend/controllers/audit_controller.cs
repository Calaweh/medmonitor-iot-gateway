using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Authorization;
using MedicalDeviceMonitor.Data; 
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq; 

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly AuditService _auditService;
    private readonly AppDbContext _db; // ADDED

    // UPDATE CONSTRUCTOR
    public AuditController(AuditService auditService, AppDbContext db)
    {
        _auditService = auditService;
        _db = db;
    }

    // ADD THIS NEW ENDPOINT
    [HttpGet]
    [RequirePermission("audit:view")]
    public async Task<IActionResult> GetLogs([FromQuery] int limit = 50)
    {
        var logs = await _db.AuditLogs
            .OrderByDescending(a => a.Id)
            .Take(limit)
            .Select(a => new {
                a.Id,
                a.UserId,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.OccurredAt,
                a.Hash
            })
            .ToListAsync();
            
        return Ok(logs);
    }

    [HttpGet("verify")]
    [RequirePermission("audit:view")]
    public async Task<IActionResult> VerifyAuditChain()
    {
        bool isValid = await _auditService.VerifyChainAsync();
        return Ok(new 
        { 
            isValid, 
            message = isValid ? "Audit chain is intact and verified." : "ALERT: Audit chain integrity compromised!" 
        });
    }
}