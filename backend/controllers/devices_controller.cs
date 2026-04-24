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

    public DevicesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetDevices()
    {
        var devices = await _db.Devices.ToListAsync();
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