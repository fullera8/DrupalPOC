# TSUS Security Awareness Training Platform

A cybersecurity training and phishing simulation platform for the **Texas State University System (TSUS)**, serving approximately **100,000–120,000 students and faculty** across multiple member institutions.

Modeled after commercial products like **KnowBe4** and **Proofpoint Security Awareness Training**, this platform delivers security awareness courses, simulated phishing campaigns, quizzes, and compliance dashboards — built on open-source tools and deployed to Azure Kubernetes Service (AKS).

> **Status:** Proof-of-concept (POC) — March 2026 — **Day 5 + Open Brain complete, deployed to AKS & Azure Container Apps**

---

## Table of Contents

- [Why This Exists](#why-this-exists)
- [What It Does](#what-it-does)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Wiki & Documentation](#wiki--documentation)
- [License](#license)

---

## Why This Exists

TSUS needs a centralized security awareness training program for all member institutions. Commercial SaaS solutions (KnowBe4, Proofpoint) are expensive at this scale and offer limited control over data, branding, and integration with university systems.

This platform gives TSUS:

- **Full ownership** of training content, user data, and reporting
- **Cost savings** by leveraging open-source tools (Drupal, GoPhish, Angular) instead of per-seat SaaS licensing
- **Integration flexibility** with existing university infrastructure (Azure AD SSO, LTI 1.3 for LMS integration — planned post-POC)
- **Per-institution tenant isolation** so each member institution sees only their own users and data

---

## What It Does

| Feature | Description | POC Tool |
| :--- | :--- | :--- |
| **Security Awareness Training** | Short, focused modules on phishing, social engineering, password hygiene, and data handling | Drupal 11 (JSON:API) |
| **Phishing Simulations** | Realistic simulated phishing emails with click tracking and reporting | GoPhish (open source) |
| **Quizzes & Assessments** | Knowledge checks tied to training content with automatic scoring | Drupal Webform |
| **Compliance Dashboards** | Per-institution visibility into completion rates, scores, and simulation results | Angular + Chart.js |
| **Video Content Delivery** | Embedded training videos supplementing written modules | YouTube / Vimeo (unlisted) |
| **Discussion Forums** | Threaded discussions for peer learning | Drupal Forum (core) |
| **AI-Assisted Development** | Persistent memory layer for LLM agents — store and retrieve project knowledge across conversations via semantic vector search | Open Brain MCP Server |

---

## Architecture Overview

The platform uses a **decoupled microservice architecture** deployed to Azure Kubernetes Service (AKS):

```
Trainee (Browser)
  → Angular SPA (AKS)
      → Drupal 11 JSON:API (Training content, quizzes)
      → .NET 8 Web API (Scores, completions)
      → GoPhish REST API (Campaign results, click tracking)
      → YouTube / Vimeo (Embedded training videos)

Admin (Browser)
  → Drupal Admin UI (Content authoring, quiz builder)
```

### Enterprise Tier Services

| Tier & Logical Role | Service Component | Backing Store |
| :--- | :--- | :--- |
| **Frontend Hub** (Trainee UI) | **Angular SPA** | — |
| **Business Rule Gateway** (Processing) | **.NET 8 Web API** | Azure SQL Server |
| **Content Repository** (Headless CMS) | **Drupal 11 Headless** | Azure MySQL |
| **Specialized Tooling** (Simulation) | **GoPhish** | Azure MySQL (AKS) / MariaDB (local dev) |
| **Developer Tooling** (AI Memory) | **Open Brain MCP Server** | Azure SQL `openbrain-db` (VECTOR 1536) + Azure OpenAI |

> **Cost & Architecture Analysis:** For structural comparisons against commercial SaaS platforms or traditional Drupal monoliths, see the **[Budget, Capacity Planning & Cost Analysis](DrupalPOC.wiki/Budget.md)** and **[Architecture](DrupalPOC.wiki/Architecture.md)** wiki pages.

### CI/CD Pipeline

```
Developer Push (GitHub) → GitHub Actions → Build Docker Images → Push to GHCR → Deploy to AKS
```

For the full architecture diagram (Mermaid), service inventory, build-vs-borrow strategy, and deferred features, see the [Architecture wiki page](DrupalPOC.wiki/Architecture.md).

---

## Tech Stack

### Application Services

| Component | Technology | Version |
| :--- | :--- | :--- |
| Frontend | Angular + Angular Material + Chart.js | 21.x |
| Business API | .NET 8 Web API (EF Core 8.0.24, Minimal APIs) | 8.0.418 SDK |
| CMS | Drupal (headless, JSON:API) | 11.3.3 |
| Quizzes & Assessments | Drupal Webform (6.3.x-dev) | 6.3.x-dev (only D11-compatible branch) |
| Phishing Engine | GoPhish | Latest |
| Dependency Mgmt | Composer | 2.x |
| CLI | Drush | 13.7.1 |
| AI Memory Server | Open Brain MCP Server (Node.js/TypeScript, Express, MCP SDK) | 1.0.0 |

### Infrastructure & DevOps

| Component | Technology | Details |
| :--- | :--- | :--- |
| Container Orchestration | Azure Kubernetes Service (AKS) — Free tier | `drupalpoc-aks` in eastus2, K8s v1.33.6, Standard_B2s |
| Transactional Database | Azure SQL Server — Basic DTU 5 | `drupalpoc-sql` in centralus |
| CMS Database | Azure Database for MySQL — Burstable B1ms | `drupalpoc-mysql` in centralus |
| Container Registry | GitHub Container Registry (GHCR) | `ghcr.io/fullera8/drupalpoc-*` |
| Container Images | GoPhish, Drupal (PHP 8.4-FPM), Drupal Nginx, .NET API, Angular | All 5 built and pushed to GHCR |
| CI/CD | GitHub Actions | Build → GHCR → AKS |
| Local Development | DDEV v1.25.0 (Docker-based) | PHP 8.4, MariaDB 11.8, Drush 13.7.1 |
| Azure CLI | Containerized DDEV sidecar | `mcr.microsoft.com/azure-cli:latest` + kubectl |
| Local Email Testing | Mailpit (built into DDEV) | Captures GoPhish emails locally |
| Open Brain Container Apps | Azure Container Apps — Consumption (0–3 replicas, scale-to-zero) | `openbrain-aca` in eastus2 |
| Open Brain Database | Azure SQL Server — Basic DTU 5 | `openbrain-sql` + `openbrain-db` in centralus (VECTOR 1536) |
| Open Brain Embedding | Azure OpenAI — Standard | `ps-azopenai-eastus-afuller2` in eastus — `text-embedding-3-small` |
| Open Brain Registry | Azure Container Registry — Basic | `openbrainacr.azurecr.io` in eastus2 |

### Planned (Post-POC)

| Component | Purpose |
| :--- | :--- |
| Azure AD / SSO | Single sign-on for all TSUS institutions |
| LTI 1.3 Provider | Integration with university LMS platforms (Canvas, Blackboard) |
| Multi-tenancy | Per-institution data isolation at the database level |
| Redis | Caching layer for performance at scale |
| Solr / Elasticsearch | Full-text search for training content |
| Azure Blob Storage | Video and document hosting (replaces YouTube embeds) |

---

## Current Progress

| Day | Status | Summary |
| :--- | :--- | :--- |
| **Day 1** | ✅ Complete | Azure provisioning (AKS, SQL, MySQL) + Drupal content modeling (Training Module type, quiz webform, sample content, JSON:API + CORS) |
| **Day 2** | ✅ Complete | Dockerfiles for all 4 services + 3 images built & pushed to GHCR (`drupalpoc-gophish`, `drupalpoc-drupal`, `drupalpoc-drupal-nginx`) |
| **Day 3** | ✅ Complete | .NET API scaffolded + tested + pushed to GHCR. K8s manifests created (8 files). Deployed to AKS — all 4 pods running, ingress at `20.85.112.48`. |
| **Day 4** | ✅ Complete | Angular 21 scaffold (Material + Chart.js), Drupal JSON:API integration, .NET API quiz scoring, GoPhish campaign seeding, Dashboard (4 KPI cards + 2 Chart.js charts), Docker build + GHCR push + AKS deploy (all 5 images live) |
| **Day 5** | ✅ Complete | start-dev.ps1 / stop-dev.ps1 / deploy-aks.ps1 scripts, GoPhish local setup (Mailpit SMTP), GoPhish SQLite → Azure MySQL migration, DDEV GoPhish sidecar, Architecture Semantic Enrichment |
| **Open Brain** | ✅ Complete | LLM-agnostic persistent memory MCP server — 12 steps from scaffold to integration testing. 12/12 end-to-end tests passed (6 local + 6 remote). See [Open Brain wiki](DrupalPOC.wiki/Open-Brain.md). |
| **Landing Page** | ✅ Complete | UTSA-branded marketing-quality landing page (`HomeComponent`). Hero with campus backdrop, value proposition cards, training pathway tiles, live KPI row, footer. Default route → `/home`. Montserrat font, 5 sidenav items. |

See [Planning](DrupalPOC.wiki/Planning.md) for detailed task tracking.

---

## Repository Structure

```
DrupalPOC/
├── .ddev/                    # DDEV config (Drupal's local dev environment)
│   └── docker-compose.openbrain.yaml  # Exposes Open Brain port 3000 to host
├── .dockerignore             # Docker build context exclusions
├── .vscode/
│   └── mcp.json              # MCP server config (Open Brain local + remote)
├── composer.json             # PHP dependencies (Drupal, Drush)
├── README.md                 # ← You are here
├── docker/                   # Dockerfiles and container configs (Day 2)
│   ├── angular/
│   │   ├── Dockerfile        # Multi-stage: Node 22 build → Nginx serve
│   │   └── nginx.conf        # SPA routing + /healthz health check
│   ├── api/
│   │   └── Dockerfile        # Multi-stage: .NET 8 SDK build → ASP.NET runtime
│   ├── drupal/
│   │   ├── Dockerfile        # 3-stage: Composer → PHP 8.4-FPM → Nginx sidecar
│   │   ├── nginx.conf        # Drupal front-controller + PHP-FPM proxy + /healthz
│   │   └── settings.php      # Production settings (Azure MySQL via env vars)
│   └── gophish/
│       ├── Dockerfile        # Thin wrapper on gophish/gophish:latest
│       ├── config.json       # Production config template (Azure MySQL, credential placeholder)
│       └── config.local.json # Local dev config (DDEV MariaDB)
├── k8s/                      # Kubernetes deployment manifests (Day 3)
│   ├── namespace.yaml        # drupalpoc namespace
│   ├── secrets.yaml          # Placeholder — real secrets created via kubectl
│   ├── configmaps.yaml       # Drupal nginx sidecar conf + Angular placeholder HTML
│   ├── api-deployment.yaml   # .NET API Deployment + ClusterIP Service
│   ├── drupal-deployment.yaml  # Drupal sidecar (php-fpm + nginx) + Service
│   ├── angular-deployment.yaml # Angular placeholder + Service
│   ├── gophish-deployment.yaml # GoPhish + Service
│   └── ingress.yaml          # Nginx ingress (path-based routing)
├── src/                      # Application source code
│   ├── angular/              # Angular 21 SPA (Day 4)
│   │   ├── angular.json
│   │   ├── package.json
│   │   └── src/              # Components, services, routing
│   └── DrupalPOC.Api/        # .NET 8 Web API (Day 3)
│       ├── DrupalPOC.Api.csproj
│       ├── Program.cs         # Minimal APIs: /health, /api/results, /api/scores
│       ├── Models/SimulationResult.cs
│       ├── Data/AppDbContext.cs
│       ├── appsettings.json
│       └── appsettings.Development.json  # (.gitignored)
├── openbrain/                # Open Brain MCP Server (AI memory layer)
│   ├── Dockerfile            # Multi-stage: node:20-slim build → production
│   ├── package.json          # Dependencies + build script
│   ├── tsconfig.json         # TypeScript config (ES2022, strict)
│   ├── test-mcp.sh           # Integration test script (full MCP protocol cycle)
│   ├── infra/
│   │   ├── main.bicep        # Subscription-scoped Bicep orchestrator
│   │   └── resources.bicep   # Azure resources (SQL, KV, ACA, RBAC, logs)
│   ├── sql/
│   │   └── init-schema.sql   # Idempotent DDL: 3 tables, VECTOR(1536), stored proc
│   └── src/server/
│       ├── index.ts          # Express + MCP Streamable HTTP entry point
│       ├── metadata/         # Rule-based metadata extractor (no LLM)
│       ├── services/         # Azure SQL (tedious) + Azure OpenAI embedding
│       └── tools/            # remember, recall, search, forget
├── DrupalPOC.wiki/           # Project wiki (architecture, planning, chat log)
│   ├── Home.md
│   ├── Architecture.md       # Full architecture diagram & decisions
│   ├── Open-Brain.md         # Open Brain MCP server deep dive
│   ├── Planning.md           # Day 1–5 task tracking with checkboxes
│   ├── ChatLog.md            # Running conversation log for LLM context
│   └── Metadata-Legend.md    # Tag definitions for wiki metadata
├── scripts/                  # Dev scripts + Drupal setup scripts
│   ├── start-dev.ps1                     # One-command local dev startup (all services)
│   ├── stop-dev.ps1                      # Graceful shutdown (reverse startup order, -Full flag)
│   ├── deploy-aks.ps1                    # 6-step AKS deployment pipeline
│   ├── restart-docker.ps1                # Clean Docker Desktop restart (no Task Manager)
│   ├── logs/                             # Runtime logs (git-ignored)
│   │   ├── api.log                       # .NET API stdout/stderr
│   │   └── angular.log                   # Angular dev server output
│   ├── create_training_module_type.php   # Training Module content type + 6 fields + taxonomy
│   ├── create_quiz_webform.php           # Phishing awareness quiz (5 questions + scoring)
│   ├── seed_training_content.php         # 3 sample training modules
│   ├── configure_cors.php               # CORS configuration for Angular SPA
│   ├── enable_webform_rest.php           # REST resource configs + anonymous GET permissions
│   ├── seed_gophish_campaign.sh          # Seeds GoPhish with a demo phishing campaign
│   └── seed_gophish_local.ps1            # Dumps production GoPhish data to local DDEV MariaDB
├── recipes/                  # Drupal recipes
├── vendor/                   # Composer dependencies (git-ignored)
└── web/                      # Drupal webroot (core is git-ignored)
    ├── index.php
    ├── modules/              # Custom & contrib modules
    ├── themes/               # Custom & contrib themes
    ├── profiles/
    └── sites/
```

> **Note:** `vendor/` and `web/core/` are excluded from version control via `.gitignore`. Run `composer install` to restore them.

---

## Prerequisites

| Tool | Install | Notes |
| :--- | :--- | :--- |
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) | Required for DDEV |
| **DDEV** | [ddev.readthedocs.io/en/stable/](https://ddev.readthedocs.io/en/stable/) | Local Drupal environment |
| **Git** | [git-scm.com](https://git-scm.com/) | Version control |

> **Note:** Azure CLI, kubectl, Composer, Drush, PHP, MariaDB, Node.js, npm, and Angular CLI are all provided inside DDEV containers — no local installation required. .NET 8 SDK (8.0.418) is needed only when working on the API service outside of Docker.

---

## Getting Started

```powershell
# 1. Clone the repository
git clone https://github.com/fullera8/DrupalPOC.git
cd DrupalPOC

# 2. Start DDEV (Docker must be running)
ddev start

# 3. Install PHP dependencies
ddev composer install

# 4. (First time only) Install Drupal site
#    ⚠️ WARNING: This wipes the database — only run on a fresh setup
ddev drush site:install --account-name=admin --account-pass=admin -y

# 5. (First time only) Set up Drupal content model
#    This populates the empty database installed in step 4.
ddev drush scr scripts/create_training_module_type.php
ddev drush scr scripts/create_quiz_webform.php
ddev drush scr scripts/seed_training_content.php
ddev drush scr scripts/configure_cors.php
ddev drush scr scripts/enable_webform_rest.php

# 6. Open Drupal in browser
ddev launch
```

> **Note:** `enable_webform_rest.php` creates the REST resource configs and grants anonymous GET permissions. Without it, the quiz page returns 404 because Drupal's REST framework requires explicit `RestResourceConfig` entities to register routes.

**Local site URL:** `http://drupalpoc.ddev.site`

---

## Local Development

**For daily development (after the first-time setup above is complete):** use the automated startup script to boot all services. *(Note: this script does not execute the first-time database setup.)*

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

This script handles everything in order:

| Step | What It Does |
| :--- | :--- |
| 1. Docker pre-flight | Verifies Docker Desktop is responsive before proceeding |
| 2. GoPhish health check | Waits for the GoPhish admin UI on `https://localhost:3333` (30 s timeout, non-fatal) |
| 3. DDEV | Starts the DDEV environment (Drupal, MariaDB, GoPhish, Traefik router) |
| 4. .NET API | Launches the .NET 8 API on `http://localhost:5000` in a background window |
| 5. npm install | Checks Angular dependencies inside the DDEV container (first run only) |
| 6. Angular dev server | Starts `ng serve` detached inside the container on `http://localhost:4200` |

**Local URLs after startup:**

| URL | Service |
| :--- | :--- |
| `http://localhost:4200` | Angular SPA (home, dashboard, modules, quiz, results) |
| `http://localhost:5000/health` | .NET API health check |
| `http://localhost:3000/health` | Open Brain MCP server (health check) |
| `http://drupalpoc.ddev.site` | Drupal admin UI |
| `https://localhost:3333` | GoPhish admin UI |
| `http://localhost:8888` | GoPhish phishing listener |
| `http://drupalpoc.ddev.site:8025` | Mailpit Web UI (captured GoPhish emails) |

Logs are written to `scripts/logs/api.log` and `scripts/logs/angular.log` for debugging.

### Troubleshooting Docker Desktop

Docker Desktop on Windows can freeze when long-lived container exec sessions are interrupted (e.g., by closing terminals or Task Manager). Symptoms include:

- Containers visible in Docker Desktop but unresponsive
- "Cannot stop Docker Compose application: Max retries reached" errors
- `docker info` shows the client but fails with "The system cannot find the file specified" for the server

**Do not use Task Manager to force-quit Docker.** Instead, use the clean restart script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-docker.ps1
```

This script:
1. Kills orphaned `ddev` and script processes holding pipe connections
2. Sends a graceful quit signal to Docker Desktop
3. Force-stops any surviving Docker processes
4. Terminates the WSL2 `docker-desktop` distro to clear stale pipe state
5. Restarts Docker Desktop and waits for the engine to be ready

### Stopping the Dev Environment

```powershell
# Normal shutdown (fast restart next session)
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1

# Full cleanup (stuck state, long break between sessions)
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1 -Full
```

`stop-dev.ps1` tears down Angular, .NET API, and DDEV in reverse startup order, verifies ports 4200/5000 are free, and cleans up orphan processes. The `-Full` flag additionally runs `ddev poweroff` (router, ssh-agent, Mutagen) and kills stray PowerShell windows.

### Deploying to AKS

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1
```

6-step pipeline: pre-flight → Docker build → GHCR push → AKS rollout → post-deploy (ConfigMaps, module enable, cache rebuild) → endpoint verification. Supports `-SkipBuild`, `-SkipPush`, `-BuildOnly`, and `-Only api,angular` flags.

---

## Deployment

The POC is **deployed and running** on Azure Kubernetes Service (AKS) as of Day 3 (Mar 7, 2026).

### Live AKS Deployment

| Resource | Value |
| :--- | :--- |
| **Ingress External IP** | `20.85.112.48` |
| **Namespace** | `drupalpoc` |
| **Ingress Controller** | nginx ingress controller v1.12.1 |
| **Pods Running** | 4 (angular, api, drupal [sidecar: 2/2], gophish) |

**Endpoints:**
| URL | Service |
| :--- | :--- |
| `http://20.85.112.48/health` | .NET API health check |
| `http://20.85.112.48/api/scores` | .NET API scores |
| `http://20.85.112.48/` | Angular placeholder |
| `http://20.85.112.48/jsonapi` | Drupal JSON:API (pending Drupal install) |

### Open Brain (Azure Container Apps)

Open Brain runs separately on Azure Container Apps (not AKS) with scale-to-zero billing.

| Resource | Value |
| :--- | :--- |
| **FQDN** | `openbrain-aca.politehill-8ea585d8.eastus2.azurecontainerapps.io` |
| **Runtime** | Azure Container Apps (Consumption, 0–3 replicas) |
| **Registry** | `openbrainacr.azurecr.io` |
| **Database** | Azure SQL `openbrain-db` (Basic DTU 5, VECTOR 1536) |
| **Embedding Model** | Azure OpenAI `text-embedding-3-small` (1536 dimensions) |

**Endpoints:**
| URL | Service |
| :--- | :--- |
| `https://openbrain-aca.politehill-8ea585d8.eastus2.azurecontainerapps.io/health` | Health check (no auth) |
| `https://openbrain-aca.politehill-8ea585d8.eastus2.azurecontainerapps.io/mcp` | MCP Streamable HTTP endpoint (Bearer auth) |

For architecture details, MCP tool definitions, and connection setup, see the [Open Brain wiki page](DrupalPOC.wiki/Open-Brain.md).

### CI/CD Pipeline (Target)

1. **Push** code to GitHub (`main` branch)
2. **GitHub Actions** builds Docker images for each service (Angular, .NET, Drupal, GoPhish)
3. **Push** images to GitHub Container Registry (GHCR)
4. **Deploy** to AKS via `kubectl` / Helm using OIDC authentication from GitHub Actions to Azure

For the full Azure resource list and provisioning checklist, see [Planning](DrupalPOC.wiki/Planning.md).

---

## Wiki & Documentation

The project wiki contains detailed architecture decisions, task tracking, and conversation history:

| Page | Description |
| :--- | :--- |
| [Home](DrupalPOC.wiki/Home.md) | Wiki navigation hub |
| [Architecture](DrupalPOC.wiki/Architecture.md) | Full architecture diagram, service inventory, build-vs-borrow strategy |
| [Planning](DrupalPOC.wiki/Planning.md) | Day 1–5 task breakdown, Azure provisioning checklist, risk register |
| [Budget](DrupalPOC.wiki/Budget.md) | Production capacity estimates, Azure tier recommendations, TCO comparison vs. commercial SaaS |
| [ChatLog](DrupalPOC.wiki/ChatLog.md) | Running conversation log with all design decisions |
| [Open-Brain](DrupalPOC.wiki/Open-Brain.md) | Open Brain MCP server architecture, tools, and connection guide |
| [Metadata-Legend](DrupalPOC.wiki/Metadata-Legend.md) | Tag definitions for wiki metadata system |

---

## License

TBD
