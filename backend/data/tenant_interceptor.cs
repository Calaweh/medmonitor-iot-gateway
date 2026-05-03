using System.Data.Common;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace MedicalDeviceMonitor.Data;

public class TenantInterceptor : DbCommandInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private void SetSessionVariables(DbCommand command)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        
        // Extract claims
        var userId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "";
        var userRole = user?.FindFirst(ClaimTypes.Role)?.Value ?? "guest";
        var deptId = user?.FindFirst("DepartmentId")?.Value ?? "";

        // If it's an Ingest request from the simulator, we might need a system role
        var path = _httpContextAccessor.HttpContext?.Request.Path.Value ?? "";
        if (string.IsNullOrEmpty(userId) && path.Contains("/api/readings/ingest"))
        {
            userRole = "system";
        }

        // PREVENT POOL POISONING:
        // Use 'SET LOCAL' so the variables are automatically wiped when the transaction ends.
        // These values are derived from validated JWT claims, making string interpolation safe here.
        var sqlSetup = $@"
            SET LOCAL app.current_user_id = '{userId.Replace("'", "''")}';
            SET LOCAL app.user_role = '{userRole.Replace("'", "''")}';
            SET LOCAL app.user_dept_id = '{deptId.Replace("'", "''")}';
        ";

        command.CommandText = sqlSetup + command.CommandText;
    }

    // Wrap both Sync and Async methods
    public override InterceptionResult<DbDataReader> ReaderExecuting(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
    {
        SetSessionVariables(command);
        return base.ReaderExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        SetSessionVariables(command);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> NonQueryExecuting(DbCommand command, CommandEventData eventData, InterceptionResult<int> result)
    {
        SetSessionVariables(command);
        return base.NonQueryExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command, CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        SetSessionVariables(command);
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }
}