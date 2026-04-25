using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Models;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Services;

public class AuditService
{
    private readonly AppDbContext _db;
    private readonly string _hmacKey;
    private readonly ILogger<AuditService> _logger;

    public AuditService(AppDbContext db, IConfiguration config, ILogger<AuditService> logger)
    {
        _db = db;
        _logger = logger;
        _hmacKey = Environment.GetEnvironmentVariable("AUDIT_HMAC_SECRET") 
            ?? config["Audit:HmacSecret"] 
            ?? "FallbackAuditSecretKey123!@#";
    }

    public async Task LogActionAsync(Guid? userId, string action, string entityType, string entityId, object? detail = null)
    {
        // Lock table to prevent race conditions during hash chain calculation
        await _db.Database.ExecuteSqlRawAsync("LOCK TABLE audit_log IN EXCLUSIVE MODE;");

        var lastLog = await _db.AuditLogs
            .OrderByDescending(a => a.Id)
            .FirstOrDefaultAsync();

        string? previousHash = lastLog?.Hash;

        var auditLog = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Detail = detail != null ? JsonSerializer.Serialize(detail) : null,
            OccurredAt = DateTime.UtcNow,
            PreviousHash = previousHash
        };

        auditLog.Hash = CalculateHash(auditLog);

        _db.AuditLogs.Add(auditLog);
        await _db.SaveChangesAsync();
        
        _logger.LogInformation("Audit log entry created for {Action} on {EntityType} {EntityId}", action, entityType, entityId);
    }

    private string CalculateHash(AuditLog log)
    {
        var timeStr = log.OccurredAt.ToString("yyyy-MM-dd HH:mm:ss.fff");
        
        // Ensure Detail is treated consistently (null vs empty string)
        string detailStr = string.IsNullOrEmpty(log.Detail) ? "NULL" : log.Detail;

        var rawData = $"{log.UserId?.ToString() ?? "NULL"}|{log.Action}|{log.EntityType}|{log.EntityId}|{detailStr}|{timeStr}|{log.PreviousHash ?? "NULL"}";
        
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_hmacKey));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawData));
        return Convert.ToHexString(hashBytes).ToLower();
    }

    public async Task<bool> VerifyChainAsync()
    {
        // .AsNoTracking() forces EF Core to read fresh data from Postgres 
        // bypassing the internal memory cache.
        var logs = await _db.AuditLogs
            .AsNoTracking()
            .OrderBy(a => a.Id)
            .ToListAsync();

        if (!logs.Any()) return true; // Empty is technically "intact"

        string? expectedPrev = null;
        foreach (var log in logs)
        {
            if (log.PreviousHash != expectedPrev) 
            {
                _logger.LogWarning("Audit chain broken at ID {Id}: PreviousHash mismatch", log.Id);
                return false;
            }
            
            var recalculated = CalculateHash(log);
            if (log.Hash != recalculated) 
            {
                _logger.LogWarning("Audit chain broken at ID {Id}: Hash mismatch", log.Id);
                return false;
            }

            expectedPrev = log.Hash;
        }

        return true;
    }
}