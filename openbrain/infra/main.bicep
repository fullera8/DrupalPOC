// ============================================================
// Open Brain — Azure Infrastructure (Bicep) — Subscription Scope
// ============================================================
// Creates the rg-openbrain resource group, then deploys all
// resources into it via the resources.bicep module:
//   - Azure SQL Server + Database (DTU Basic, 5 DTU)
//   - Azure Key Vault for secrets (RBAC-enabled)
//   - Azure Container Apps Environment + Container App (scale-to-zero)
//   - Log Analytics Workspace for monitoring
//
// Azure OpenAI is NOT provisioned here — an existing deployment
// (ps-azopenai-eastus-afuller2 in AzureOpenAIRG) is referenced
// via parameterised endpoint + API key stored in Key Vault.
//
// Naming convention: openbrain-*
// Region: eastus2 (default), centralus as fallback
//
// COMPLETELY SEPARATE from existing drupalpoc-* infrastructure.
// Does NOT reference or modify drupalpoc-sql, drupalpoc-aks, etc.
//
// Deploy with:
//   az deployment sub create \
//     --location eastus2 \
//     --template-file main.bicep \
//     --parameters sqlAdminLogin=<login> sqlAdminPassword=<pw> \
//                  aoaiApiKey=<key> allowedIpAddress=<ip>
// ============================================================

targetScope = 'subscription'

// ─── Parameters ─────────────────────────────────────────────

@description('Azure region for all resources (eastus2 primary, centralus fallback)')
param location string = 'eastus2'

@description('SQL Server administrator login')
param sqlAdminLogin string

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

@description('Azure OpenAI endpoint URL (existing deployment)')
param aoaiEndpoint string = 'https://ps-azopenai-eastus-afuller2.openai.azure.com/'

@description('Azure OpenAI API key (existing deployment)')
@secure()
param aoaiApiKey string

@description('JWT secret for MCP server authentication (leave empty to disable auth)')
@secure()
param jwtSecret string = ''

@description('Azure region for SQL Server (eastus2 may be blocked for new servers)')
param sqlLocation string = 'centralus'

@description('Your public IP address for SQL Server firewall rule')
param allowedIpAddress string

// ─── Resource Group ─────────────────────────────────────────

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-openbrain'
  location: location
}

// ─── Module: All resources into rg-openbrain ────────────────

module resources 'resources.bicep' = {
  name: 'openbrain-resources'
  scope: rg
  params: {
    location: location
    sqlAdminLogin: sqlAdminLogin
    sqlAdminPassword: sqlAdminPassword
    aoaiEndpoint: aoaiEndpoint
    aoaiApiKey: aoaiApiKey
    jwtSecret: jwtSecret
    sqlLocation: sqlLocation
    allowedIpAddress: allowedIpAddress
  }
}

// ─── Outputs ────────────────────────────────────────────────

output resourceGroupName string = rg.name
output sqlServerFqdn string = resources.outputs.sqlServerFqdn
output keyVaultName string = resources.outputs.keyVaultName
output acaUrl string = resources.outputs.acaUrl
output acaEnvironmentName string = resources.outputs.acaEnvironmentName
