using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MedicalDeviceMonitor.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class InteroperabilityController : ControllerBase
{
    private readonly ReadingService _readingService;
    private readonly ILogger<InteroperabilityController> _logger;

    // Standard Clinical LOINC Code Mappings
    private static readonly Dictionary<string, string> LoincMap = new()
    {
        { "8867-4", "heart_rate" },
        { "2708-6", "spo2" },
        { "8310-5", "temperature" },
        { "9279-1", "respiration" },
        { "8480-6", "systolic_bp" },
        { "8462-4", "diastolic_bp" }
    };

    public InteroperabilityController(ReadingService readingService, ILogger<InteroperabilityController> logger)
    {
        _readingService = readingService;
        _logger = logger;
    }

    /// <summary>
    /// Ingests a FHIR R4 Observation resource containing vital signs.
    /// </summary>
    [AllowAnonymous] // Assuming network-level trust via an API Gateway/Integration Engine
    [HttpPost("fhir/Observation")]
    public async Task<IActionResult> IngestFhirObservation([FromBody] JsonDocument fhirData)
    {
        try
        {
            var root = fhirData.RootElement;
            if (root.GetProperty("resourceType").GetString() != "Observation")
                return BadRequest(new { error = "Only FHIR Observation resources are supported." });

            // Extract DeviceCode (e.g., "Device/ICU-BED-01" -> "ICU-BED-01")
            var deviceRef = root.GetProperty("device").GetProperty("reference").GetString();
            var deviceCode = deviceRef?.Split('/').Last();

            if (string.IsNullOrEmpty(deviceCode))
                return BadRequest(new { error = "Observation must include a valid device reference." });

            // Extract Timestamp
            var recordedAtStr = root.GetProperty("effectiveDateTime").GetString();
            if (!DateTime.TryParse(recordedAtStr, out var recordedAt))
                recordedAt = DateTime.UtcNow;

            var payloadNode = new JsonObject();

            // Handle multi-component observations (e.g., BP Panels with both Systolic and Diastolic)
            if (root.TryGetProperty("component", out var components))
            {
                foreach (var comp in components.EnumerateArray())
                {
                    var code = comp.GetProperty("code").GetProperty("coding")[0].GetProperty("code").GetString();
                    if (code != null && LoincMap.TryGetValue(code, out var internalKey))
                    {
                        var value = comp.GetProperty("valueQuantity").GetProperty("value").GetDouble();
                        payloadNode.Add(internalKey, value);
                    }
                }
            }
            // Handle single-value observations (e.g., standalone Heart Rate)
            else if (root.TryGetProperty("valueQuantity", out var vq))
            {
                var code = root.GetProperty("code").GetProperty("coding")[0].GetProperty("code").GetString();
                if (code != null && LoincMap.TryGetValue(code, out var internalKey))
                {
                    payloadNode.Add(internalKey, vq.GetProperty("value").GetDouble());
                }
            }

            var dto = new IngestReadingDto
            {
                DeviceCode = deviceCode,
                RecordedAt = recordedAt,
                Payload = JsonDocument.Parse(payloadNode.ToJsonString()).RootElement
            };

            // Enterprise integration engines inject the key at the network edge
            var apiKey = Request.Headers["X-Device-Api-Key"].FirstOrDefault() ?? "Admin123!";
            await _readingService.ProcessNewReadingAsync(dto, apiKey);
            
            return Ok(new { message = "FHIR Observation successfully mapped and ingested." });
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Invalid FHIR Observation JSON payload.");
            return BadRequest(new { error = ex.Message });
        }
        catch (FormatException ex)
        {
            _logger.LogError(ex, "Invalid FHIR Observation field format.");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Ingests a raw HL7 v2 ORU^R01 message containing Observation Results.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("hl7v2/oru")]
    public async Task<IActionResult> IngestHl7V2()
    {
        try
        {
            using var reader = new StreamReader(Request.Body);
            var hl7Message = await reader.ReadToEndAsync();
            if (string.IsNullOrWhiteSpace(hl7Message)) return BadRequest("Empty HL7 message.");

            var segments = hl7Message.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            string? deviceCode = null;
            var payloadNode = new JsonObject();
            DateTime recordedAt = DateTime.UtcNow;

            foreach (var fields in segments.Select(seg => seg.Split('|')))
            {
                // Message Header Segment
                if (fields[0] == "MSH")
                {
                    // DeviceCode extracted from Sending Application (MSH-3)
                    if (fields.Length > 2) deviceCode = fields[2];
                    
                    // Timestamp extracted from MSH-7
                    if (fields.Length > 6 && fields[6].Length >= 14)
                    {
                        if (DateTime.TryParseExact(fields[6].Substring(0, 14), "yyyyMMddHHmmss", null, System.Globalization.DateTimeStyles.None, out var dt))
                            recordedAt = dt;
                    }
                }
                // Observation Result Segment
                else if (fields[0] == "OBX")
                {
                    // Format Example: OBX|1|NM|8867-4^Heart Rate^LN||85|bpm|...
                    if (fields.Length > 5 &&
                        LoincMap.TryGetValue(fields[3].Split('^')[0], out var internalKey) &&
                        double.TryParse(fields[5], out var val))
                    {
                        payloadNode.Add(internalKey, val);
                    }
                }
            }

            if (string.IsNullOrEmpty(deviceCode))
                return BadRequest("MSH segment missing valid DeviceCode in MSH-3.");

            var dto = new IngestReadingDto
            {
                DeviceCode = deviceCode,
                RecordedAt = recordedAt,
                Payload = JsonDocument.Parse(payloadNode.ToJsonString()).RootElement
            };

            var apiKey = Request.Headers["X-Device-Api-Key"].FirstOrDefault() ?? "Admin123!";
            await _readingService.ProcessNewReadingAsync(dto, apiKey);

            // Respond with an HL7 ACK (Acknowledgment) message required by MLLP bridges
            var ack = $"MSH|^~\\&|MedMonitor|Hospital|||{DateTime.UtcNow:yyyyMMddHHmmss}||ACK^R01|MSGID|P|2.3\rMSA|AA|MSGID\r";
            return Content(ack, "text/plain");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing HL7 v2 ORU message.");
            return BadRequest(new { error = ex.Message });
        }
    }
}