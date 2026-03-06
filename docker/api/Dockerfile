# =============================================================================
# .NET 8 Web API — Business Logic / API Gateway (Thin Stub for POC)
# =============================================================================
# Multi-stage build: SDK (build) → ASP.NET runtime (serve)
# POC scope: health check, save simulation result, get scores (2-3 endpoints)
#
# Image: ghcr.io/fullera8/drupalpoc-api:latest
# Port:  8080
# =============================================================================

# --- Stage 1: Build ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore (layer caching)
COPY src/DrupalPOC.Api/*.csproj ./DrupalPOC.Api/
RUN dotnet restore DrupalPOC.Api/DrupalPOC.Api.csproj

# Copy everything else and publish
COPY src/DrupalPOC.Api/ ./DrupalPOC.Api/
RUN dotnet publish DrupalPOC.Api/DrupalPOC.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# --- Stage 2: Runtime ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Non-root user (ASP.NET 8 images include 'app' user)
USER app

COPY --from=build /app/publish .

# ASP.NET 8 defaults to port 8080 in containers
EXPOSE 8080

ENTRYPOINT ["dotnet", "DrupalPOC.Api.dll"]
