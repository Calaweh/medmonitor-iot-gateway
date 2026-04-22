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

        Log.Information("Processing reading for {DeviceCode}. HR: {HR}", dto.DeviceCode, dto.Payload.GetProperty("heart_rate"));

        // 2. Save to PostgreSQL
        var reading = new SensorReading
        {
            DeviceId = device.Id,
            RecordedAt = dto.RecordedAt.ToUniversalTime(), 
            Payload = JsonDocument.Parse(dto.Payload.GetRawText()) 
        };

        _db.SensorReadings.Add(reading);

        if (dto.Payload.TryGetProperty("heart_rate", out var hr) && (hr.GetDouble() > 120 || hr.GetDouble() < 40))
        {
            _logger.LogWarning("Clinical Alert: Abnormal Heart Rate {HR} for {Device}", hr.GetDouble(), dto.DeviceCode);
            // In a real app, you'd save to an 'alerts' table here as per schema.sql
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
    }

    public async Task<IEnumerable<object>> GetHistoryAsync(string deviceCode, int limit)
    {
        return await _db.SensorReadings
            .Include(r => r.Device)
            .Where(r => r.Device.DeviceCode == deviceCode)
            .OrderByDescending(r => r.RecordedAt)
            .Take(limit)
            .Select(r => new {
                r.Id,
                r.DeviceId,
                DeviceCode = r.Device.DeviceCode,
                r.RecordedAt,
                r.Payload
            })
            .ToListAsync();
    }
}