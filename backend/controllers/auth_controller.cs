using MedicalDeviceMonitor.Data;
using MedicalDeviceMonitor.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using OtpNet;

namespace MedicalDeviceMonitor.Controllers;

public class LoginDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public string? TwoFactorCode { get; set; }
}

public class Verify2FADto
{
    public required string Code { get; set; }
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
        if (user == null)
            return Unauthorized(new { error = "User not found in the database." });
        if (!user.IsActive)
            return Unauthorized(new { error = "This account is inactive." });

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isPasswordValid)
            return Unauthorized(new { error = "Invalid credentials." });

        // --- 2FA ENFORCEMENT ---
        if (user.IsTotpEnabled)
        {
            if (string.IsNullOrEmpty(request.TwoFactorCode))
                return Unauthorized(new { error = "2FA_REQUIRED", message = "Two-factor authentication code required." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
            if (!totp.VerifyTotp(request.TwoFactorCode, out long timeStepMatched, window: new VerificationWindow(1, 1)))
                return Unauthorized(new { error = "INVALID_2FA", message = "Invalid or expired 2FA code." });
        }

        var token = await GenerateJwtTokenAsync(user); // Switched to Async

        _logger.LogInformation("User {Email} logged in successfully.", user.Email);
        return Ok(new 
        { 
            Token = token,
            User = new { user.Id, user.Email, user.FullName, user.Role }
        });
    }

    [Authorize]
    [HttpPost("setup-2fa")]
    public async Task<IActionResult> Setup2FA()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.FindAsync(userId);
        
        if (user == null) return NotFound();

        // Generate a new base32 20-byte secret
        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);
        
        user.TotpSecret = base32Secret;
        user.IsTotpEnabled = false; // Remains false until they successfully verify
        await _db.SaveChangesAsync();
        
        // Return the URI that QR code generators (or Authenticator apps) consume
        var uri = $"otpauth://totp/MedMonitor:{user.Email}?secret={base32Secret}&issuer=MedMonitor";
        
        return Ok(new { secret = base32Secret, uri = uri });
    }

    [Authorize]
    [HttpPost("verify-2fa-setup")]
    public async Task<IActionResult> Verify2FASetup([FromBody] Verify2FADto request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _db.Users.FindAsync(userId);
        
        if (user == null || string.IsNullOrEmpty(user.TotpSecret)) 
            return BadRequest(new { error = "Setup 2FA first." });

        var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
        
        if (totp.VerifyTotp(request.Code, out long _))
        {
            user.IsTotpEnabled = true;
            await _db.SaveChangesAsync();
            _logger.LogInformation("User {Email} successfully enabled 2FA.", user.Email);
            return Ok(new { message = "Two-factor authentication successfully enabled." });
        }
        
        return BadRequest(new { error = "Invalid verification code." });
    }

    private async Task<string> GenerateJwtTokenAsync(Models.User user)
    {
        var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
            ?? _config["Jwt:Secret"] 
            ?? "FallbackSecretKeyThatIsAtLeast32BytesLong!";

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("FullName", user.FullName),
            new Claim("DepartmentId", user.DepartmentId?.ToString() ?? ""),
            new Claim("TokenVersion", user.TokenVersion.ToString())
        };

        // Bridge legacy string roles to the new dynamic RBAC schema
        var permissions = await _db.Database.SqlQueryRaw<PermissionResult>(@"
            SELECT DISTINCT p.resource || ':' || p.action as ""Value""
            FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            JOIN roles r ON r.id = rp.role_id
            WHERE LOWER(r.name) = LOWER({0})
        ", user.Role).Select(x => x.Value).ToListAsync();

        foreach (var p in permissions)
        {
            claims.Add(new Claim("Permission", p)); // Embed the capabilities 
        }

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddMinutes(120),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public class PermissionResult
    {
        public string Value { get; set; } = "";
    }

    [Authorize]
    [HttpGet("users")]
    [RequirePermission("users:manage")] 
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _db.Users
            .Select(u => new { 
                u.Id, 
                u.FullName, 
                u.Email, 
                u.Role, 
                u.IsActive 
            })
            .ToListAsync();

        return Ok(users);
    }
}