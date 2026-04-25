using MedicalDeviceMonitor.Models;

namespace MedicalDeviceMonitor.Services;

// This will now be registered as a Scoped service (one per HTTP request)
public class UserAccessContext
{
    public bool IsAuthenticated { get; set; }
    public bool IsAdmin { get; set; }
    public Guid UserId { get; set; }
}