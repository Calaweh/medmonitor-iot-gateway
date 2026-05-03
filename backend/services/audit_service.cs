// backend/services/audit_service.cs
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
    private const long AuditChainLockId = 0x4D45444D4F4E; // "MEDMON"
    private readonly string _hmacKey;
    private readonly ILogger<AuditService> _logger;

    public AuditService(AppDbContext db, IConfiguration config, ILogger<AuditService> logger)
    {
        _db = db;
        _logger = logger;
        // P0: Throw on missing secret to prevent silent security degradation
        _hmacKey = Environment.GetEnvironmentVariable("AUDIT_HMAC_SECRET") 
            ?? config["Audit:HmacSecret"] 
            ?? throw new InvalidOperationException("CRITICAL: AUDIT_HMAC_SECRET is not configured.");
    }

    public async Task LogActionAsync(Guid? userId, string action, string entityType, string entityId, object? detail = null)
    {
        var existingTransaction = _db.Database.CurrentTransaction;

        if (existingTransaction != null)
        {
            // Participate in ambient transaction
            await ExecuteAuditLogicAsync(userId, action, entityType, entityId, detail);
        }
        else
        {
            // Start a new execution strategy and transaction
            var strategy = _db.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    await ExecuteAuditLogicAsync(userId, action, entityType, entityId, detail);
                    await transaction.CommitAsync();
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to commit audit transaction for action {Action}", action);
                    throw;
                }
            });
        }
    }

    private async Task ExecuteAuditLogicAsync(Guid? userId, string action, string entityType, string entityId, object? detail)
    {
        // Use named advisory lock instead of table lock
        await _db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock({0});", AuditChainLockId);

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