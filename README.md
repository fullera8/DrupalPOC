# TSUS Security Awareness Training Platform

A cybersecurity training and phishing simulation platform for the **Texas State University System (TSUS)**, serving approximately **100,000–120,000 students and faculty** across multiple member institutions.

Modeled after commercial products like **KnowBe4** and **Proofpoint Security Awareness Training**, this platform delivers security awareness courses, simulated phishing campaigns, quizzes, and compliance dashboards — built on open-source tools and deployed to Azure Kubernetes Service (AKS).

> **Status:** Proof-of-concept (POC) — March 2026 — **Day 3 complete, deployed to AKS**

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

### Infrastructure & DevOps

| Component | Technology | Details |
| :--- | :--- | :--- |
| Container Orchestration | Azure Kubernetes Service (AKS) — Free tier | `drupalpoc-aks` in eastus2, K8s v1.33.6, Standard_B2s |
| Transactional Database | Azure SQL Server — Basic DTU 5 | `drupalpoc-sql` in centralus |
| CMS Database | Azure Database for MySQL — Burstable B1ms | `drupalpoc-mysql` in centralus |
| Container Registry | GitHub Container Registry (GHCR) | `ghcr.io/fullera8/drupalpoc-*` |
| Container Images | GoPhish, Drupal (PHP 8.4-FPM), Drupal Nginx, .NET API, Angular | 4 of 5 built and pushed to GHCR (Angular pending Day 4) |
| CI/CD | GitHub Actions | Build → GHCR → AKS |
| Local Development | DDEV v1.25.0 (Docker-based) | PHP 8.4, MariaDB 11.8, Drush 13.7.1 |
| Azure CLI | Containerized DDEV sidecar | `mcr.microsoft.com/azure-cli:latest` + kubectl |
| Local Email Testing | Mailpit (built into DDEV) | Captures GoPhish emails locally |

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

## Repository Structure

```
DrupalPOC/
├── .dockerignore             # Docker build context exclusions
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
│   └── DrupalPOC.Api/        # .NET 8 Web API (Day 3)
│       ├── DrupalPOC.Api.csproj
│       ├── Program.cs         # Minimal APIs: /health, /api/results, /api/scores
│       ├── Models/SimulationResult.cs
│       ├── Data/AppDbContext.cs
│       ├── appsettings.json
│       └── appsettings.Development.json  # (.gitignored)
├── DrupalPOC.wiki/           # Project wiki (architecture, planning, chat log)
│   ├── Home.md
│   ├── Architecture.md       # Full architecture diagram & decisions
│   ├── Planning.md           # Day 1–5 task tracking with checkboxes
│   ├── ChatLog.md            # Running conversation log for LLM context
│   └── Metadata-Legend.md    # Tag definitions for wiki metadata
├── scripts/                  # Dev scripts + Drupal setup scripts
│   ├── start-dev.ps1                     # One-command local dev startup (all services)
│   ├── restart-docker.ps1                # Clean Docker Desktop restart (no Task Manager)
│   ├── logs/                             # Runtime logs (git-ignored)
│   │   ├── api.log                       # .NET API stdout/stderr
│   │   └── angular.log                   # Angular dev server output
│   ├── create_training_module_type.php   # Training Module content type + 6 fields + taxonomy
│   ├── create_quiz_webform.php           # Phishing awareness quiz (5 questions + scoring)
│   ├── seed_training_content.php         # 3 sample training modules
│   ├── configure_cors.php               # CORS configuration for Angular SPA
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

> **Note:** Azure CLI, kubectl, Composer, Drush, PHP, and MariaDB are all provided inside DDEV containers — no local installation required. .NET 8 SDK (8.0.418) is needed when working on the API service. Node.js is needed for the Angular SPA (Day 4+).

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

# 6. Open Drupal in browser
ddev launch
```

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
| `http://localhost:4200` | Angular SPA (dashboard, modules, quiz, results) |
| `http://localhost:5000/health` | .NET API health check |
| `http://drupalpoc.ddev.site` | Drupal admin UI |
| `https://localhost:3333` | GoPhish admin UI |
| `http://localhost:8888` | GoPhish phishing listener |
| `https://drupalpoc.ddev.site:8026` | Mailpit Web UI (captured GoPhish emails) |

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

To stop all services:
1. The Angular dev server runs inside the DDEV container — it stops automatically with DDEV
2. Close the minimized PowerShell window running the .NET API (or kill the `dotnet` process)
3. Run `ddev stop` to shut down DDEV containers

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
| [ChatLog](DrupalPOC.wiki/ChatLog.md) | Running conversation log with all design decisions |
| [Metadata-Legend](DrupalPOC.wiki/Metadata-Legend.md) | Tag definitions for wiki metadata system |

---

## License

TBD
