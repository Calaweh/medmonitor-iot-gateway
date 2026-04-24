using MedicalDeviceMonitor.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MedicalDeviceMonitor.Services;

public class RetentionService
{
    private readonly AppDbContext _db;
    private readonly ILogger<RetentionService> _logger;

    public RetentionService(AppDbContext db, ILogger<RetentionService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task PurgeOldReadingsAsync()
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var deleted = await _db.Database.ExecuteSqlRawAsync(
            "DELETE FROM sensor_readings WHERE recorded_at < {0}", cutoff);
        _logger.LogInformation("Retention job: purged {Count} sensor readings older than {Cutoff}", deleted, cutoff);
    }
}