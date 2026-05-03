using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Services;

public class MedicationService
{
    private readonly AppDbContext _db;
    private readonly ILogger<MedicationService> _logger;

    public MedicationService(AppDbContext db, ILogger<MedicationService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task CheckOverdueMedicationsAsync()
    {
        await _db.Database.OpenConnectionAsync();
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', 'system', false)");

            var now = DateTime.UtcNow;
            // Fix N+1: Join BedAssignments directly in the initial query
            var overdueData = await (from med in _db.Set<MedicationSchedule>()
                                     join bed in _db.BedAssignments on med.PatientId equals bed.PatientId
                                     where med.Status == "scheduled" 
                                        && med.ScheduledAt < now.AddMinutes(-30)
                                        && bed.DischargedAt == null
                                     select new { med, bed.DeviceId }).ToListAsync();

            foreach (var item in overdueData) {
                item.med.Status = "overdue";
                _db.Alerts.Add(new Alert {
                    DeviceId = item.DeviceId,
                    AlertType = "MISSED_MEDICATION",
                    Severity = "WARNING",
                    Message = $"Overdue: {item.med.MedicationName} was scheduled for {item.med.ScheduledAt:HH:mm}",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
        }
        finally
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT set_config('app.user_role', '', false)");
            await _db.Database.CloseConnectionAsync();
        }
    }
}