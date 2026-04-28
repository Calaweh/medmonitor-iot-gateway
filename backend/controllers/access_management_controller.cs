using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
[RequirePermission("rbac:manage")] 
public class AccessManagementController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuditService _auditService;

    public AccessManagementController(AppDbContext db, AuditService auditService) 
    {
        _db = db;
        _auditService = auditService;
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions() => Ok(await _db.Permissions.ToListAsync());

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles() 
        => Ok(await _db.Roles.Include(r => r.Permissions).ToListAsync());

    [HttpPost("roles")]
    [RequirePermission("rbac:manage")]
    public async Task<IActionResult> CreateRole([FromBody] Role dto)
    {
        // 1. Validation
        if (await _db.Roles.AnyAsync(r => r.Name.ToLower() == dto.Name.ToLower()))
            return BadRequest(new { error = "A role with this name already exists." });

        // 2. Creation
        var role = new Role { 
            Id = Guid.NewGuid(),
            Name = dto.Name, 
            Description = dto.Description, 
            IsSystemRole = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Roles.Add(role);
        
        // 3. Audit Logging (Regulatory Requirement)
        var adminId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        await _auditService.LogActionAsync(adminId, "CREATE_ROLE", "Role", role.Id.ToString(), new { roleName = role.Name });

        await _db.SaveChangesAsync();
        return Ok(role);
    }

    [HttpPost("roles/{roleId}/permissions")]
    public async Task<IActionResult> AssignPermissionToRole(Guid roleId, [FromBody] Guid permissionId)
    {
        var role = await _db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == roleId);
        if (role == null) return NotFound("Role not found");
        if (role.IsSystemRole) return BadRequest("Cannot modify system roles");

        var permission = await _db.Permissions.FindAsync(permissionId);
        if (permission == null) return NotFound("Permission not found");

        // Check if role already has this permission
        if (role.Permissions.Any(p => p.Id == permissionId))
        {
            // Toggle: Remove if exists
            role.Permissions.Remove(permission);
        }
        else
        {
            // Toggle: Add if missing
            role.Permissions.Add(permission);
        }

        var adminId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        await _auditService.LogActionAsync(
            adminId, 
            "UPDATE_ROLE_PERMISSIONS", 
            "Role", 
            roleId.ToString(), 
            new { roleName = role.Name, permission = permission.Resource + ":" + permission.Action }
        );

        await _db.SaveChangesAsync();
        return Ok(new { message = "Permissions updated successfully" });
    }
}