using Hangfire.Dashboard;
using System.Security.Claims;

namespace MedicalDeviceMonitor.Authorization;

public class HangfireAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Allow all in development for easier debugging, or enforce admin role
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            return httpContext.User.IsInRole("admin");
        }

        return false;
    }
}
