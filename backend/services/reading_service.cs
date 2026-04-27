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

    // Global defaults — applied when no per-patient threshold override exists
    private static readonly Dictionary<string, (double Min, double Max)> GlobalThresholds = new()
    {
        { "heart_rate", (40, 120) },
        { "spo2",       (90, 100) },
        { "temperature",(35, 39)  },
    };

    public ReadingService(AppDbContext db, IHubContext<VitalSignsHub> hub, ILogger<ReadingService> logger)
    {
        _db = db;
        _hub = hub;
        _logger = logger;
    }

    public async Task ProcessNewReadingAsync(IngestReadingDto dto, string apiKey)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == dto.DeviceCode);
        if (device == null)
        {
            _logger.LogWarning("Abnormal Event: Received data for unknown device {DeviceCode}", dto.DeviceCode);
            throw new Exception($"Device {dto.DeviceCode} not found.");
        }

        // --- ENHANCED DEVICE AUTHENTICATION (Sprint 5.2) ---
        // 1. Try mTLS (Hardware Certificate) first
        // Note: Nginx/Reverse Proxy extracts the thumbprint and passes it in a header
        var certThumbprint = apiKey; // In mTLS mode, we pass the thumbprint in this field for simplicity in the gateway
        
        bool isAuthenticated = false;

        if (!string.IsNullOrEmpty(device.CertificateThumbprint) && device.CertificateThumbprint == certThumbprint)
        {
            isAuthenticated = true; // Hardware-level trust
        }
        else if (!string.IsNullOrEmpty(device.ApiKeyHash) && BCrypt.Net.BCrypt.Verify(apiKey, device.ApiKeyHash))
        {
            isAuthenticated = true; // Legacy Key trust
        }

        if (!isAuthenticated)
        {
            throw new UnauthorizedAccessException($"Hardware/Key verification failed for device {dto.DeviceCode}");
        }
        
        // 1. Get last reading (for Rate-of-Change alerts)
        var lastReading = await _db.SensorReadings
            .Where(r => r.DeviceId == device.Id)
            .OrderByDescending(r => r.RecordedAt)
            .FirstOrDefaultAsync();

        // 2. Resolve current patient (for per-patient thresholds)
        var currentAssignment = await _db.BedAssignments
            .Where(b => b.DeviceId == device.Id && b.DischargedAt == null)
            .FirstOrDefaultAsync();

        // 3. Load per-patient threshold overrides
        Dictionary<string, (double? Min, double? Max)> patientThresholds = new();
        if (currentAssignment != null)
        {
            var thresholdRows = await _db.Set<PatientThreshold>()
                .Where(t => t.PatientId == currentAssignment.PatientId)
                .ToListAsync();
            foreach (var row in thresholdRows)
                patientThresholds[row.VitalSign] = (row.MinValue, row.MaxValue);
        }
        
        // 4. Save new reading
        var reading = new SensorReading
        {
            DeviceId = device.Id,
            RecordedAt = dto.RecordedAt.ToUniversalTime(),
            Payload = JsonDocument.Parse(dto.Payload.GetRawText())
        };
        _db.SensorReadings.Add(reading);
        
        // 5. CLINICAL LOGIC & ALARM FATIGUE MANAGEMENT
        var activeAlertsToSave = new List<Alert>();

        // Suppress duplicate alert types within a 5-minute window
        var recentAlertTypes = await _db.Alerts
            .Where(a => a.DeviceId == device.Id && a.CreatedAt >= DateTime.UtcNow.AddMinutes(-5))
            .Select(a => a.AlertType)
            .ToListAsync();

        // ── Rule A: Absolute Heart Rate ────────────────────────────────────
        if (dto.Payload.TryGetProperty("heart_rate", out var hr))
        {
            double currentHr = hr.GetDouble();
            var (hrMin, hrMax) = ResolveThreshold("heart_rate", patientThresholds);

            if ((currentHr > hrMax || currentHr < hrMin) && !recentAlertTypes.Contains("ABNORMAL_HEART_RATE"))
            {
                activeAlertsToSave.Add(CreateAlert(device.Id, reading, "ABNORMAL_HEART_RATE", "CRITICAL",
                    $"Abnormal Heart Rate: {currentHr} bpm (threshold: {hrMin}–{hrMax})"));
            }

            // ── Rule B: Rate of Change ────────────────────────────────────
            if (lastReading != null && lastReading.Payload.RootElement.TryGetProperty("heart_rate", out var lastHr))
            {
                double delta = Math.Abs(currentHr - lastHr.GetDouble());
                if (delta >= 20 && !recentAlertTypes.Contains("SUDDEN_HR_CHANGE"))
                {
                    activeAlertsToSave.Add(CreateAlert(device.Id, reading, "SUDDEN_HR_CHANGE", "WARNING",
                        $"Sudden HR change detected: Δ{delta:F0} bpm between consecutive readings."));
                }
            }
        }

        // ── Rule C: SpO2 ──────────────────────────────────────────────────
        if (dto.Payload.TryGetProperty("spo2", out var spo2))
        {
            double currentSpo2 = spo2.GetDouble();
            var (spo2Min, _) = ResolveThreshold("spo2", patientThresholds);

            if (currentSpo2 < spo2Min && !recentAlertTypes.Contains("LOW_SPO2"))
            {
                activeAlertsToSave.Add(CreateAlert(device.Id, reading, "LOW_SPO2", "CRITICAL",
                    $"Critical SpO2 Level: {currentSpo2}% (threshold: ≥{spo2Min}%)"));
            }
        }

        // ── Rule D: Temperature ───────────────────────────────────────────
        if (dto.Payload.TryGetProperty("temperature", out var temp))
        {
            double currentTemp = temp.GetDouble();
            var (tempMin, tempMax) = ResolveThreshold("temperature", patientThresholds);

            if ((currentTemp > tempMax || currentTemp < tempMin) && !recentAlertTypes.Contains("ABNORMAL_TEMPERATURE"))
            {
                activeAlertsToSave.Add(CreateAlert(device.Id, reading, "ABNORMAL_TEMPERATURE", "WARNING",
                    $"Abnormal Temperature: {currentTemp}°C (threshold: {tempMin}–{tempMax}°C)"));
            }
        }

        // ── Rule E: MEWS Composite Score ──────────────────────────────────
        int mewsScore = CalculateMews(dto.Payload);
        if (mewsScore >= 4 && !recentAlertTypes.Contains("HIGH_MEWS_SCORE"))
        {
            activeAlertsToSave.Add(CreateAlert(device.Id, reading, "HIGH_MEWS_SCORE", "CRITICAL",
                $"Patient Deterioration Warning (MEWS = {mewsScore}). Immediate clinical review required."));
        }

        if (activeAlertsToSave.Any())
            _db.Alerts.AddRange(activeAlertsToSave);

        await _db.SaveChangesAsync();

        // 6. Broadcast via SignalR
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

    // ──────────────────────────────────────────────────────────────────────────
    // Resolve threshold: per-patient override takes priority; falls back to global
    // ──────────────────────────────────────────────────────────────────────────
    private static (double Min, double Max) ResolveThreshold(
        string key,
        Dictionary<string, (double? Min, double? Max)> patientOverrides)
    {
        var def = GlobalThresholds.TryGetValue(key, out var g) ? g : (Min: 0.0, Max: double.MaxValue);

        if (!patientOverrides.TryGetValue(key, out var p))
            return def;

        return (p.Min ?? def.Min, p.Max ?? def.Max);
    }

    private static Alert CreateAlert(Guid deviceId, SensorReading reading, string type, string severity, string message)
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
        if (end.HasValue)   query = query.Where(r => r.RecordedAt <= end.Value.ToUniversalTime());

        var rawData = await query
            .OrderByDescending(r => r.RecordedAt)
            .Take(limit)
            .ToListAsync();

        // Server-side decimation — keeps chart performant for long windows
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
            Payload = r.Payload
        });
    }

    private int CalculateMews(JsonElement payload)
    {
        int score = 0;

        // 1. Heart Rate (bpm)
        if (payload.TryGetProperty("heart_rate", out var hrProp) && hrProp.TryGetDouble(out var hr))
        {
            if (hr <= 40 || hr >= 130) score += 2;
            else if (hr <= 50 || (hr >= 111 && hr <= 129)) score += 1;
        }

        // 2. Respiratory Rate (respiration)
        if (payload.TryGetProperty("respiration", out var rrProp) && rrProp.TryGetDouble(out var rr))
        {
            if (rr < 9 || rr > 29) score += 2;
            else if (rr >= 21 && rr <= 29) score += 2; 
        }

        // 3. Systolic BP (systolic_bp)
        if (payload.TryGetProperty("systolic_bp", out var sbpProp) && sbpProp.TryGetDouble(out var sbp))
        {
            if (sbp <= 70) score += 3;
            else if (sbp <= 80) score += 2;
            else if (sbp <= 100) score += 1;
            else if (sbp >= 200) score += 2;
        }

        // 4. Temperature (temperature)
        if (payload.TryGetProperty("temperature", out var tProp) && tProp.TryGetDouble(out var temp))
        {
            if (temp < 35.0 || temp >= 38.5) score += 2;
        }

        return score;
    }
}