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
        
        await _db.Database.OpenConnectionAsync();
        try
        {
            // Grant background job bypass rights for RLS
            await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', 'system', false)");

            int totalDeleted = 0;
            int batchDeleted;
            do {
                // Batching prevents long-held locks on sensor_readings
                batchDeleted = await _db.Database.ExecuteSqlRawAsync(
                    @"DELETE FROM sensor_readings 
                      WHERE id IN (SELECT id FROM sensor_readings WHERE recorded_at < {0} LIMIT 5000)", cutoff);
                totalDeleted += batchDeleted;
            } while (batchDeleted > 0);
                
            _logger.LogInformation("Purged {Total} old readings in batches.", totalDeleted);
        }
        finally
        {
            // Clean up pool
            await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', '', false)");
            await _db.Database.CloseConnectionAsync();
        }
    }
}