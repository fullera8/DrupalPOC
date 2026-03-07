namespace DrupalPOC.Api.Models;

/// <summary>
/// Represents a single simulation/quiz result for a user.
/// Maps to the SimulationResults table in Azure SQL.
/// </summary>
public class SimulationResult
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string CampaignId { get; set; } = string.Empty;
    public int Score { get; set; }
    public DateTime CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
