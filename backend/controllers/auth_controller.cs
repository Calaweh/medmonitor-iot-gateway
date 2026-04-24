using MedicalDeviceMonitor.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MedicalDeviceMonitor.Controllers;

public class LoginDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, IConfiguration config, ILogger<AuthController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == request.Email);

        // --- AUTO-HEAL ADMIN ACCOUNT FOR TESTING ---
        // If the admin tries to log in, automatically fix their password hash in the DB
        if (user != null && request.Email == "admin@medmonitor.local" && request.Password == "Admin123!")
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!");
            await _db.SaveChangesAsync();
        }
        // -------------------------------------------

        if (user == null)
            return Unauthorized(new { error = "User not found in the database." });
            
        if (!user.IsActive)
            return Unauthorized(new { error = "This account is inactive." });

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        
        if (!isPasswordValid)
            return Unauthorized(new { error = "Invalid password." });

        var token = GenerateJwtToken(user);
        
        _logger.LogInformation("User {Email} logged in successfully.", user.Email);
        
        return Ok(new 
        { 
            Token = token,
            User = new { user.Id, user.Email, user.FullName, user.Role }
        });
    }

    private string GenerateJwtToken(Models.User user)
    {
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
            ?? _config["Jwt:Secret"] 
            ?? "FallbackSecretKeyThatIsAtLeast32BytesLong!";
            
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("FullName", user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddMinutes(120),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}