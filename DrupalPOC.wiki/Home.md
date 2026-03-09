# DrupalPOC Wiki

**[DOCUMENT_TYPE: Navigation_Hub] [PURPOSE: Documentation_Index] [TARGET_AUDIENCE: Human_Developers] [RESPONDS_TO: Simple_Factual] [METADATA_SCHEMA_VERSION: 1.1]**

## Documentation Architecture

This wiki uses a **tiered documentation system** optimized for LLM-assisted development. See the **[📖 Metadata Legend](Metadata-Legend)** for all tag definitions, interpretation rules, and query routing.

### Architecture & Planning
- **[🏗️ Architecture](Architecture)** - POC architecture diagram (Mermaid), service inventory, build-vs-borrow strategy
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
- **Phishing Engine:** GoPhish (latest, official Docker Hub image)
- **Database:** Azure SQL Server `drupalpoc-sql` (centralus, Basic DTU 5) + Azure MySQL `drupalpoc-mysql` (centralus, Burstable B1ms)
- **Container Orchestration:** Azure Kubernetes Service `drupalpoc-aks` (eastus2, Free tier, Standard_B2s, K8s v1.33.6)
- **Container Registry:** GitHub Container Registry (GHCR)
- **CI/CD:** GitHub Actions → GHCR → AKS
- **.NET API (Day 3):** Minimal APIs (​.NET SDK 8.0.418, EF Core 8.0.24) — 3 endpoints: GET /health, POST /api/results, GET /api/scores
- **K8s Manifests (Day 3):** 8 files in `k8s/` — namespace, secrets, configmaps, 4 deployments + services, ingress
- **AKS Deployment (Day 3):** All 4 pods running in `drupalpoc` namespace, nginx ingress at `20.85.112.48`
- **Container Images (Day 2–3):** `ghcr.io/fullera8/drupalpoc-gophish`, `drupalpoc-drupal` (PHP 8.4-FPM), `drupalpoc-drupal-nginx`, `drupalpoc-api` (.NET 8) — 4 of 5 pushed to GHCR (Angular pending Day 4)
- **Local Development:** DDEV v1.25.0 (PHP 8.4, MariaDB 11.8, Drush 13.7.1)
- **Azure CLI:** Containerized as DDEV sidecar (`mcr.microsoft.com/azure-cli:latest`) with kubectl — no local Azure CLI install required
- **Cloud:** Microsoft Azure (Resource Group: `rg-fulleralex47-0403` in eastus2)
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
| **Day 4** | ⬜ Not started | Angular Frontend + Integrations |
| **Day 5** | ⬜ Not started | Dashboard, Demo Data, Polish |

See **[📋 Planning](Planning)** for detailed task tracking.

## Getting Started

1. Ensure Docker Desktop and DDEV are installed
2. Clone the repo and run `ddev start`
3. Run setup scripts to configure Drupal content model:
   ```powershell
   ddev drush scr scripts/create_training_module_type.php
   ddev drush scr scripts/create_quiz_webform.php
   ddev drush scr scripts/seed_training_content.php
   ddev drush scr scripts/configure_cors.php
   ```
4. Read the [💬 Chat Log](ChatLog) for full setup history and architecture decisions

## Local Development

After initial setup, boot all services (DDEV, .NET API, Angular) with one command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

| URL | Service |
| :--- | :--- |
| `http://localhost:4200` | Angular SPA (dashboard, modules, quiz, results) |
| `http://localhost:5000/health` | .NET API health check |
| `http://drupalpoc.ddev.site` | Drupal admin UI |

The script verifies Docker health, starts DDEV, launches the .NET API, checks npm dependencies, and starts the Angular dev server — with logs written to `scripts/logs/`.

**If Docker Desktop freezes** (containers unresponsive, pipe errors), use the clean restart script instead of Task Manager:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-docker.ps1
```

This kills orphaned processes, gracefully quits Docker Desktop, clears the WSL2 distro, and restarts cleanly. See the [README](../README.md#troubleshooting-docker-desktop) for full details.

To stop: close the .NET API window, then run `ddev stop`.
