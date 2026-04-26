using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly AuditService _auditService;

    public AuditController(AuditService auditService)
    {
        _auditService = auditService;
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