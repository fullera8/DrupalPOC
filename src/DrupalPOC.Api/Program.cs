using Microsoft.EntityFrameworkCore;
using DrupalPOC.Api.Data;
using DrupalPOC.Api.Models;
using System.IO;
using System.Runtime.CompilerServices;

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

// HttpClient for GoPhish API proxy (self-signed cert in AKS cluster)
builder.Services.AddHttpClient("gophish", client =>
{
    var baseUrl = builder.Configuration["GoPhish:BaseUrl"] ?? "https://gophish-service.drupalpoc:3333";
    client.BaseAddress = new Uri(baseUrl);
}).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
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
// GoPhish Dev-Only File Logger
// ---------------------------------------------------------------------------
// Logs full request/response details + stack traces to scripts/logs/gophish.log.
// Only active in Development — no-op in production. The log file is covered by
// the scripts/logs/*.log rule in .gitignore.

string? gpLogPath = null;
if (app.Environment.IsDevelopment())
{
    // Walk up from bin/Debug/net8.0 → project root → repo root → scripts/logs/
    var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
    var logDir = Path.Combine(repoRoot, "scripts", "logs");
    Directory.CreateDirectory(logDir);
    gpLogPath = Path.Combine(logDir, "gophish.log");
    File.AppendAllText(gpLogPath, $"\n--- GoPhish log started {DateTime.UtcNow:O} ---\n");
}

void LogGoPhish(string method, string path, string baseUrl, string apiKey,
    int? statusCode = null, string? responseBody = null, Exception? ex = null)
{
    if (gpLogPath is null) return;
    try
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff UTC}] {method} {path}");
        sb.AppendLine($"  BaseUrl : {baseUrl}");
        sb.AppendLine($"  ApiKey  : {apiKey}");
        if (statusCode.HasValue)
            sb.AppendLine($"  Status  : {statusCode.Value}");
        if (responseBody is not null)
            sb.AppendLine($"  Body    : {responseBody}");
        if (ex is not null)
        {
            sb.AppendLine($"  EXCEPTION: {ex.GetType().FullName}: {ex.Message}");
            sb.AppendLine(ex.StackTrace);
            // Include inner exceptions
            var inner = ex.InnerException;
            while (inner is not null)
            {
                sb.AppendLine($"  INNER: {inner.GetType().FullName}: {inner.Message}");
                sb.AppendLine(inner.StackTrace);
                inner = inner.InnerException;
            }
        }
        sb.AppendLine();
        File.AppendAllText(gpLogPath, sb.ToString());
    }
    catch { /* Never let logging break the request */ }
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

// ---------------------------------------------------------------------------
// GoPhish Proxy Endpoints — keeps API key server-side
// ---------------------------------------------------------------------------
var gpApiKey = app.Configuration["GoPhish:ApiKey"] ?? "";

var gpBaseUrl = app.Configuration["GoPhish:BaseUrl"] ?? "https://gophish-service.drupalpoc:3333";

app.MapGet("/api/campaigns", async (IHttpClientFactory httpClientFactory) =>
{
    var requestPath = $"/api/campaigns/?api_key={gpApiKey}";
    try
    {
        var client = httpClientFactory.CreateClient("gophish");
        var response = await client.GetAsync(requestPath);
        var json = await response.Content.ReadAsStringAsync();
        LogGoPhish("GET", requestPath, gpBaseUrl, gpApiKey,
            statusCode: (int)response.StatusCode, responseBody: json);
        return Results.Content(json, "application/json", statusCode: (int)response.StatusCode);
    }
    catch (Exception ex)
    {
        LogGoPhish("GET", requestPath, gpBaseUrl, gpApiKey, ex: ex);
        return Results.Json(new { error = "GoPhish unreachable", detail = ex.Message }, statusCode: 502);
    }
});

app.MapGet("/api/campaigns/{id}", async (int id, IHttpClientFactory httpClientFactory) =>
{
    var requestPath = $"/api/campaigns/{id}?api_key={gpApiKey}";
    try
    {
        var client = httpClientFactory.CreateClient("gophish");
        var response = await client.GetAsync(requestPath);
        var json = await response.Content.ReadAsStringAsync();
        LogGoPhish("GET", requestPath, gpBaseUrl, gpApiKey,
            statusCode: (int)response.StatusCode, responseBody: json);
        return Results.Content(json, "application/json", statusCode: (int)response.StatusCode);
    }
    catch (Exception ex)
    {
        LogGoPhish("GET", requestPath, gpBaseUrl, gpApiKey, ex: ex);
        return Results.Json(new { error = "GoPhish unreachable", detail = ex.Message }, statusCode: 502);
    }
});

app.MapGet("/api/campaigns/{id}/results", async (int id, IHttpClientFactory httpClientFactory) =>
{
    var requestPath = $"/api/campaigns/{id}/results?api_key={gpApiKey}";
    try
    {
        var client = httpClientFactory.CreateClient("gophish");
        var response = await client.GetAsync(requestPath);
        var json = await response.Content.ReadAsStringAsync();
        LogGoPhish("GET", requestPath, gpBaseUrl, gpApiKey,
            statusCode: (int)response.StatusCode, responseBody: json);
        return Results.Content(json, "application/json", statusCode: (int)response.StatusCode);
    }
    catch (Exception ex)
    {
        LogGoPhish("GET", requestPath, gpBaseUrl, gpApiKey, ex: ex);
        return Results.Json(new { error = "GoPhish unreachable", detail = ex.Message }, statusCode: 502);
    }
});

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
