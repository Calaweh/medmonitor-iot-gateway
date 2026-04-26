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
        if (user?.Identity?.IsAuthenticated == true)
        {
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = user.FindFirst(ClaimTypes.Role)?.Value;
            var deptId = user.FindFirst("DepartmentId")?.Value;

            // Prepend the session variable setup to the actual SQL command.
            // Using Port 6543 requires re-setting these variables for every transaction.
            command.CommandText = 
                $"SELECT set_config('app.current_user_id', '{userId}', false); " +
                $"SELECT set_config('app.user_role', '{userRole}', false); " +
                $"SELECT set_config('app.user_dept_id', '{deptId}', false); " +
                command.CommandText;
        }
    }

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