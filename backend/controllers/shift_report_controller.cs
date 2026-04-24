using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ShiftReportController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ReadingService _readingService;
    private readonly ILogger<ShiftReportController> _logger;

    public ShiftReportController(AppDbContext db, ReadingService readingService, ILogger<ShiftReportController> logger)
    {
        _db = db;
        _readingService = readingService;
        _logger = logger;
    }

    /// <summary>
    /// Generate a PDF shift handover report for a given bed over the last N hours.
    /// GET /api/shiftreport/{deviceCode}?hours=8
    /// </summary>
    [HttpGet("{deviceCode}")]
    public async Task<IActionResult> GenerateShiftReport(
        string deviceCode,
        [FromQuery] int hours = 8)
    {
        var end = DateTime.UtcNow;
        var start = end.AddHours(-hours);

        // --- 1. Load Device & Current Patient ---
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceCode == deviceCode);
        if (device == null) return NotFound(new { error = $"Device '{deviceCode}' not found." });

        var assignment = await _db.BedAssignments
            .Include(b => b.Patient)
            .Where(b => b.DeviceId == device.Id && b.DischargedAt == null)
            .FirstOrDefaultAsync();

        // --- 2. Load Readings for the shift window ---
        var history = await _readingService.GetHistoryAsync(deviceCode, 10000, start, end);
        var readingsList = history.ToList();

        // --- 3. Load Alerts fired during the shift ---
        var alerts = await _db.Alerts
            .Where(a => a.DeviceId == device.Id
                     && a.CreatedAt >= start
                     && a.CreatedAt <= end)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync();

        // --- 4. Compute vital sign stats ---
        var stats = ComputeVitalStats(readingsList);

        // --- 5. Build PDF ---
        QuestPDF.Settings.License = LicenseType.Community;

        var patientName = assignment?.Patient?.FullName ?? "Unknown Patient";
        var patientMrn  = assignment?.Patient?.Mrn ?? "N/A";
        var diagnosis   = assignment?.Diagnosis ?? "Not recorded";
        var reportedBy  = User.FindFirst("FullName")?.Value ?? "Unknown Clinician";

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Helvetica"));

                page.Header().Element(ComposeHeader);
                page.Content().Element(content => ComposeContent(
                    content, deviceCode, patientName, patientMrn, diagnosis,
                    start, end, hours, reportedBy, stats, alerts));
                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Confidential — Clinical Use Only | Generated: ");
                    text.Span(DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm") + " UTC").Bold();
                    text.Span(" | Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        });

        var pdfBytes = pdf.GeneratePdf();
        var fileName = $"ShiftReport_{deviceCode}_{DateTime.UtcNow:yyyyMMdd_HHmm}.pdf";

        _logger.LogInformation("Shift report generated for {Device} by {User}", deviceCode, reportedBy);

        return File(pdfBytes, "application/pdf", fileName);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PDF Composition Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private static void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("MedMonitor Command Centre")
                    .FontSize(18).Bold().FontColor(Colors.Teal.Darken2);
                col.Item().Text("Clinical Shift Handover Report")
                    .FontSize(12).FontColor(Colors.Grey.Darken1);
            });
            row.ConstantItem(120).AlignRight().Column(col =>
            {
                col.Item().Text("SYNTHETIC DATA")
                    .FontSize(8).Bold().FontColor(Colors.Red.Medium)
                    .BackgroundColor(Colors.Red.Lighten4)
                    .Padding(3);
            });
        });

        container.PaddingTop(4).LineHorizontal(1).LineColor(Colors.Teal.Darken2);
    }

    private static void ComposeContent(
        IContainer container,
        string deviceCode,
        string patientName,
        string mrn,
        string diagnosis,
        DateTime start,
        DateTime end,
        int hours,
        string reportedBy,
        VitalStats stats,
        List<Models.Alert> alerts)
    {
        container.PaddingTop(12).Column(col =>
        {
            // ── Section 1: Patient & Shift Info ──────────────────────────────
            col.Item().Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Patient").Bold().FontColor(Colors.Grey.Darken2).FontSize(8);
                    c.Item().Text(patientName).FontSize(13).Bold();
                    c.Item().Text($"MRN: {mrn}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(4).Text($"Diagnosis: {diagnosis}").FontSize(9);
                });
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Bed / Device").Bold().FontColor(Colors.Grey.Darken2).FontSize(8);
                    c.Item().Text(deviceCode).FontSize(13).Bold();
                    c.Item().PaddingTop(4).Text($"Shift Window: {hours}h").FontSize(9);
                    c.Item().Text($"{start:yyyy-MM-dd HH:mm} → {end:HH:mm} UTC").FontSize(9).FontColor(Colors.Grey.Darken1);
                });
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Reported By").Bold().FontColor(Colors.Grey.Darken2).FontSize(8);
                    c.Item().Text(reportedBy).FontSize(13).Bold();
                    c.Item().PaddingTop(4).Text("IEC 62304 Class B").FontSize(9).FontColor(Colors.Orange.Darken2);
                    c.Item().Text("Monitoring Aid — Not Life Support").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });

            col.Item().PaddingTop(16).Text("Vital Signs Summary").FontSize(13).Bold();
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(8).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(2); // Vital Sign
                    cols.RelativeColumn();  // Min
                    cols.RelativeColumn();  // Max
                    cols.RelativeColumn();  // Avg
                    cols.RelativeColumn();  // Readings
                });

                // Header
                table.Header(header =>
                {
                    foreach (var h in new[] { "Vital Sign", "Min", "Max", "Mean", "Readings" })
                    {
                        header.Cell().Background(Colors.Teal.Darken2).Padding(6)
                            .Text(h).Bold().FontColor(Colors.White).FontSize(9);
                    }
                });

                // Rows
                foreach (var (label, key, unit) in VitalRows)
                {
                    var s = stats.GetOrDefault(key);
                    bool hasData = s != null;

                    table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5).Text(label);
                    table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
                        .Text(hasData ? $"{s!.Min:F1} {unit}" : "—").FontColor(Colors.Grey.Darken1);
                    table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
                        .Text(hasData ? $"{s!.Max:F1} {unit}" : "—").FontColor(Colors.Grey.Darken1);
                    table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
                        .Text(hasData ? $"{s!.Avg:F1} {unit}" : "—").FontColor(Colors.Grey.Darken1);
                    table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(5)
                        .Text(hasData ? s!.Count.ToString() : "0").FontColor(Colors.Grey.Darken1);
                }
            });

            // ── Section 3: Alerts ───────────────────────────────────────────
            col.Item().PaddingTop(20).Text("Alerts Fired This Shift").FontSize(13).Bold();
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

            if (!alerts.Any())
            {
                col.Item().PaddingTop(8).PaddingBottom(8)
                    .Background(Colors.Green.Lighten4).Padding(10)
                    .Text("✓ No alerts triggered during this shift window.")
                    .FontColor(Colors.Green.Darken3);
            }
            else
            {
                col.Item().PaddingTop(8).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn();     // Time
                        cols.RelativeColumn(2);    // Type
                        cols.RelativeColumn();     // Severity
                        cols.RelativeColumn(3);    // Message
                        cols.RelativeColumn();     // Resolved
                    });

                    table.Header(header =>
                    {
                        foreach (var h in new[] { "Time (UTC)", "Alert Type", "Severity", "Message", "Resolved" })
                        {
                            header.Cell().Background(Colors.Grey.Darken3).Padding(6)
                                .Text(h).Bold().FontColor(Colors.White).FontSize(9);
                        }
                    });

                    foreach (var alert in alerts)
                    {
                        var isCritical = alert.Severity == "CRITICAL";
                        var bg = isCritical ? Colors.Red.Lighten4 : Colors.Orange.Lighten4;

                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                            .Padding(5).Text(alert.CreatedAt.ToString("HH:mm:ss")).FontSize(9);
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                            .Padding(5).Text(alert.AlertType).FontSize(9);
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                            .Padding(5).Text(alert.Severity).Bold().FontSize(9)
                            .FontColor(isCritical ? Colors.Red.Darken3 : Colors.Orange.Darken3);
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                            .Padding(5).Text(alert.Message).FontSize(9);
                        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
                            .Padding(5)
                            .Text(alert.IsResolved ? alert.ResolvedAt?.ToString("HH:mm") ?? "Yes" : "Pending")
                            .FontSize(9)
                            .FontColor(alert.IsResolved ? Colors.Green.Darken2 : Colors.Red.Medium);
                    }
                });
            }

            // ── Section 4: Handover Notes ──────────────────────────────────
            col.Item().PaddingTop(20).Text("Handover Notes").FontSize(13).Bold();
            col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
            col.Item().PaddingTop(8).Border(0.5f).BorderColor(Colors.Grey.Lighten2)
                .Padding(12).MinHeight(80)
                .Text("[ Space reserved for handover notes — to be completed by outgoing nurse ]")
                .FontColor(Colors.Grey.Lighten1).Italic();

            // ── Section 5: Sign-Off ────────────────────────────────────────
            col.Item().PaddingTop(24).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Outgoing Nurse Signature").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Grey.Darken1);
                    c.Item().Text("Name / Date").FontSize(8).FontColor(Colors.Grey.Medium);
                });
                row.ConstantItem(40);
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Incoming Nurse Signature").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(20).LineHorizontal(0.5f).LineColor(Colors.Grey.Darken1);
                    c.Item().Text("Name / Date").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Stats Computation
    // ──────────────────────────────────────────────────────────────────────────

    private static readonly (string Label, string Key, string Unit)[] VitalRows =
    {
        ("Heart Rate",       "heart_rate",       "bpm"),
        ("SpO2",             "spo2",             "%"),
        ("Respiratory Rate", "respiration",      "br/min"),
        ("Systolic BP",      "systolic_bp",      "mmHg"),
        ("Diastolic BP",     "diastolic_bp",     "mmHg"),
        ("Temperature",      "temperature",      "°C"),
    };

    private static VitalStats ComputeVitalStats(IEnumerable<object> readings)
    {
        var stats = new VitalStats();
        foreach (var item in readings)
        {
            // Use reflection to get Payload property (it's an anonymous object)
            var payloadProp = item.GetType().GetProperty("Payload");
            if (payloadProp?.GetValue(item) is not System.Text.Json.JsonDocument doc) continue;

            foreach (var (_, key, _) in VitalRows)
            {
                if (doc.RootElement.TryGetProperty(key, out var val) && val.TryGetDouble(out var d))
                {
                    stats.Record(key, d);
                }
            }
        }
        return stats;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Stats helper classes
// ──────────────────────────────────────────────────────────────────────────────

public class VitalStat
{
    public double Min { get; private set; } = double.MaxValue;
    public double Max { get; private set; } = double.MinValue;
    public double Sum { get; private set; }
    public int Count { get; private set; }
    public double Avg => Count > 0 ? Sum / Count : 0;

    public void Record(double v)
    {
        if (v < Min) Min = v;
        if (v > Max) Max = v;
        Sum += v;
        Count++;
    }
}

public class VitalStats : Dictionary<string, VitalStat>
{
    public void Record(string key, double value)
    {
        if (!ContainsKey(key)) this[key] = new VitalStat();
        this[key].Record(value);
    }

    public VitalStat? GetOrDefault(string key) => TryGetValue(key, out var s) ? s : null;
}