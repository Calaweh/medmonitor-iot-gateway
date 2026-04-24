using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using MedicalDeviceMonitor.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Serilog;

namespace MedicalDeviceMonitor.Services;

public class IngestReadingDto
{
    public required string DeviceCode { get; set; }
    public DateTime RecordedAt { get; set; }
    public required JsonElement Payload { get; set; }
}

public class ReadingService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<VitalSignsHub> _hub;
    private readonly ILogger<ReadingService> _logger;

    public ReadingService(AppDbContext db, IHubContext<VitalSignsHub> hub, ILogger<ReadingService> logger)
    {
        _db = db;
        _hub = hub;
        _logger = logger;
    }

    public async Task ProcessNewReadingAsync(IngestReadingDto dto)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == dto.DeviceCode);
        if (device == null)
        {
            _logger.LogWarning("Abnormal Event: Received data for unknown device {DeviceCode}", dto.DeviceCode);
            throw new Exception($"Device {dto.DeviceCode} not found.");
        }

        // 1. Get the LAST reading before we save the new one (used for Rate of Change alerts)
        var lastReading = await _db.SensorReadings
            .Where(r => r.DeviceId == device.Id)
            .OrderByDescending(r => r.RecordedAt)
            .FirstOrDefaultAsync();

        // 2. Save new reading to PostgreSQL
        var reading = new SensorReading
        {
            DeviceId = device.Id,
            RecordedAt = dto.RecordedAt.ToUniversalTime(),
            Payload = JsonDocument.Parse(dto.Payload.GetRawText())
        };
        _db.SensorReadings.Add(reading);

        // 3. CLINICAL LOGIC & ALARM FATIGUE MANAGEMENT
        var activeAlertsToSave = new List<Alert>();
        
        // Fetch alerts triggered in the last 5 minutes for this device
        var recentAlertTypes = await _db.Alerts
            .Where(a => a.DeviceId == device.Id && a.CreatedAt >= DateTime.UtcNow.AddMinutes(-5))
            .Select(a => a.AlertType)
            .ToListAsync();

        // Rule A: Absolute Heart Rate
        if (dto.Payload.TryGetProperty("heart_rate", out var hr))
        {
            double currentHr = hr.GetDouble();
            if ((currentHr > 120 || currentHr < 40) && !recentAlertTypes.Contains("ABNORMAL_HEART_RATE"))
            {
                activeAlertsToSave.Add(CreateAlert(device.Id, reading, "ABNORMAL_HEART_RATE", "CRITICAL", $"Abnormal Heart Rate: {currentHr} bpm"));
            }

            // Rule B: Rate of Change (Spike/Drop > 20 BPM instantly)
            if (lastReading != null && lastReading.Payload.RootElement.TryGetProperty("heart_rate", out var lastHr))
            {
                if (Math.Abs(currentHr - lastHr.GetDouble()) >= 20 && !recentAlertTypes.Contains("SUDDEN_HR_CHANGE"))
                {
                    activeAlertsToSave.Add(CreateAlert(device.Id, reading, "SUDDEN_HR_CHANGE", "WARNING", $"Sudden HR change detected. Jumped by {Math.Abs(currentHr - lastHr.GetDouble())} bpm."));
                }
            }
        }

        // Rule C: SpO2 Drop
        if (dto.Payload.TryGetProperty("spo2", out var spo2))
        {
            double currentSpo2 = spo2.GetDouble();
            if (currentSpo2 < 90 && !recentAlertTypes.Contains("LOW_SPO2"))
            {
                activeAlertsToSave.Add(CreateAlert(device.Id, reading, "LOW_SPO2", "CRITICAL", $"Critical SpO2 Level: {currentSpo2}%"));
            }
        }

        // Add any newly triggered alerts to the database
        if (activeAlertsToSave.Any())
        {
            _db.Alerts.AddRange(activeAlertsToSave);
        }

        await _db.SaveChangesAsync();

        // 4. Broadcast to React Frontend via SignalR
        await _hub.Clients.All.SendAsync("ReceiveNewReading", new
        {
            reading.Id,
            reading.DeviceId,
            device.DeviceCode,
            reading.RecordedAt,
            Payload = dto.Payload
        });

        foreach (var alert in activeAlertsToSave)
        {
            _logger.LogWarning("Clinical Alert Triggered: {Type} for {Device}", alert.AlertType, device.DeviceCode);
            await _hub.Clients.All.SendAsync("ReceiveNewAlert", new
            {
                alert.Id,
                alert.DeviceId,
                DeviceCode = device.DeviceCode,
                alert.AlertType,
                alert.Severity,
                alert.Message,
                alert.CreatedAt
            });
        }
    }

    private Alert CreateAlert(Guid deviceId, SensorReading reading, string type, string severity, string message)
    {
        return new Alert
        {
            DeviceId = deviceId,
            Reading = reading,
            AlertType = type,
            Severity = severity,
            Message = message,
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<IEnumerable<object>> GetHistoryAsync(string deviceCode, int limit, DateTime? start, DateTime? end)
    {
        var query = _db.SensorReadings
            .Include(r => r.Device)
            .Where(r => r.Device!.DeviceCode == deviceCode);

        if (start.HasValue) query = query.Where(r => r.RecordedAt >= start.Value.ToUniversalTime());
        if (end.HasValue) query = query.Where(r => r.RecordedAt <= end.Value.ToUniversalTime());

        var rawData = await query
            .OrderByDescending(r => r.RecordedAt)
            .Take(limit)
            .ToListAsync();

        const int maxChartPoints = 100;
        if (rawData.Count > maxChartPoints)
        {
            int step = (int)Math.Ceiling(rawData.Count / (double)maxChartPoints);
            rawData = rawData.Where((x, index) => index % step == 0).ToList();
        }

        return rawData.Select(r => new {
            r.Id,
            r.DeviceId,
            DeviceCode = r.Device!.DeviceCode,
            r.RecordedAt,
            r.Payload
        });
    }
}