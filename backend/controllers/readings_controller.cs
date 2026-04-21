using MedicalDeviceMonitor.Services;
using Microsoft.AspNetCore.Mvc;

namespace MedicalDeviceMonitor.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReadingsController : ControllerBase
{
    private readonly ReadingService _readingService;

    public ReadingsController(ReadingService readingService)
    {
        _readingService = readingService;
    }

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
            return BadRequest(new { error = ex.Message });
        }
    }
}