using MedicalDeviceMonitor.Models;

namespace MedicalDeviceMonitor.Services;

public class UserAccessContext
{
    public bool IsAdmin { get; set; }
    public Guid UserId { get; set; }
}

public static class SecurityContext
{
    // AsyncLocal flows safely through asynchronous tasks but is bound to the current request thread
    private static readonly AsyncLocal<UserAccessContext?> _context = new();
    
    public static UserAccessContext? Current
    {
        get => _context.Value;
        set => _context.Value = value;
    }
}