// backend/Authorization/RequirePermissionAttribute.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace MedicalDeviceMonitor.Authorization;

public class RequirePermissionAttribute : TypeFilterAttribute
{
    public RequirePermissionAttribute(string permission) : base(typeof(RequirePermissionFilter))
    {
        Arguments = new object[] { permission };
    }
}

public class RequirePermissionFilter : IAsyncAuthorizationFilter
{
    private readonly string _permission;

    public RequirePermissionFilter(string permission)
    {
        _permission = permission;
    }

    public Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Check if the JWT contains the specific atomic permission
        var hasPermission = context.HttpContext.User.HasClaim(c => 
            c.Type == "Permission" && c.Value == _permission);

        if (!hasPermission)
        {
            context.Result = new ForbidResult(); // Return HTTP 403
        }

        return Task.CompletedTask;
    }
}