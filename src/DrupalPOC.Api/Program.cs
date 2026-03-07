using Microsoft.EntityFrameworkCore;
using DrupalPOC.Api.Data;
using DrupalPOC.Api.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Service Registration
// ---------------------------------------------------------------------------

// EF Core → Azure SQL Server (connection string from appsettings or env vars)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS — wide open for POC (Angular on different origin)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// ---------------------------------------------------------------------------
// Middleware Pipeline
// ---------------------------------------------------------------------------

// No UseHttpsRedirection — container runs HTTP on 8080, TLS terminates at ingress
app.UseCors();

// ---------------------------------------------------------------------------
// Auto-create database schema on first startup
// ---------------------------------------------------------------------------
// EnsureCreated() opens a real TCP connection to Azure SQL.
// If the connection string is wrong or the server is unreachable, this throws.
// There is NO silent fallback to a local database.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// Health check — proves the service is running
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "drupalpoc-api",
    timestamp = DateTime.UtcNow
}));

// Save a simulation/quiz result to Azure SQL
app.MapPost("/api/results", async (SimulationResult result, AppDbContext db) =>
{
    result.CreatedAt = DateTime.UtcNow;
    db.SimulationResults.Add(result);
    await db.SaveChangesAsync();
    return Results.Created($"/api/results/{result.Id}", result);
});

// Retrieve all simulation results from Azure SQL
app.MapGet("/api/scores", async (AppDbContext db) =>
{
    var results = await db.SimulationResults
        .OrderByDescending(r => r.CompletedAt)
        .ToListAsync();
    return Results.Ok(results);
});

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
