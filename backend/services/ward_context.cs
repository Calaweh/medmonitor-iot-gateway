namespace MedicalDeviceMonitor.Services;

public static class WardContext
{
    private static readonly AsyncLocal<List<string>?> _allowedLocations = new();

    public static List<string>? AllowedLocations
    {
        get => _allowedLocations.Value;
        set => _allowedLocations.Value = value;
    }
}