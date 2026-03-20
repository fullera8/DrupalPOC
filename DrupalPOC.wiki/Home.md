# DrupalPOC Wiki

**[DOCUMENT_TYPE: Navigation_Hub] [PURPOSE: Documentation_Index] [TARGET_AUDIENCE: Human_Developers] [RESPONDS_TO: Simple_Factual] [METADATA_SCHEMA_VERSION: 1.1]**

## Documentation Architecture

This wiki uses a **tiered documentation system** optimized for LLM-assisted development. See the **[📖 Metadata Legend](Metadata-Legend)** for all tag definitions, interpretation rules, and query routing.

### Architecture & Planning
- **[🏗️ Architecture](Architecture)** - POC architecture diagram (Mermaid), service inventory, build-vs-borrow strategy
- **[🧠 Open Brain](Open-Brain)** - LLM-agnostic persistent memory MCP server — architecture, tools, connection guide, technical deep dive
- **[📋 Planning](Planning)** - Day-by-day task breakdown with checkboxes, Azure provisioning checklist, risk register, post-POC backlog
- **[💰 Budget](Budget)** - Production capacity estimates, Azure tier recommendations, TCO comparison vs. commercial SaaS

### Reference
- **[💬 Chat Log](ChatLog)** - Running conversation log: architecture decisions, setup history, debugging, and design rationale
- **[📖 Metadata Legend](Metadata-Legend)** - Tag definitions, LLM interpretation rules, canonical naming, query routing

## Project Overview

**Project:** Security Awareness Training Platform for the Texas State University System (TSUS)
**Comparable Products:** KnowBe4, Proofpoint Security Awareness Training
**Expected Users:** 100,000–120,000 (students, faculty, staff across multiple TSUS institutions)
**Multi-Tenancy:** Single platform with tenant isolation per institution

### Tech Stack

**Confirmed (Day 1):**
- **CMS:** Drupal 11.3.3 (headless, JSON:API + Webform 6.3.x-dev) — content authoring for training modules, quizzes, and assessments
- **Frontend:** Angular 21.x (SPA) — student/faculty-facing training UI
- **Backend API:** .NET 8 Web API — business logic, simulation engine, assessment scoring, analytics aggregation
- **Phishing Engine:** GoPhish (latest, official Docker Hub image) — Azure MySQL (AKS) / DDEV MariaDB (local dev)
- **Database:** Azure SQL Server `drupalpoc-sql` (centralus, Basic DTU 5) + Azure MySQL `drupalpoc-mysql` (centralus, Burstable B1ms)
- **Container Orchestration:** Azure Kubernetes Service `drupalpoc-aks` (eastus2, Free tier, Standard_B2s, K8s v1.33.6)
- **Container Registry:** GitHub Container Registry (GHCR)
- **CI/CD:** GitHub Actions → GHCR → AKS
- **.NET API (Day 3–4):** Minimal APIs (.NET SDK 8.0.418, EF Core 8.0.24) — 6 endpoints: GET /health, POST /api/results, GET /api/scores, plus 3 GoPhish proxy endpoints (GET /api/campaigns, GET /api/campaigns/{id}, GET /api/campaigns/{id}/results). The .NET API proxies GoPhish so the API key stays server-side — Angular never talks to GoPhish directly.
- **K8s Manifests (Day 3):** 8 files in `k8s/` — namespace, secrets, configmaps, 4 deployments + services, ingress
- **AKS Deployment (Day 3):** All 4 pods running in `drupalpoc` namespace, nginx ingress at `20.85.112.48`
- **Webform REST (Day 4):** `drupal/webform_rest` 4.2.0 — JSON:API cannot serve webform quiz structure (treats webforms as config entities, access-denied). `webform_rest` provides dedicated REST endpoints (`/webform_rest/{id}/fields?_format=json`) for Angular to render quizzes authored in Drupal.
- **Container Images (Day 2–4):** `ghcr.io/fullera8/drupalpoc-angular`, `drupalpoc-api` (.NET 8), `drupalpoc-drupal` (PHP 8.4-FPM), `drupalpoc-drupal-nginx`, `drupalpoc-gophish` — all 5 images pushed to GHCR
- **Local Development:** DDEV v1.25.0 (PHP 8.4, MariaDB 11.8, Drush 13.7.1)
- **Azure CLI:** Containerized as DDEV sidecar (`mcr.microsoft.com/azure-cli:latest`) with kubectl — no local Azure CLI install required
- **Cloud:** Microsoft Azure (Resource Group: `rg-fulleralex47-0403` in eastus2)
- **Open Brain MCP Server:** LLM-agnostic persistent memory layer — 4 tools (remember, recall, search, forget) over MCP Streamable HTTP. Node.js/TypeScript, Azure SQL VECTOR(1536), Azure OpenAI `text-embedding-3-small`. Deployed on Azure Container Apps (scale-to-zero). See **[🧠 Open Brain](Open-Brain)**.
- **Version Control:** GitHub (private repo: [fullera8/DrupalPOC](https://github.com/fullera8/DrupalPOC))

**Planned (Post-POC):**
- **Authentication:** Azure Active Directory (Entra ID) — institutional SSO
- **Cache:** Redis (session + caching at scale)
- **Search:** Solr or Elasticsearch (training module discovery)
- **File Storage:** Azure Blob Storage (training videos, simulation assets, reports)
- **LTI:** LTI 1.3 compliant (integration with institutional LMS platforms)

### Core Feature Areas
- **Learning Modules:** Short-form security training videos (3–10 min)
- **Phishing & Social Engineering Simulations:** Simulated attack campaigns with tracking
- **Assessments & Quizzes:** Knowledge verification with auto-grading
- **Course Pages & Syllabi:** Structured training curricula
- **Discussion Forums / Collaboration:** Peer interaction on security topics
- **Reporting & Analytics Dashboard:** Per-tenant compliance tracking, completion rates, simulation results

### Architecture Pattern
**Decoupled Drupal** — Drupal serves as a headless CMS exposing training content via JSON:API. A .NET 8 API gateway handles business logic (simulation engine, assessment scoring, analytics). An Angular SPA serves the student/faculty training experience. Single-platform multi-tenancy with per-institution data isolation.

**POC Strategy:** Leverage free 3rd-party tools (GoPhish, Drupal Webform, Angular Material, Chart.js, YouTube embeds) to build a pitch-ready demo in < 1 week. Azure SQL + AKS included to prove the microservice pattern. See **[🏗️ Architecture](Architecture)** for the full diagram and build plan.

### Proven Patterns
The developer has established enterprise patterns for the following components, carried forward into DrupalPOC:
- **Backend:** .NET 8 Web API in Docker (multi-stage build)
- **Frontend:** Angular SPA in Docker (Node build → Nginx serve)
- **Container Orchestration:** GHCR for image storage, AKS for deployment, OIDC auth from GitHub Actions to Azure
- **CI/CD:** GitHub Actions pipeline — build → push to GHCR → deploy to AKS

## Current Progress

| Day | Status | Summary |
| :--- | :--- | :--- |
| **Day 1** | ✅ Complete | Azure provisioning (AKS, SQL, MySQL) + Drupal content modeling (Training Module type, quiz webform, sample content, JSON:API + CORS) |
| **Day 2** | ✅ Complete | Dockerfiles for all 4 services + 3 images built & pushed to GHCR (`drupalpoc-gophish`, `drupalpoc-drupal`, `drupalpoc-drupal-nginx`) |
| **Day 3** | ✅ Complete | .NET API scaffolded + tested + pushed to GHCR. K8s manifests created (8 files). Deployed to AKS — all 4 pods running, ingress at `20.85.112.48`. |
| **Day 4** | ✅ Complete | Drupal AKS MySQL site:install + setup scripts, Angular 21 scaffold (Material + Chart.js), Webform REST investigation + module install, Drupal JSON:API integration (Pluralsight-style module viewer), .NET API quiz scoring integration, GoPhish campaign seeding + Angular integration, Dashboard (4 KPI cards + 2 Chart.js charts), Docker build + GHCR push + AKS deploy (all 5 images live) |
| **Day 5** | ✅ Complete | DDEV Mutagen sync troubleshooting + self-healing in start-dev.ps1, stop-dev.ps1 shutdown script, deploy-aks.ps1 AKS deployment pipeline, GoPhish local setup (Mailpit SMTP), nginx CSS aggregation fix (try_files), mailpit_link custom module (environment-aware), Architecture Semantic Enrichment, GoPhish SQLite → Azure MySQL migration, DDEV GoPhish sidecar, seed scripts (production → local pipeline) |
| **Open Brain<br>Steps 1–12** | ✅ Complete | LLM-agnostic persistent memory MCP server. 11 build steps (scaffold → Bicep infra → SQL schema → embedding service → DB service → metadata extractor → 4 MCP tools → server entry → Azure deploy). Step 12: end-to-end integration testing via VS Code Copilot Agent mode — 12/12 tests passed (6 local + 6 remote), 2 infrastructure fixes (workspace root mcp.json, DDEV port mapping). See **[🧠 Open Brain](Open-Brain)** |
| **Landing Page** | ✅ Complete | UTSA-branded marketing-quality landing page (`HomeComponent`). Hero section with campus backdrop, value proposition cards, training pathway tiles, live KPI row (ApiService + GophishService), footer. Default route changed from `/dashboard` to `/home`. Montserrat font added for headlines. Sidenav updated to 5 items. |

See **[📋 Planning](Planning)** for detailed task tracking.

## Quick Starts

### For Business Analysts & Stakeholders
If you are evaluating the platform's cost, architecture, or analyzing tradeoffs against commercial SaaS or a traditional Drupal monolith, start here:
1. **[🏗️ Architecture](Architecture)** - Learn how the system isolates the Frontend, Backend APIs, and CMS to enable cost-effective scaling.
2. **[💰 Budget & Cost Analysis](Budget)** - Review our comprehensive financial model, specifically structured for deep-research cost ingestion.

### For Developers & Engineers
If you are setting up the environment, deploying to AKS, or modifying code, start here:
1. Ensure Docker Desktop and DDEV are installed — **no local Node/npm/Angular CLI required** (all Angular tooling runs inside `node:22-alpine` Docker containers via DDEV)
2. Clone the repo and run `ddev start`
3. **(First time only)** Run setup scripts to populate the empty database with the Drupal content model and enable webform REST endpoints:
   ```powershell
   ddev drush scr scripts/create_training_module_type.php
   ddev drush scr scripts/create_quiz_webform.php
   ddev drush scr scripts/seed_training_content.php
   ddev drush scr scripts/configure_cors.php
   ddev drush scr scripts/enable_webform_rest.php
   ```
   > **Note:** `enable_webform_rest.php` creates the REST resource configs and grants anonymous GET permissions. Without it, the quiz page returns 404 because Drupal's REST framework requires explicit `RestResourceConfig` entities to register routes.
4. Read the **[💬 Chat Log](ChatLog)** for technical context, setup history, and real-world debugging steps.

## Local Development

**For daily development (after the first-time setup above is complete):** Boot all services (DDEV, .NET API, Angular) with one command. *(Note: `start-dev.ps1` does not run the first-time DB scaffolding.)*

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

| URL | Service |
| :--- | :--- |
| `http://localhost:4200` | Angular SPA (home, dashboard, modules, quiz, results) |
| `http://localhost:5000/health` | .NET API health check |
| `http://drupalpoc.ddev.site` | Drupal admin UI |
| `http://localhost:3000/health` | Open Brain MCP server (health check) |
| `https://localhost:3333` | GoPhish admin UI |
| `http://localhost:8888` | GoPhish phishing listener |
| `http://drupalpoc.ddev.site:8025` | Mailpit Web UI (captured GoPhish emails) |

The script verifies Docker health, starts DDEV (with Mutagen self-healing for Windows symlink conflicts), launches the .NET API with `ASPNETCORE_ENVIRONMENT=Development`, checks npm dependencies, and starts the Angular dev server — with logs written to `scripts/logs/`.

**To stop all services gracefully:**
```powershell
# Normal shutdown (fast restart next session)
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1

# Full cleanup (stuck state, long break between sessions)
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1 -Full
```
`stop-dev.ps1` tears down Angular, .NET API, and DDEV in reverse startup order, verifies ports 4200/5000 are free, and cleans up orphan processes. The `-Full` flag additionally runs `ddev poweroff` (router, ssh-agent, Mutagen) and kills stray PowerShell windows.

**To deploy to AKS:**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1
```
6-step pipeline: pre-flight → Docker build → GHCR push → AKS rollout → post-deploy (ConfigMaps, module enable, cache rebuild) → endpoint verification. Supports `-SkipBuild`, `-SkipPush`, `-BuildOnly`, and `-Only api,angular` flags.

**If Docker Desktop freezes** (containers unresponsive, pipe errors), use the clean restart script instead of Task Manager:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-docker.ps1
```

This kills orphaned processes, gracefully quits Docker Desktop, clears the WSL2 distro, and restarts cleanly. Automatically runs `ddev start` after restart (skip with `-NoDdev`). See the [README](../README.md#troubleshooting-docker-desktop) for full details.
