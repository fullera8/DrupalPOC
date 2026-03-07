using Microsoft.EntityFrameworkCore;
using DrupalPOC.Api.Models;

namespace DrupalPOC.Api.Data;

/// <summary>
/// EF Core database context for the DrupalPOC API.
/// Targets Azure SQL Server (***REDACTED_SQL_HOST***).
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<SimulationResult> SimulationResults => Set<SimulationResult>();
}
