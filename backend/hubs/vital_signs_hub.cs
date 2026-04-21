using Microsoft.AspNetCore.SignalR;

namespace MedicalDeviceMonitor.Hubs;

public class VitalSignsHub : Hub
{
    // React clients will connect here. 
    // We don't need methods here yet, because the backend API 
    // will push data directly to clients when it receives a POST.
    
    public override async Task OnConnectedAsync()
    {
        Console.WriteLine($"Client connected to SignalR: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }
}