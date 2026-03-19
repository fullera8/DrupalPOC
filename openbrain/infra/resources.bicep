// ============================================================
// Open Brain — Resource Group Resources (Bicep Module)
// ============================================================
// Called by main.bicep after rg-openbrain is created.
// All resources here deploy into that resource group.
// ============================================================

// ─── Parameters (passed from main.bicep) ────────────────────

@description('Azure region for all resources')
param location string

@description('SQL Server administrator login')
param sqlAdminLogin string

@description('SQL Server administrator password')
@secure()
param sqlAdminPassword string

@description('Azure OpenAI endpoint URL (existing deployment)')
param aoaiEndpoint string

@description('Azure OpenAI API key (existing deployment)')
@secure()
param aoaiApiKey string

@description('Azure region for SQL Server (may differ from primary if region is blocked)')
param sqlLocation string

@description('Your public IP address for SQL Server firewall rule')
param allowedIpAddress string

@description('JWT secret for MCP server authentication')
@secure()
param jwtSecret string

// ─── Azure SQL Server ───────────────────────────────────────

resource sqlServer 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: 'openbrain-sql'
  location: sqlLocation
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
  }
}

resource fwAllowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource fwAllowMyIP 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: sqlServer
  name: 'AllowMyIP'
  properties: {
    startIpAddress: allowedIpAddress
    endIpAddress: allowedIpAddress
  }
}

// ─── Azure SQL Database ─────────────────────────────────────

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: sqlServer
  name: 'openbrain-db'
  location: sqlLocation
  sku: {
    name: 'Basic'
    tier: 'Basic'
    capacity: 5
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 2147483648 // 2 GB
  }
}

// ─── Azure Key Vault ────────────────────────────────────────

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kvob-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// Key Vault Secrets

resource secretSqlServer 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-server'
  properties: {
    value: sqlServer.properties.fullyQualifiedDomainName
  }
}

resource secretSqlDatabase 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-database'
  properties: {
    value: sqlDatabase.name
  }
}

resource secretSqlUser 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-user'
  properties: {
    value: sqlAdminLogin
  }
}

resource secretSqlPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sql-password'
  properties: {
    value: sqlAdminPassword
  }
}

resource secretAoaiApiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'aoai-api-key'
  properties: {
    value: aoaiApiKey
  }
}

resource secretAoaiEndpoint 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'aoai-endpoint'
  properties: {
    value: aoaiEndpoint
  }
}

// ─── Log Analytics Workspace ────────────────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'openbrain-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ─── Azure Container Apps Environment ───────────────────────

resource acaEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'openbrain-aca-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ─── Azure Container App ────────────────────────────────────
// NOTE: POC uses direct env vars for secrets. Post-POC, migrate to
// Key Vault secret references once the system-assigned identity has
// RBAC access (see chicken-and-egg note in Architecture.md).

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'openbrain-aca'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: acaEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'openbrain-mcp'
          image: 'mcr.microsoft.com/k8se/quickstart:latest' // placeholder until GHCR image is built
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'AZURE_SQL_SERVER'
              value: sqlServer.properties.fullyQualifiedDomainName
            }
            {
              name: 'AZURE_SQL_DATABASE'
              value: sqlDatabase.name
            }
            {
              name: 'AZURE_SQL_USER'
              value: sqlAdminLogin
            }
            {
              name: 'AZURE_SQL_PASSWORD'
              value: sqlAdminPassword
            }
            {
              name: 'AZURE_OPENAI_API_KEY'
              value: aoaiApiKey
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: aoaiEndpoint
            }
            {
              name: 'AZURE_OPENAI_EMBEDDING_DEPLOYMENT'
              value: 'text-embedding-3-small'
            }
            {
              name: 'EMBEDDING_DIMENSIONS'
              value: '1536'
            }
            {
              name: 'MCP_SERVER_PORT'
              value: '3000'
            }
            {
              name: 'JWT_SECRET'
              value: jwtSecret
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
  }
}

// ─── RBAC: Container App → Key Vault Secrets User ───────────
// Role definition: Key Vault Secrets User (4633458b-17de-408a-b874-0445c86b69e6)

resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, containerApp.id, '4633458b-17de-408a-b874-0445c86b69e6')
  scope: keyVault
  properties: {
    principalId: containerApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalType: 'ServicePrincipal'
  }
}

// ─── Outputs ────────────────────────────────────────────────

output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output keyVaultName string = keyVault.name
output acaUrl string = containerApp.properties.configuration.ingress.fqdn
output acaEnvironmentName string = acaEnvironment.name
