using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Hubs;
using MedicalDeviceMonitor.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Serilog;

namespace MedicalDeviceMonitor.Services;

// The DTO matching your Python script's JSON payload
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
        // 1. Find the device by code
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == dto.DeviceCode);
        
        if (device == null) {
            _logger.LogWarning("Abnormal Event: Received data for unknown device {DeviceCode}", dto.DeviceCode);
            throw new Exception($"Device {dto.DeviceCode} not found.");
        }

        Log.Information("Processing reading for {device}. HR: {HR}", dto.DeviceCode, dto.Payload.GetProperty("heart_rate"));

        // 2. Save to PostgreSQL
        var reading = new SensorReading
        {
            DeviceId = device.Id,
            RecordedAt = dto.RecordedAt.ToUniversalTime(), 
            Payload = JsonDocument.Parse(dto.Payload.GetRawText()) 
        };

        _db.SensorReadings.Add(reading);

        Alert? newAlert = null;
        if (dto.Payload.TryGetProperty("heart_rate", out var hr) && (hr.GetDouble() > 120 || hr.GetDouble() < 40))
        {
            _logger.LogWarning("Clinical Alert: Abnormal Heart Rate {HR} for {device}", hr.GetDouble(), dto.DeviceCode);
            
            newAlert = new Alert
            {
                DeviceId = device.Id,
                Reading = reading,
                AlertType = "ABNORMAL_HEART_RATE",
                Severity = "CRITICAL",
                Message = $"Abnormal Heart Rate: {hr.GetDouble()} bpm",
                CreatedAt = DateTime.UtcNow
            };
            _db.Alerts.Add(newAlert);
        }

        await _db.SaveChangesAsync();

        // 3. Broadcast to React Frontend via SignalR WebSocket
        await _hub.Clients.All.SendAsync("ReceiveNewReading", new 
        {
            reading.Id,
            reading.DeviceId,
            device.DeviceCode,
            reading.RecordedAt,
            Payload = dto.Payload // Send the raw JSON payload to React
        });

        if (newAlert != null)
        {
            await _hub.Clients.All.SendAsync("ReceiveNewAlert", new
            {
                newAlert.Id,
                newAlert.DeviceId,
                DeviceCode = device.DeviceCode,
                newAlert.AlertType,
                newAlert.Severity,
                newAlert.Message,
                newAlert.CreatedAt
            });
        }
    }

    public async Task<IEnumerable<object>> GetHistoryAsync(string deviceCode, int limit, DateTime? start, DateTime? end)
    {
        var query = _db.SensorReadings
            .Include(r => r.Device)
            .Where(r => r.Device.DeviceCode == deviceCode);

        // 1. Apply Date Filtering
        if (start.HasValue) query = query.Where(r => r.RecordedAt >= start.Value.ToUniversalTime());
        if (end.HasValue) query = query.Where(r => r.RecordedAt <= end.Value.ToUniversalTime());

        var rawData = await query
            .OrderByDescending(r => r.RecordedAt)
            .Take(limit)
            .ToListAsync();

        // 2. Server-Side Data Decimation (Nth-Point Downsampling)
        // If we retrieve too many points, downsample to prevent frontend chart lag
        const int maxChartPoints = 100;
        if (rawData.Count > maxChartPoints)
        {
            int step = (int)Math.Ceiling(rawData.Count / (double)maxChartPoints);
            rawData = rawData.Where((x, index) => index % step == 0).ToList();
            _logger.LogInformation("Decimated history for {DeviceCode} from {Raw} to {Decimated} points", 
                deviceCode, rawData.Count * step, rawData.Count);
        }

        return rawData.Select(r => new {
            r.Id,
            r.DeviceId,
            DeviceCode = r.Device.DeviceCode,
            r.RecordedAt,
            r.Payload
        });
    }
}