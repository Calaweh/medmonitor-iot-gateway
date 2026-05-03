using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using MedicalDeviceMonitor.Models;
using MedicalDeviceMonitor.Services;
using MedicalDeviceMonitor.Data;
using Microsoft.EntityFrameworkCore;

namespace MedicalDeviceMonitor.Tests
{
    public class ReadingServiceTests
    {
        private readonly Mock<ILogger<ReadingService>> _loggerMock = new();
        private readonly AppDbContext _db;

        public ReadingServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _db = new AppDbContext(options, null!);
        }

        [Fact]
        public async Task ProcessNewReadingAsync_ShouldCalculateAndPersistMews()
        {
            // Arrange
            var device = new Device { Id = Guid.NewGuid(), DeviceCode = "BED-01", Status = "online" };
            _db.Devices.Add(device);
            await _db.SaveChangesAsync();

            var service = new ReadingService(_db, null!, _loggerMock.Object);
            var payload = new { heart_rate = 120, spo2 = 88, temperature = 39.0, avpu = "V" }; // MEWS should be high
            var dto = new ReadingDto { DeviceCode = "BED-01", RecordedAt = DateTime.UtcNow, Payload = JsonDocument.Parse(JsonSerializer.Serialize(payload)) };

            // Act
            await service.ProcessNewReadingAsync(dto);

            // Assert
            var reading = await _db.SensorReadings.FirstOrDefaultAsync();
            Assert.NotNull(reading);
            
            var savedPayload = reading.Payload.RootElement;
            Assert.True(savedPayload.TryGetProperty("mews_score", out var mewsProp));
            int score = mewsProp.GetInt32();
            Assert.True(score >= 4, $"MEWS score should be high, got {score}");
        }

        [Fact]
        public void CalculateMews_ShouldHandleAVPU()
        {
            // Arrange
            var service = new ReadingService(_db, null!, _loggerMock.Object);
            
            // "V" (Voice) should add 1 to score
            var payloadV = JsonDocument.Parse("{\"avpu\": \"V\"}");
            var payloadA = JsonDocument.Parse("{\"avpu\": \"A\"}");

            // Act
            int scoreV = service.CalculateMews(payloadV.RootElement);
            int scoreA = service.CalculateMews(payloadA.RootElement);

            // Assert
            Assert.Equal(1, scoreV);
            Assert.Equal(0, scoreA);
        }
    }
}
