using MedicalDeviceMonitor.Data;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Services;

public class AlertEscalationService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AlertEscalationService> _logger;

    public AlertEscalationService(AppDbContext db, ILogger<AlertEscalationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task EscalateAlertsAsync()
    {
        await _db.Database.OpenConnectionAsync();
        try 
        {
            // 1. Elevate permissions to bypass RLS for this system job
            await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', 'system', false)");

            var now = DateTime.UtcNow;
            var escalationThreshold = now.AddMinutes(-15);

            // 2. Perform ATOMIC UPDATE (Best for high-concurrency environments)
            // This executes a single SQL "UPDATE" command. No entities are loaded into memory,
            // which completely eliminates the DbUpdateConcurrencyException.
            int updatedCount = await _db.Alerts
                .Where(a => !a.IsResolved && a.Severity == "WARNING" && a.CreatedAt < escalationThreshold)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(a => a.Severity, "CRITICAL")
                    // Note: In some Postgres versions, string concatenation in SetProperty 
                    // might need a specific syntax, but EF8 handles this well:
                    .SetProperty(a => a.Message, a => "[ESCALATED] " + a.Message)
                );

            if (updatedCount > 0)
            {
                _logger.LogInformation("Successfully escalated {Count} unresolved alerts to CRITICAL.", updatedCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during alert escalation background job.");
            throw; // Re-throw so Hangfire knows the job failed and can retry
        }
        finally 
        {
            // 3. Reset role and close connection
            await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', '', false)");
            await _db.Database.CloseConnectionAsync();
        }
    }
}