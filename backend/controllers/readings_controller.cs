using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReadingsController : ControllerBase
{
    private readonly ReadingService _readingService;
    private readonly AppDbContext _db;
    private readonly ILogger<ReadingsController> _logger;

    public ReadingsController(ReadingService readingService, AppDbContext db, ILogger<ReadingsController> logger)
    {
        _readingService = readingService;
        _db = db;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("ingest")]
    public async Task<IActionResult> IngestData([FromBody] IngestReadingDto dto)
    {
        try
        {
            await _readingService.ProcessNewReadingAsync(dto);
            return Ok(new { message = "Data ingested and broadcasted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "API Error ingesting data for device {DeviceCode}", dto.DeviceCode);
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{deviceCode}/history")]
    public async Task<IActionResult> GetHistory(
        string deviceCode, 
        [FromQuery] int limit = 1000, 
        [FromQuery] DateTime? start = null, 
        [FromQuery] DateTime? end = null)
    {
        try
        {
            var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
            if (device == null)
                return NotFound();
            
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var allowedLocations = await _db.WardAssignments
                .Where(w => w.UserId == Guid.Parse(userId))
                .Select(w => w.Location)
                .Distinct()
                .ToListAsync();
            
            if (allowedLocations.Any() && !allowedLocations.Contains(device.Location))
                return Forbid();

            var history = await _readingService.GetHistoryAsync(deviceCode, limit, start, end);
            return Ok(history.Reverse()); // Return chronologically for charts
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}