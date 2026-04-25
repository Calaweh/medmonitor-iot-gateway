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
        var now = DateTime.UtcNow;
        // Find meds scheduled in the past that are still 'scheduled' and not administered
        var overdueMeds = await _db.Set<MedicationSchedule>()
            .IgnoreQueryFilters() // System-level check
            .Where(m => m.Status == "scheduled" && m.ScheduledAt < now.AddMinutes(-30))
            .ToListAsync();

        foreach (var med in overdueMeds)
        {
            med.Status = "overdue";
            
            // Link to the device the patient is currently in (if any) to trigger a bed alert
            var currentBed = await _db.BedAssignments
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.PatientId == med.PatientId && b.DischargedAt == null);

            if (currentBed != null)
            {
                _db.Alerts.Add(new Alert {
                    DeviceId = currentBed.DeviceId,
                    AlertType = "MISSED_MEDICATION",
                    Severity = "WARNING",
                    Message = $"Overdue Medication: {med.MedicationName} ({med.Dosage}) was scheduled for {med.ScheduledAt:HH:mm}",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
    }
}