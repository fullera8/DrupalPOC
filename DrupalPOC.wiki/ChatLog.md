# DrupalPOC Chat Log

**[DOCUMENT_METADATA: PURPOSE=Technical_Deep_Dive,Architecture_Decisions,Setup_History | TARGET_AUDIENCE=Developers,LLMs | CONTAINS=Real_World_Debugging,Environment_Setup,Architecture_Planning | RESPONDS_TO: Debugging_Troubleshooting, Implementation_How-To, Architectural_Decision]**

## Project Overview
**[METADATA: CONCEPTS=Drupal,Security_Awareness_Training,Microservices,Decoupled_Drupal | DIFFICULTY=Beginner | PREREQUISITES=None]**

**Application:** Security Awareness Training Platform for the Texas State University System (TSUS)
**Scale:** 100,000–120,000 users across multiple TSUS institutions
**Comparable Products:** KnowBe4, Proofpoint Security Awareness Training
**Lead Developer Background:** Lead software engineer at a large Wall Street financial firm. ~10 years enterprise experience. Strong professional in Angular, .NET, SQL, CI/CD, IIS, Docker. No prior Drupal experience.

**Platform Pivot (Mar 2026):** Originally scoped as a general-purpose LMS (Canvas/Blackboard competitor). Refined to a **security awareness training platform** focused on phishing simulations, security training modules, and compliance reporting. User scale and multi-institution scope remain the same.

**[LLM_CONTEXT: The developer is highly experienced in enterprise full-stack development but new to Drupal specifically. Tailor Drupal-specific guidance at beginner level while keeping infrastructure/architecture discussions at professional level. This is a security training platform, NOT a general LMS — content is security-focused (phishing sims, compliance training, threat awareness).]**

---

## Environment Setup & Initial Project Bootstrapping
**[SECTION_METADATA: CONCEPTS=DDEV,Drupal_11,Composer,Drush,Docker | DIFFICULTY=Beginner | TOOLS=DDEV,Composer,Drush,Docker_Desktop,PowerShell | RESPONDS_TO: Implementation_How-To]**

### DDEV + Drupal Installation (Feb 2026)
**[DIFFICULTY: Beginner] [CONCEPTS: DDEV, Drupal, Composer, Drush]**

Project was bootstrapped from an external PowerShell terminal using DDEV (Docker-based local development):

1. **DDEV Configuration:**
   ```powershell
   cd Repos\DrupalPOC
   ddev config --project-type=drupal --docroot=web --create-docroot
   ```
   Created `.ddev/config.yaml` targeting `web/` as the docroot.

2. **DDEV Start:** `ddev start` — pulled Docker images (webserver, MariaDB 11.8, Traefik router, SSH agent). Site accessible at `http://drupalpoc.ddev.site`.

3. **Drupal Installation via Composer:**
   ```powershell
   ddev composer create drupal/recommended-project
   ```
   Installed Drupal 11.3.3 with 62 packages (Symfony 7.4.x, Twig 3.22, Guzzle 7.10, etc.).

4. **Drush Installation:**
   ```powershell
   ddev composer require drush/drush
   ```
   Installed Drush 13.7.1 with 21 additional packages.

5. **Site Install:**
   ```powershell
   ddev drush site:install --account-name=admin --account-pass=admin -y
   ```
   Dropped all tables and performed fresh Drupal installation.

6. **Launch:** `ddev launch` — opened site in browser.

**Key DDEV Commands:**
| Command | Purpose |
| :--- | :--- |
| `ddev start` | Resume project (use this 99% of the time) |
| `ddev stop` | Stop current project containers |
| `ddev poweroff` | Stop ALL DDEV projects |
| `ddev launch` | Open site in browser |
| `ddev drush site:install` | **Nuclear option** — wipes database and reinstalls from scratch |

**[LLM_CONTEXT: `ddev drush site:install` destroys the database. Never run it to simply restart the site. Use `ddev start` + `ddev launch` for normal development resumption.]**

---

## Git & GitHub Setup
**[SECTION_METADATA: CONCEPTS=Git,GitHub,Gitignore,Version_Control | DIFFICULTY=Beginner | TOOLS=Git,GitHub | RESPONDS_TO: Implementation_How-To]**

### Repository Initialization (Feb 2026)
**[DIFFICULTY: Beginner] [CONCEPTS: Git, GitHub, Gitignore]**

**Repository:** [fullera8/DrupalPOC](https://github.com/fullera8/DrupalPOC) (private)
**Branch:** `main`

**Initial Problem:** `git add .` staged 10,000+ files because `/vendor/` and `/web/core/` (Composer-managed dependencies) were not excluded.

**Solution:** Created a comprehensive `.gitignore`:

```gitignore
# Composer Dependencies
/vendor/
/web/core/
/web/modules/contrib/
/web/themes/contrib/
/web/profiles/contrib/
/web/libraries/

# DDEV Local Config
.ddev/.global_commands/
.ddev/db_snapshots/
.ddev/.ssh-auth-compose-full.yaml
.ddev/.homeadditions/
.ddev/commands/
.ddev/config.local.yaml
.ddev/docker-compose.override.yaml
.ddev/mutagen/
.ddev/traefik/
.ddev/mysql_history
.ddev/bash_history

# Drupal Sensitive Files
/web/sites/*/settings.php
/web/sites/*/settings.local.php
/web/sites/*/services.yml
/web/sites/*/files/
/web/sites/*/private/

# Environment & OS
.env
.env.local
.DS_Store
Thumbs.db
```

**Key Principle:** Anything Composer can re-download (`vendor/`, `web/core/`, `contrib/`) should NOT be in Git. Only track: `composer.json`, `composer.lock`, custom code, scaffolding config, and DDEV config.

**Push Workflow:**
```powershell
git init
git add .
git commit -m "Initial commit with proper .gitignore"
git remote add origin https://github.com/fullera8/DrupalPOC.git
git branch -M main
git push -u origin main
```

**Reset Tip:** If files were staged before `.gitignore` was correct, run `git reset` to un-stage, then `git add .` again.

**[LLM_CONTEXT: The .gitignore excludes Composer-managed code (vendor, core, contrib) and sensitive settings (settings.php). A clean Drupal repo typically has <50 tracked files. If the user reports thousands of staged files, check .gitignore coverage.]**

---

## Architecture Decisions
**[SECTION_METADATA: CONCEPTS=DDEV,WAMP,Microservices,Monolith,Decoupled_Drupal | DIFFICULTY=Intermediate | RESPONDS_TO: Architectural_Decision]**

### WAMP vs DDEV (Decision: DDEV)
**[DIFFICULTY: Beginner] [ARCHITECTURE_DECISIONS: Local_Development_Stack]**

**Decision:** Do NOT install WAMP alongside DDEV. They are redundant.

| Factor | DDEV | WAMP |
| :--- | :--- | :--- |
| **Environment** | Linux containers (matches production) | Windows native (diverges from production) |
| **Isolation** | High — contained in Docker | Low — global Windows installation |
| **Multi-project** | Easy — per-project PHP/DB versions | Hard — single global version |
| **Port conflicts** | Managed per-project | Conflicts with DDEV on 80/3306 |

**[LLM_CONTEXT: DDEV is the modern Drupal standard. If user asks about WAMP, XAMPP, or MAMP, redirect to DDEV. Installing both causes port conflicts.]**

### Monolith vs Microservices (Decision: Decoupled Drupal)
**[DIFFICULTY: Intermediate] [ARCHITECTURE_DECISIONS: System_Architecture]**

**Question:** Can DDEV support microservice architecture?
**Answer:** Yes. DDEV runs on Docker, which is inherently modular. However, DDEV is for **local development only** — production scaling happens on AKS/Kubernetes.

**DDEV supports:**
- Multiple containers per project (web, db, redis, solr, node)
- Multiple DDEV projects communicating via internal Docker network
- Custom `docker-compose.override.yml` for additional services

**Production scaling is separate** — handled by AKS with horizontal pod autoscaling.

---

## Proposed Security Training Platform Architecture (Decoupled Drupal)
**[SECTION_METADATA: CONCEPTS=Decoupled_Drupal,Angular,DotNet8,AKS,Azure,Microservices,Security_Awareness_Training | DIFFICULTY=Intermediate-Advanced | PREREQUISITES=DDEV_Setup | RESPONDS_TO: Architectural_Decision, Implementation_How-To]**

### System Architecture (Planned — Mar 2026)
**[DIFFICULTY: Advanced] [CONCEPTS: Decoupled_Drupal, JSON_API, Angular, .NET_8, AKS, Azure, Phishing_Simulation, LTI_1.3]**

```
Azure Front Door (CDN + WAF)
├── Angular SPA (Student/Faculty Training UI) — 2-4 replicas, HPA
├── Drupal 11 Headless CMS (Admin/Editor UI) — 2 replicas
│   └── Exposes training content via JSON:API
├── .NET 8 Web API (API Gateway + Business Logic) — 3-6 replicas, HPA
│   ├── Authentication (Azure AD / Entra ID — institutional SSO)
│   ├── Simulation engine (phishing campaigns, social engineering)
│   ├── Assessment scoring + auto-grading
│   ├── Analytics aggregation + compliance reporting
│   ├── LTI 1.3 provider (integration with institutional LMS)
│   └── Aggregates Drupal JSON:API + SQL Server data
├── Azure SQL Server (transactional: scores, completions, simulation results, tenant data)
├── Azure Database for MySQL (Drupal content store)
├── Redis (session management + caching)
├── Solr or Elasticsearch (training module search)
└── Azure Blob Storage (training videos, simulation assets, reports)
```

**Role Separation:**
| Service | Responsibility | Accessed By |
| :--- | :--- | :--- |
| **Angular SPA** | Student/faculty training experience (modules, simulations, quizzes, dashboard) | End users |
| **Drupal CMS** | Content authoring (training modules, simulation templates, course pages) | Admins/editors only |
| **.NET 8 API** | Business logic, simulation engine, assessment scoring, analytics, LTI 1.3, auth | Angular frontend |
| **Azure SQL** | Transactional data (scores, completions, simulation results, tenant config) | .NET API |
| **MySQL** | Drupal content storage | Drupal only |
| **Redis** | Session + cache | .NET API + Drupal |
| **Search Engine** | Training module discovery, content search | .NET API |
| **Blob Storage** | Training videos, simulation assets, exported reports | .NET API + Angular |

### AKS Deployment Target (Planned)
```
AKS Cluster
├── Namespace: drupal-lms-prod
│   ├── Deployment: angular-frontend (HPA)
│   ├── Deployment: dotnet-api (HPA)
│   ├── Deployment: drupal-cms
│   ├── Deployment: redis
│   ├── Deployment: solr
│   ├── Service: ingress-nginx
│   └── CronJob: drupal-cron
├── Azure SQL Server (managed)
├── Azure Database for MySQL (managed)
├── Azure Blob Storage
└── Azure Front Door
```

**CI/CD Pipeline (Planned):** GitHub Actions → GHCR → AKS (OIDC auth to Azure, GHCR for image storage, AKS for deployment)

**[LLM_CONTEXT: This is the FULL-SCALE target architecture. For the POC architecture (what we're actually building in <1 week), see [Architecture.md](Architecture). The POC simplifies the .NET API to a thin stub, uses GoPhish for phishing sims, and defers Azure AD, LTI 1.3, Redis, Solr, and multi-tenancy.]**

---

## POC Architecture & Build Strategy (Mar 2026)
**[SECTION_METADATA: CONCEPTS=POC,GoPhish,Build_vs_Borrow,AKS,Azure_SQL | DIFFICULTY=Intermediate | RESPONDS_TO: Architectural_Decision, Implementation_How-To]**

### POC Pivot Decision
**[DIFFICULTY: Intermediate] [ARCHITECTURE_DECISIONS: POC_Scope, Build_vs_Borrow]**

**Constraint:** < 1 week to build a pitch-ready demo.
**Strategy:** Heavily leverage free/open-source 3rd-party tools. Defer custom development. Prove the microservice pattern works on AKS with real Azure backing services.

**Critical requirement from stakeholder:** Azure SQL Server and AKS must be in the POC so the pitch can state: _"The microservice architecture is already deployed and working. We just need to scale it up."_

### Key POC Decisions

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| Phishing simulation engine | **GoPhish** (open source) | Full campaign engine with REST API + click tracking. Docker-ready. Deployed to AKS. |
| Training videos | **YouTube/Vimeo** (unlisted embeds) | No video infrastructure needed for POC |
| Quizzes/assessments | **Drupal Webform** module | Form builder with scoring. No custom quiz engine. |
| Discussion forums | **Drupal Forum** module (core) | Basic threaded discussions |
| Frontend components | **Angular Material** + **Chart.js/ngx-charts** | Pre-built UI kit + charting for dashboard |
| Email testing | **Mailhog** (DDEV built-in) | Captures GoPhish emails locally |
| .NET API | **Thin stub** (2–3 endpoints) | Proves microservice pattern: health check, save sim result, get scores |
| Auth | **Drupal built-in** | Azure AD deferred to post-POC |
| Data tier | **Azure SQL** (transactional) + **Azure MySQL** (Drupal) | Both real Azure managed services — proves multi-database pattern |

### Azure Resources to Provision
| Resource | Tier | Status |
| :--- | :--- | :--- |
| AKS Cluster | Free tier (B2s nodes) | Needs creation |
| Azure SQL Server + DB | Basic / DTU 5 | Needs creation |
| Azure Database for MySQL | Burstable B1ms | Needs creation |
| Resource Group | Existing | ✅ |
| Storage Account | Existing | ✅ |

### Deferred to Post-POC
Azure AD/SSO, LTI 1.3, multi-tenancy, Redis, Solr/Elasticsearch, Azure Blob Storage, full .NET business logic, auto-grading engine. Full 12-item backlog with checkboxes in **[📋 Planning](Planning)**.

**Full architecture diagram:** See **[🏗️ Architecture](Architecture)**
**Task tracking & timeline:** See **[📋 Planning](Planning)**

**[LLM_CONTEXT: The POC architecture is documented in Architecture.md with a Mermaid diagram. Key 3rd-party tools: GoPhish (phishing), Drupal Webform (quizzes), Angular Material (UI), Chart.js (dashboard), YouTube (videos), Mailhog (email capture). The .NET API is intentionally thin — do not suggest expanding it within the POC timeline. Azure SQL and AKS are non-negotiable for the pitch.]**

---

### Open Architecture Questions (Resolved — Mar 2026)
**[DIFFICULTY: Advanced] [CONCEPTS: SSO, LTI, Multi_Tenancy, Phishing_Simulation]**

All five blocking questions have been answered:

1. **Authentication Strategy: Azure Active Directory (Entra ID)**
   Institutional SSO via Azure AD. Familiar to the developer from enterprise work. Supports SAML/OIDC for higher-ed federation if needed later.

2. **LTI 1.3 Compliance: Yes, required.**
   The platform must act as an **LTI 1.3 provider** so institutions can embed security training within their existing LMS (Canvas, Blackboard, etc.). Implementation will live in the .NET 8 API layer.

3. **Content Scope (Security Training Focus):**
   | Content Type | Managed By | Notes |
   | :--- | :--- | :--- |
   | Learning modules (3–10 min videos) | Drupal (content) + Blob Storage (video) | Short-form security awareness training |
   | Phishing & social engineering simulations | .NET API (simulation engine) + Drupal (templates) | Simulated attack campaigns with click tracking |
   | Assessments & quizzes | .NET API (scoring) + Drupal (question content) | Auto-graded knowledge verification |
   | Course pages & syllabi | Drupal | Structured training curricula |
   | Discussion forums / collaboration | .NET API + Angular | Peer interaction on security topics |
   | Reporting & analytics dashboard | .NET API + Angular | Per-tenant compliance tracking, completion rates, simulation results |

4. **Migration: Not needed for POC.**
   No existing data to import. Clean-slate development.

5. **Multi-Tenancy: Single platform with tenant isolation (Option B).**
   One AKS deployment serves all TSUS institutions. Data is isolated per institution via tenant ID in Azure SQL. Drupal content can be shared or tenant-scoped. This avoids the operational overhead of separate deployments per school while maintaining data boundaries.

**[LLM_CONTEXT: All blocking architecture questions are now resolved. The platform is a security awareness training system (KnowBe4-style), not a general LMS. Key implementation priorities: (1) Azure AD SSO, (2) phishing simulation engine in .NET, (3) LTI 1.3 provider in .NET, (4) tenant isolation in Azure SQL, (5) Drupal headless content modeling for training modules. Do not ask these questions again.]**

---

## Wiki Documentation System (Mar 2026)
**[SECTION_METADATA: CONCEPTS=Wiki,Documentation,Metadata,LLM_Context,Tiered_Documentation | DIFFICULTY=Beginner | RESPONDS_TO: Implementation_How-To]**

### Documentation Structure Decision
**[DIFFICULTY: Beginner] [CONCEPTS: Wiki, Documentation, Tiered_System]**

**Decision:** Adopt a tiered documentation pattern for the DrupalPOC wiki, optimized for LLM-assisted development.

Created a `DrupalPOC.wiki/` directory with 5 documents:

| Document | Purpose |
| :--- | :--- |
| **[Home](Home)** | Navigation hub — project overview, tech stack, links to all other docs |
| **[Architecture](Architecture)** | POC architecture diagram (Mermaid), service inventory, build-vs-borrow strategy, deferred features |
| **[Planning](Planning)** | Day-by-day task breakdown with checkboxes, Azure provisioning checklist, risk register, post-POC backlog |
| **[ChatLog](ChatLog)** | Running conversation log — setup history, architecture decisions, debugging |
| **[Metadata-Legend](Metadata-Legend)** | Tag definitions for LLM interpretation (schema v1.1) |

### Key Documentation Decisions

- **Architecture vs Planning Separation:** Architecture.md contains *what* we're building (diagrams, design decisions, service inventory). Planning.md contains *when/how* we're building it (task checkboxes, day-by-day plan, risk register). This separation keeps architecture decisions stable while planning can be updated frequently as tasks are completed.
- **Mermaid Diagrams:** Used Mermaid `graph TB` for the POC architecture diagram in Architecture.md. Renders natively on GitHub wiki pages.
- **Checkbox Task Tracking:** Planning.md uses GitHub-flavored Markdown checkboxes (`- [ ]` / `- [x]`) for tracking POC implementation progress. The developer updates these as work progresses during the 5-day sprint.
- **Metadata Tags:** Metadata schema v1.1 with DrupalPOC-specific tags: `Security_Awareness_Training`, `Phishing_Simulation`, `LTI_1.3`, `Azure_AD`, `Compliance_Reporting`, plus 8 architecture decision tags with resolved decisions.
- **Cross-References:** Home.md links to Architecture + Planning. Architecture.md links to Planning for task details. Planning.md links to Architecture for design context. All docs use relative wiki links.

**[LLM_CONTEXT: The wiki has 5 documents. For architecture decisions, reference Architecture.md. For task status and next steps, reference Planning.md. For conversation history, reference ChatLog.md. Home.md is the navigation hub. Metadata-Legend.md defines the metadata tags used throughout all documents.]**

---

## POC Architecture Finalization (Mar 2026)
**[SECTION_METADATA: CONCEPTS=Mermaid,Service_Inventory,Data_Flow,CI_CD,Build_vs_Borrow | DIFFICULTY=Intermediate | RESPONDS_TO: Architectural_Decision]**

### Mermaid Diagram & Service Inventory
**[DIFFICULTY: Intermediate] [CONCEPTS: Mermaid, AKS, Microservices, JSON_API, GoPhish]**

**Decision:** Created a comprehensive POC architecture diagram in Architecture.md using Mermaid `graph TB`. The diagram visualizes 4 service tiers within AKS, plus Azure managed services, external services, and local dev tools.

**AKS Service Tiers:**

| Tier | Service | Backing Store | POC Scope |
| :--- | :--- | :--- | :--- |
| Frontend | Angular SPA (Angular Material + Chart.js) | — | Training module viewer, quiz UI, basic dashboard |
| API | .NET 8 Web API (thin stub) | Azure SQL Server | Health check, save result, get scores (2–3 endpoints) |
| CMS | Drupal 11 Headless (JSON:API + Webform) | Azure MySQL | Content types for training modules + quizzes |
| Simulation | GoPhish (phishing campaigns) | SQLite (internal) | Basic campaign with click tracking via REST API |

**Data Flow (Finalized):**
```
Angular SPA
  → Drupal JSON:API    (training content, quizzes)     → Azure MySQL
  → .NET 8 REST API    (scores, completions)            → Azure SQL
  → GoPhish REST API   (campaign results, click tracking)
  → YouTube/Vimeo      (embedded iframes for videos)
```

**CI/CD Pipeline:** GitHub Actions → build Docker images → push to GHCR → deploy to AKS (OIDC auth to Azure).

### Build-vs-Borrow Strategy (Finalized)
**[DIFFICULTY: Intermediate] [ARCHITECTURE_DECISIONS: Build_vs_Borrow]**

**Principle:** Borrow everything possible. Only build the minimum custom code to prove the microservice pattern.

| Component | Strategy | Tool/Approach |
| :--- | :--- | :--- |
| Content management | **Borrow** | Drupal 11 JSON:API (core) |
| Quizzes/assessments | **Borrow** | Drupal Webform module |
| Phishing simulations | **Borrow** | GoPhish (open source, Apache 2.0) |
| Training videos | **Borrow** | YouTube/Vimeo unlisted embeds |
| Email testing | **Borrow** | Mailhog (DDEV built-in) |
| Discussion forums | **Borrow** | Drupal Forum module (core) |
| Frontend UI | **Borrow** | Angular Material |
| Dashboard charts | **Borrow** | Chart.js / ngx-charts |
| Business logic API | **Build** (thin) | .NET 8 Web API (2–3 endpoints) |
| Container images | **Build** | Dockerfiles + multi-stage builds |
| CI/CD pipeline | **Build** | GitHub Actions → GHCR → AKS |
| AKS manifests | **Build** | Kubernetes YAML / Helm |

**Result:** 8 components borrowed, 4 built. This keeps custom development to ~20% of the POC effort.

**Full diagram and tables:** See **[🏗️ Architecture](Architecture)**

**[LLM_CONTEXT: The POC has 4 services in AKS (Angular, .NET, Drupal, GoPhish). The .NET API is intentionally thin — do not expand it within the POC. GoPhish is the "wow factor" for the pitch. The build-vs-borrow ratio is ~20% build / 80% borrow. The Mermaid diagram in Architecture.md is the authoritative architecture reference.]**

---

## POC Implementation Planning (Mar 2026)
**[SECTION_METADATA: CONCEPTS=Planning,Task_Tracking,Risk_Register,Azure_Provisioning,Sprint_Planning | DIFFICULTY=Intermediate | RESPONDS_TO: Implementation_How-To]**

### Day-by-Day Implementation Plan
**[DIFFICULTY: Intermediate] [CONCEPTS: Sprint_Planning, Azure, AKS, Drupal, Angular, .NET, GoPhish]**

**Decision:** Created a 5-day implementation plan in Planning.md with granular task checkboxes (~40 individual tasks).

| Day | Focus | Key Deliverables |
| :--- | :--- | :--- |
| **Day 1** | Infrastructure + Drupal content modeling | AKS cluster, Azure SQL + MySQL, Drupal content types, JSON:API verified |
| **Day 2** | Dockerfiles + container registry | 4 Docker images (Angular, .NET, Drupal, GoPhish) built and pushed to GHCR |
| **Day 3** | AKS deployment + .NET thin API | K8s manifests for all services, .NET API with 3 endpoints, all pods running |
| **Day 4** | Angular frontend + integrations | SPA connected to Drupal JSON:API, .NET API, GoPhish; quiz component; video embedding |
| **Day 5** | Dashboard, demo data, polish | Chart.js visualizations, seeded data across all stores, end-to-end walkthrough, screenshots |

### Azure Provisioning Checklist

| Status | Resource | Tier | Cost |
| :--- | :--- | :--- | :--- |
| ✅ | Resource Group | Existing | — |
| ✅ | Storage Account | Existing | — |
| ⬜ | AKS Cluster | Free tier (1 node pool, B2s VMs) | ~$0 (free tier) |
| ⬜ | Azure SQL Server + `drupalpoc` DB | Basic / DTU 5 | ~$5/mo |
| ⬜ | Azure Database for MySQL + `drupal` DB | Burstable B1ms | ~$6/mo |
| ⬜ | GHCR Image Pull Secret | AKS secret | — |

### Risk Register

Identified 6 key risks for the POC timeline:

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| AKS provisioning delays | Medium | **High** | Fall back to DDEV local dev; deploy to AKS on Day 2–3 |
| Azure SQL connectivity issues | Low | Medium | Use DDEV MariaDB as fallback; swap connection string later |
| GoPhish Docker image issues | Low | Medium | Use pre-built Docker Hub image |
| Drupal JSON:API CORS issues | **High** | Low | Configure CORS in `services.yml` or use nginx proxy |
| Angular ↔ multi-service auth | Medium | Low | No auth for POC; all endpoints open |
| Timeline overrun | Medium | Medium | Cut dashboard charts first; focus on working data flow |

**Highest-risk day:** Day 1 (Azure provisioning). If AKS creation blocks, mitigation is to continue Drupal content modeling locally with DDEV and deploy to AKS on Day 2–3.

**Highest-likelihood risk:** Drupal JSON:API CORS issues. Have the `services.yml` CORS fix ready before Day 4 Angular integration.

### Post-POC Backlog

12 deferred features documented in Planning.md with checkboxes:
- Azure AD / Entra ID SSO integration
- LTI 1.3 provider implementation (.NET API)
- Multi-tenancy with per-institution tenant isolation
- Full .NET business logic (scoring engine, analytics, enrollment)
- Redis caching layer, Solr/Elasticsearch, Azure Blob Storage
- HPA, GitHub Actions CI/CD, TLS, monitoring

**Full task lists with checkboxes:** See **[📋 Planning](Planning)**

**[LLM_CONTEXT: The POC is planned as a 5-day sprint. Day 1 is highest risk (Azure provisioning). All task progress is tracked via checkboxes in Planning.md — if the developer asks "what's next?", check Planning.md for the first unchecked item. Do not add deferred features back into POC scope. The risk register identifies CORS issues as the highest-likelihood risk and AKS provisioning as the highest-impact risk.]**

---

## Docker Troubleshooting
**[SECTION_METADATA: CONCEPTS=Docker_Desktop,DDEV,WSL2,Named_Pipes | DIFFICULTY=Beginner-Intermediate | RESPONDS_TO: Debugging_Troubleshooting]**

### DDEV Cannot Communicate with Docker (Feb 2026)
**[DIFFICULTY: Intermediate] [DEBUGGING_PATTERNS: Docker_Connectivity]**

**Symptom:** DDEV fails to start because it cannot reach Docker.

**Troubleshooting Steps (in priority order):**

1. **Docker Desktop running?** Check system tray for whale icon. If missing, launch Docker Desktop and wait for it to stabilize.

2. **Restart Docker:** Right-click tray icon → Restart.

3. **Docker Context:** Run `docker context ls`. The `*` should be next to `default`. Fix with `docker context use default`.

4. **Named Pipe error (`npipe:////./pipe/docker_engine`):** Open PowerShell as Admin → `wsl --shutdown` → restart Docker Desktop.

5. **WSL2 Integration:** Docker Desktop → Settings → Resources → WSL Integration → ensure default distro integration is enabled.

6. **Nuclear option:** Docker Desktop → Settings → Troubleshoot → Reset to Factory Defaults. (Warning: destroys containers and databases, but code files on disk are safe.)

**[LLM_CONTEXT: Steps 1-2 resolve 90% of DDEV-Docker communication issues on Windows. Step 4 (wsl --shutdown) is the most common fix for persistent pipe errors. Step 6 destroys the Drupal database — user would need to re-run site:install.]**

---

## Proven Patterns & Prior Art
**[SECTION_METADATA: CONCEPTS=DotNet8,Angular,Docker,AKS,CI_CD | DIFFICULTY=Beginner | RESPONDS_TO: Simple_Factual]**

DrupalPOC reuses established enterprise patterns from the developer's prior work:

| Component | Established Pattern | DrupalPOC Adaptation |
| :--- | :--- | :--- |
| Backend API | .NET 8 MVC in Docker (multi-stage build) | .NET 8 Web API (thin JSON gateway) |
| Frontend | Angular SPA in Docker (Node build → Nginx serve) | Angular SPA (student/faculty training UI) |
| Containerization | Docker multi-stage builds | Same pattern, plus Drupal container |
| Registry | GHCR (GitHub Container Registry) | Same |
| Orchestration | AKS with OIDC auth from GitHub Actions | Same (expanded for Drupal + GoPhish) |
| CI/CD | GitHub Actions → GHCR → AKS | Same pipeline structure |
| Dev Environment | VS Code Dev Containers | DDEV (Docker-based, Drupal-optimized) |

**[LLM_CONTEXT: The developer has enterprise experience with .NET 8, Angular, Docker, GHCR, AKS, and GitHub Actions CI/CD. These are proven patterns — do not suggest alternative tools for these components unless the developer asks. The DrupalPOC adaptations extend these patterns with Drupal and GoPhish containers.]**

---

## Day 1 Kickoff — Pre-Implementation Q&A (Mar 4, 2026)
**[SECTION_METADATA: CONCEPTS=Azure_Provisioning,Drupal_Content_Modeling,GoPhish,Docker,CORS,Working_Agreement | DIFFICULTY=Beginner | RESPONDS_TO: Implementation_How-To, Architectural_Decision]**

### Clarifying Questions & Decisions

Before starting Day 1 implementation, the following questions were raised and resolved:

| # | Topic | Question | Decision |
| :--- | :--- | :--- | :--- |
| 1 | **Azure provisioning** | Ready to provision AKS, SQL, MySQL today? | **Yes.** Developer is familiar with Azure. Co-developer (LLM) provides abstracted guidance; developer asks for detail only when needed. |
| 2 | **Drupal content modeling — who drives?** | Walk-through vs. pair vs. LLM-driven? | **LLM drives the coding.** Developer acts as engineering manager for the POC. Will learn where possible but prioritizes velocity. |
| 3 | **GoPhish — Docker Hub image vs. custom build?** | Use pre-built image or build from source? | **Docker Hub image (`gophish/gophish`).** Avoid local installation. Aligns with "no works-on-my-machine" philosophy. |
| 4 | **Angular version** | Pin specific version or use latest? | **Latest stable from Docker.** Less concerned with exact version; compatibility with 3rd-party tools is the priority. |
| 5 | **.NET 8 SDK** | Installed locally? Need Docker image? | **.NET 8 installed locally.** Will also use Docker image for containerization. Developer's core skill set — low risk. Defer detailed .NET discussion to Day 3. |
| 6 | **CORS prep for Day 4** | Pre-configure Drupal CORS in `services.yml` now? | **Yes, but minimal.** Get it working enough to avoid starting from scratch on Day 4. Don't over-engineer. |

### Working Agreement

- **Developer role:** Engineering manager. Reviews, approves, executes Azure provisioning commands, asks clarifying questions.
- **LLM role:** Co-developer. Drives Drupal content modeling, writes code/config, provides Azure provisioning guidance.
- **Drupal-specific guidance:** Beginner-level (developer has no Drupal experience).
- **Infrastructure/architecture guidance:** Peer-level (developer has ~10 years enterprise experience).
- **Docker philosophy:** All services run from container images. No local installations beyond Docker Desktop, DDEV, and core SDKs (.NET 8, Angular CLI).

**[LLM_CONTEXT: The developer is acting as engineering manager during the POC — LLM drives the code. Azure instructions should be abstracted (high-level steps, not screenshot-by-screenshot) unless the developer asks for detail. .NET is deferred to Day 3 and is low risk. GoPhish uses the official Docker Hub image. CORS config should be minimal — just enough to unblock Day 4 Angular integration.]**

---

## Day 1 Implementation — Drupal Content Modeling + Azure Provisioning (Mar 4, 2026)
**[SECTION_METADATA: CONCEPTS=Drupal,JSON_API,Webform,Content_Modeling,Azure_CLI,CORS,DDEV | DIFFICULTY=Beginner-Intermediate | TOOLS=DDEV,Drush,Composer,Azure_CLI | RESPONDS_TO: Implementation_How-To, Debugging_Troubleshooting]**

### Azure CLI Containerization
**[DIFFICULTY: Intermediate] [CONCEPTS: Azure_CLI, Docker, DDEV]**

**Decision:** Run Azure CLI from a Docker container (`mcr.microsoft.com/azure-cli:latest`) instead of installing locally.

Created `.ddev/docker-compose.azure-cli.yaml` to add an Azure CLI sidecar service to DDEV:
- **Image:** `mcr.microsoft.com/azure-cli:latest` from Microsoft Container Registry
- **Persistent volume:** `azure-cli-config` → `/root/.azure` (login state survives restarts)
- **Project mount:** `/mnt/project` for file access
- **Usage:** `ddev exec -s azure-cli az <command>` or `ddev ssh -s azure-cli`

**[LLM_CONTEXT: Azure CLI now runs as a DDEV sidecar container. All `az` commands should be prefixed with `ddev exec -s azure-cli`. Login state persists across `ddev restart` via a named Docker volume.]**

### Azure Resource Provisioning (Developer-Driven)
**[DIFFICULTY: Intermediate] [CONCEPTS: AKS, Azure_SQL, Azure_MySQL, Azure_Provisioning]**

Azure CLI commands provided for provisioning in this order:
1. `az login` → authenticate
2. `az group list` → identify existing resource group + location
3. `az aks create` → AKS cluster (free tier, 1 node, B2s, `--no-wait`)
4. `az sql server create` + `az sql db create` → Azure SQL (Basic/DTU 5)
5. `az sql server firewall-rule create` → allow local dev IP
6. `az mysql flexible-server create` + `az mysql flexible-server db create` → Azure MySQL (Burstable B1ms)
7. `az aks get-credentials` + `kubectl get nodes` → verify AKS
8. Database connectivity verification

**Status:** Developer provisioning Azure resources in parallel with Drupal work.

### Drupal Content Modeling (LLM-Driven)
**[DIFFICULTY: Beginner] [CONCEPTS: Drupal, JSON_API, Webform, Content_Modeling, CORS]**

All Drupal content modeling was performed via Drush scripts in `scripts/`. This approach avoids PowerShell-to-bash quoting issues and makes the setup repeatable/idempotent.

#### Step 1: Enable JSON:API Module
```powershell
ddev drush en jsonapi serialization -y
```
JSON:API is in Drupal 11 core but not enabled by default. Enabled along with its `serialization` dependency.

#### Step 2: Install Webform Module
```powershell
ddev composer require drupal/webform:6.3.x-dev -W
ddev drush en webform -y
```
**Note:** Webform does not yet have a stable release for Drupal 11. The `6.3.x-dev` branch supports Drupal 11 (locked at commit `13ce2a6`). The `-W` flag allows Composer to update Symfony dependencies (minor bumps from 7.4.4/7.4.5 → 7.4.6).

#### Step 3: Create Training Module Content Type
**Script:** `scripts/create_training_module_type.php`

Created the `training_module` content type with these fields:

| Field | Machine Name | Type | Notes |
| :--- | :--- | :--- | :--- |
| Title | `title` | String (core) | Built into all content types |
| Description | `field_description` | Long text (`text_long`) | Module summary/overview |
| Video URL | `field_video_url` | Link (`link`) | YouTube/Vimeo embed URL |
| Category | `field_category` | Entity reference → `training_category` taxonomy | Multi-value (unlimited cardinality) |
| Difficulty | `field_difficulty` | List (string) | Values: `beginner`, `intermediate`, `advanced` |
| Duration | `field_duration` | Integer (unsigned) | Estimated minutes to complete |

Also created `training_category` taxonomy vocabulary with 6 seed terms:
- Phishing Awareness
- Social Engineering
- Password Hygiene
- Data Handling & Privacy
- Incident Reporting
- Physical Security

#### Step 4: Create Phishing Awareness Quiz
**Script:** `scripts/create_quiz_webform.php`

Created webform `phishing_awareness_quiz` with 5 multiple-choice questions + Twig-computed scoring:

| Question | Topic | Correct Answer |
| :--- | :--- | :--- |
| Q1 | Suspicious password verification email | C — Report and don't click |
| Q2 | Common phishing indicators | C — Slightly different sender domain |
| Q3 | Definition of spear phishing | B — Targeted attack |
| Q4 | Urgent bank verification email | B — Call bank directly |
| Q5 | Identifying phishing URLs | B — Subdomain impersonation |

#### Step 5: Seed Sample Training Content
**Script:** `scripts/seed_training_content.php`

Created 3 training modules:

| nid | Title | Category | Difficulty | Duration |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Recognizing Phishing Emails | Phishing Awareness | Beginner | 5 min |
| 2 | Social Engineering: Manipulation Tactics | Social Engineering | Intermediate | 8 min |
| 3 | Password Best Practices & MFA | Password Hygiene | Beginner | 6 min |

Each module has a description, YouTube video URL, category reference, difficulty, and duration.

#### Step 6: Verify JSON:API Endpoints
**Endpoint:** `http://drupalpoc.ddev.site/jsonapi/node/training_module`

Verified: JSON:API returns all 3 training modules with full attributes (`title`, `field_description`, `field_difficulty`, `field_duration`, `field_video_url`) and relationships (`field_category`, `node_type`, `uid`).

**JSON:API response format:** `{ "jsonapi": {...}, "data": [{ "type": "node--training_module", "id": "<uuid>", "attributes": {...}, "relationships": {...} }] }`

#### Step 7: CORS Configuration
**Script:** `scripts/configure_cors.php`

Copied `default.services.yml` → `services.yml` and enabled CORS:

| Setting | Value | Rationale |
| :--- | :--- | :--- |
| `enabled` | `true` | Required for cross-origin Angular SPA |
| `allowedHeaders` | Content-Type, Authorization, X-Requested-With, Accept | Standard API headers |
| `allowedMethods` | GET, POST, PATCH, DELETE, OPTIONS | Full CRUD + preflight |
| `allowedOrigins` | `*` | **POC only** — lock down in production |
| `exposedHeaders` | Content-Type, Authorization | Angular needs these in responses |
| `maxAge` | 600 | 10-minute preflight cache |
| `supportsCredentials` | `true` | Allows cookies/auth headers |

**Verified:** CORS headers present on JSON:API response with `Origin: http://localhost:4200` → `Access-Control-Allow-Origin: http://localhost:4200` ✅

### Scripts Created

All scripts are idempotent (safe to re-run) and live in `scripts/`:

| Script | Purpose |
| :--- | :--- |
| `create_training_module_type.php` | Content type + fields + taxonomy vocabulary + seed terms |
| `create_quiz_webform.php` | Phishing awareness quiz (5 questions + scoring) |
| `seed_training_content.php` | 3 sample training modules |
| `configure_cors.php` | CORS configuration in `services.yml` |

**Run all:** `ddev drush scr scripts/<filename>.php`

**[LLM_CONTEXT: All Day 1 Drupal tasks are complete. The Training Module content type has 6 fields (title, description, video_url, category, difficulty, duration). JSON:API is confirmed working at `/jsonapi/node/training_module`. CORS is enabled with permissive wildcard origins (POC only). Webform quiz is created with 5 multiple-choice questions. All setup scripts are in `scripts/` and are idempotent.]**

---

### Azure Resource Provisioning (Mar 4–5, 2026)
**[DIFFICULTY: Intermediate] [CONCEPTS: AKS, Azure_SQL, Azure_MySQL, Azure_Provisioning, Azure_CLI, Docker]**

#### Azure CLI Containerization Decision

**Decision:** Run all Azure CLI commands from a Docker container (`mcr.microsoft.com/azure-cli:latest`) via DDEV sidecar, not from a local installation.

Created `.ddev/docker-compose.azure-cli.yaml`:
- **Image:** `mcr.microsoft.com/azure-cli:latest` (MCR)
- **Entrypoint:** Installs `kubectl` + `kubelogin` via `az aks install-cli` at container startup
- **Persistent volumes:** `azure-cli-config` (login state at `/root/.azure`) + `kube-config` (kubeconfig at `/root/.kube`)
- **Usage:** `ddev exec -s azure-cli az <command>` or `ddev exec -s azure-cli kubectl <command>`

**[LLM_CONTEXT: All `az` and `kubectl` commands run inside the azure-cli DDEV sidecar container. Login state and kubeconfig persist across `ddev restart` via named Docker volumes. Do not suggest running `az` or `kubectl` from the host machine.]**

#### Resource Provider Registration

Azure subscriptions require resource providers to be registered before first use. The following providers were registered:

| Provider Namespace | Required By |
| :--- | :--- |
| `Microsoft.ContainerService` | AKS cluster |
| `Microsoft.Sql` | Azure SQL Server + Database |
| `Microsoft.DBforMySQL` | Azure MySQL Flexible Server |
| `Microsoft.Network` | VNets, load balancers, public IPs (AKS + DB networking) |
| `Microsoft.Storage` | Storage account |
| `Microsoft.Compute` | AKS node VMs |
| `Microsoft.OperationsManagement` | AKS monitoring dependency |
| `Microsoft.OperationalInsights` | AKS Log Analytics dependency |

```powershell
ddev exec -s azure-cli az provider register --namespace <namespace>
ddev exec -s azure-cli az provider show --namespace <namespace> --query registrationState
```

**[LLM_CONTEXT: All 8 resource providers are registered. If a new Azure resource type is needed and creation fails with `MissingSubscriptionRegistration`, register the namespace first with `az provider register --namespace <namespace>`.]**

#### AKS Cluster Provisioning

| Setting | Value |
| :--- | :--- |
| **Name** | `drupalpoc-aks` |
| **Resource Group** | `rg-fulleralex47-0403` |
| **Location** | `eastus2` |
| **Node Count** | 1 |
| **VM Size** | `Standard_B2s` |
| **Tier** | Free |
| **Kubernetes Version** | v1.33.6 |
| **Status** | ✅ Succeeded |

```powershell
ddev exec -s azure-cli az aks create \
  --resource-group <rg> --name drupalpoc-aks \
  --node-count 1 --node-vm-size Standard_B2s \
  --tier free --generate-ssh-keys --location eastus2 --no-wait
```

**Verification:**
```powershell
ddev exec -s azure-cli az aks get-credentials --resource-group <rg> --name drupalpoc-aks
ddev exec -s azure-cli kubectl get nodes
# Output: aks-nodepool1-*   Ready   <none>   v1.33.6
```

#### Azure SQL Server + Database

| Setting | Value |
| :--- | :--- |
| **Server Name** | `drupalpoc-sql` |
| **FQDN** | `***REDACTED_SQL_HOST***` |
| **Location** | `centralus` |
| **Database** | `drupalpoc` |
| **Edition** | Basic (DTU 5) |
| **Cost** | ~$5/mo |
| **Status** | ✅ Online |

**Region Issue:** `eastus2` was not accepting new SQL Server creation (capacity constraints). Switched to `centralus`. Cross-region latency is negligible for the POC — the resource group location (`eastus2`) is just a logical container and does not constrain resource placement.

**Naming Conflict:** Initial creation partially provisioned a server in `eastus2`. Azure held a soft-delete lock on the `drupalpoc-sql` name. Resolved by deleting the partial server (`az sql server delete --yes`) and recreating in `centralus`.

**Firewall:** A firewall rule (`AllowLocalDev`) was created to allow the developer's current public IP. This is a dynamic IP — if connectivity breaks, re-check with `curl api.ipify.org` and update the rule.

#### Azure Database for MySQL Flexible Server

| Setting | Value |
| :--- | :--- |
| **Server Name** | `drupalpoc-mysql` |
| **FQDN** | `***REDACTED_MYSQL_HOST***` |
| **Location** | `centralus` |
| **Database** | `drupal` |
| **SKU** | `Standard_B1ms` (Burstable) |
| **Cost** | ~$6/mo |
| **Status** | ✅ Ready |

**Public Access:** Configured with the developer's current public IP at creation time.

#### Final Azure Resource Inventory

| Resource | Type | Location | Status |
| :--- | :--- | :--- | :--- |
| `rg-fulleralex47-0403` | Resource Group | `eastus2` | ✅ Existing |
| `drupalpoc-aks` | AKS Cluster (Free, 1x B2s) | `eastus2` | ✅ Succeeded |
| `drupalpoc-sql` | Azure SQL Server | `centralus` | ✅ Online |
| `drupalpoc` (database) | Azure SQL Database (Basic DTU 5) | `centralus` | ✅ Online |
| `drupalpoc-mysql` | MySQL Flexible Server (B1ms) | `centralus` | ✅ Ready |
| `drupal` (database) | MySQL Database | `centralus` | ✅ Ready |

**Note:** AKS is in `eastus2`, databases are in `centralus` due to capacity constraints. This split is irrelevant for the POC. Production would co-locate all resources.

#### Issues Encountered & Resolutions

| Issue | Error | Resolution |
| :--- | :--- | :--- |
| Resource providers not registered | `MissingSubscriptionRegistration` | Registered all 8 required providers via `az provider register` |
| SQL Server region capacity | `RegionDoesNotAllowProvisioning` in `eastus2` | Switched to `centralus` |
| SQL Server naming conflict | `InvalidResourceLocation` (partial create in `eastus2`) | Deleted partial server, recreated in `centralus` |
| `kubectl` not found in azure-cli container | `command not found` | Added `az aks install-cli` to container entrypoint + `kube-config` volume |
| `kubectl` host machine can't reach AKS | `dial tcp [::1]:8080: connectex: connection refused` | `az aks get-credentials` ran inside container; kubeconfig was not on host. All `kubectl` commands now run via `ddev exec -s azure-cli kubectl` |
| `rdbms-connect` extension needs `pg_config` | `psycopg2` build failure | Skipped `rdbms-connect`; verified DB status via `az sql db show --query status` and `az mysql flexible-server show --query state` instead |

**[LLM_CONTEXT: All Azure resources are provisioned and verified. AKS is in eastus2, SQL and MySQL are in centralus. All `az` and `kubectl` commands run inside the DDEV azure-cli sidecar. The developer's public IP is dynamic — if DB connectivity breaks, update the firewall rules. Credentials are stored securely and NOT logged in the ChatLog. For connection strings on Day 2-3, use FQDNs: `***REDACTED_SQL_HOST***` (SQL) and `***REDACTED_MYSQL_HOST***` (MySQL).]**

---

## Day 2 — Dockerfiles + Container Registry (Mar 5, 2026)
**[SECTION_METADATA: CONCEPTS=Docker,Dockerfile,GHCR,Drupal,Angular,DotNet8,GoPhish,Nginx,PHP_FPM,Multi_Stage_Build | DIFFICULTY=Intermediate | TOOLS=Docker,Docker_Desktop,PowerShell | RESPONDS_TO: Implementation_How-To]**

### Planning & Clarifications

**Day 2 Goal:** Create production-oriented Dockerfiles for all 4 services, build locally, push to GHCR (`ghcr.io/fullera8/drupalpoc-*`).

#### Clarifying Questions & Decisions

| # | Question | Decision | Rationale |
| :--- | :--- | :--- | :--- |
| 1 | **Scaffold Angular/.NET projects today?** | **No** — Dockerfiles only. Placeholder stubs to containerize. Pull scaffolding forward only if time allows. | Stay focused on Day 2 scope (Dockerfiles + Registry). Scaffolding is Day 3/4 work. |
| 2 | **Drupal base image: `drupal:11` official vs `php-fpm` + nginx?** | **`php:8.4-fpm` + nginx (multi-stage Composer install)** | POC's selling point is the microservice architecture. The closer to production, the better. Official `drupal:11` image hides too much and uses Apache. |
| 3 | **GoPhish: custom Dockerfile or upstream image?** | **Upstream `gophish/gophish` as-is** — no custom config. | No config work planned until go-live. Wrap in a thin Dockerfile only if GHCR tagging requires it. |
| 4 | **GHCR PAT (Personal Access Token)?** | **Check existing PAT first** — may already have one with `write:packages`. | Avoid unnecessary token regeneration. |
| 5 | **Build environment?** | **Local `docker build`** — manual push to GHCR. | CI/CD (GitHub Actions) is post-POC. Local builds are fine for a 4-image POC. |
| 6 | **Drupal DB connection to Azure MySQL?** | **Wire it in now** — environment variables for `***REDACTED_MYSQL_HOST***` baked into the image config (values injected at runtime). | Avoids rework on Day 3. Connection string uses env vars so secrets stay out of the image. |

#### Build Order (by complexity)

1. **GoPhish** — simplest (upstream image, tag and push)
2. **.NET 8 Web API** — proven pattern (multi-stage SDK → runtime), minimal placeholder project
3. **Angular SPA** — proven pattern (Node build → nginx serve), minimal placeholder project
4. **Drupal 11** — most complex (PHP 8.4-FPM + nginx + Composer + custom modules + Azure MySQL config)

#### Image Naming Convention

All images pushed to GHCR under `ghcr.io/fullera8/`:

| Service | Image Name | Tag |
| :--- | :--- | :--- |
| GoPhish | `ghcr.io/fullera8/drupalpoc-gophish` | `latest` |
| .NET 8 API | `ghcr.io/fullera8/drupalpoc-api` | `latest` |
| Angular SPA | `ghcr.io/fullera8/drupalpoc-angular` | `latest` |
| Drupal 11 | `ghcr.io/fullera8/drupalpoc-drupal` | `latest` |

**[LLM_CONTEXT: Day 2 decisions are RESOLVED. Drupal uses php:8.4-fpm + nginx (NOT the official drupal:11 image). GoPhish uses the upstream image unmodified. Angular and .NET get placeholder stubs only — full scaffolding is Day 3-4. All images are built locally with `docker build` and pushed manually to GHCR. The AKS image pull secret is Day 3 scope. Do not suggest CI/CD automation or GitHub Actions for Day 2.]**

### Dockerfile Creation & Image Builds

#### Directory Structure

```
docker/
├── angular/
│   ├── Dockerfile         # Multi-stage: Node 22 build → Nginx serve
│   └── nginx.conf         # SPA routing + /healthz endpoint
├── api/
│   └── Dockerfile         # Multi-stage: .NET 8 SDK build → ASP.NET runtime
├── drupal/
│   ├── Dockerfile         # Multi-stage: Composer install → PHP 8.4-FPM → Nginx
│   ├── nginx.conf         # Drupal front-controller + PHP-FPM proxy + /healthz
│   └── settings.php       # Production settings — Azure MySQL via env vars
└── gophish/
    └── Dockerfile         # FROM gophish/gophish:latest (upstream, unmodified)
```

#### GoPhish Dockerfile
Thin wrapper around `gophish/gophish:latest`. No custom config. Exists so we can tag consistently in GHCR and layer config overrides later (post-POC).

#### .NET 8 API Dockerfile (Placeholder)
Multi-stage build: `mcr.microsoft.com/dotnet/sdk:8.0` → `mcr.microsoft.com/dotnet/aspnet:8.0`. Expects source in `src/DrupalPOC.Api/`. Cannot build until Day 3 scaffolding.

#### Angular SPA Dockerfile (Placeholder)
Multi-stage build: `node:22-alpine` → `nginx:alpine`. Expects source in `src/angular/`. Includes custom `nginx.conf` with SPA fallback routing and `/healthz` health check. Cannot build until Day 4 scaffolding.

#### Drupal 11 Dockerfile (3-Stage Build)

**Architecture:** Three build stages in a single Dockerfile:

| Stage | Base Image | Purpose | Output |
| :--- | :--- | :--- | :--- |
| `composer` | `composer:2` | Install PHP deps via Composer, run `drupal:scaffold` | `/app/vendor/`, `/app/web/` |
| `drupal` | `php:8.4-fpm` | PHP-FPM runtime with extensions + Drupal code | `drupalpoc-drupal:latest` |
| `nginx` | `nginx:alpine` | Serve static assets, proxy `.php` to PHP-FPM | `drupalpoc-drupal-nginx:latest` |

**PHP Extensions Installed:**
`gd` (freetype+jpeg+webp), `opcache`, `pdo`, `pdo_mysql`, `zip`, `xml`, `mbstring`, `curl`

**Key Design Decisions:**
- `--ignore-platform-reqs` in Composer stage — the `composer:2` image doesn't have `ext-gd`; extensions are in the runtime stage
- `--no-scripts` first, then `composer drupal:scaffold` after copying full project — prevents Drupal scaffold from failing before `web/` exists
- Production `settings.php` reads ALL database config from environment variables (`DRUPAL_DB_HOST`, `DRUPAL_DB_PORT`, `DRUPAL_DB_NAME`, `DRUPAL_DB_USER`, `DRUPAL_DB_PASSWORD`, `DRUPAL_HASH_SALT`)
- Azure MySQL SSL certificate path is commented out in `settings.php` — enable for production hardening
- Drush 13.7.1 available in the container at `vendor/bin/drush`

**.dockerignore** created at project root to exclude `.git`, `.ddev`, wiki, markdown files, IDE config, and sensitive files (`settings.php`, `settings.ddev.php`) from the build context.

#### Build Results

| Image | Tag | Size | Status |
| :--- | :--- | :--- | :--- |
| `ghcr.io/fullera8/drupalpoc-gophish` | `latest` | 377 MB | ✅ Built |
| `ghcr.io/fullera8/drupalpoc-drupal` | `latest` | 1.25 GB | ✅ Built + tested |
| `ghcr.io/fullera8/drupalpoc-drupal-nginx` | `latest` | 420 MB | ✅ Built |
| `ghcr.io/fullera8/drupalpoc-api` | `latest` | — | ⏳ Dockerfile ready, needs Day 3 source |
| `ghcr.io/fullera8/drupalpoc-angular` | `latest` | — | ⏳ Dockerfile ready, needs Day 4 source |

**Smoke Test (Drupal image):**
- `php -m` confirms: `gd`, `pdo_mysql`, `opcache`, `mbstring`, `curl`, `zip`, `xml` ✅
- `vendor/bin/drush --version` → `Drush Commandline Tool 13.7.1.0` ✅

#### Build Issue & Resolution

| Issue | Error | Resolution |
| :--- | :--- | :--- |
| Composer stage missing `ext-gd` | `drupal/core 11.3.3 requires ext-gd * -> it is missing from your system` | Added `--ignore-platform-reqs` to Composer install — extensions are in the PHP-FPM runtime stage, not the Composer stage |

### GHCR Authentication

**Status:** No existing PAT or stored Docker credential found. `$env:CR_PAT` was not set, and `~/.docker/config.json` had no entry for `ghcr.io`.

**Required:** GitHub PAT (classic) with `write:packages` scope. Generate at: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic).

**Login command:**
```powershell
$env:CR_PAT = "ghp_your_token_here"
echo $env:CR_PAT | docker login ghcr.io -u fullera8 --password-stdin
```

**Result:** PAT generated, `docker login ghcr.io` succeeded.

### GHCR Push

All 3 built images pushed to GHCR and verified via `docker manifest inspect`:

| Image | Digest (sha256) | Status |
| :--- | :--- | :--- |
| `ghcr.io/fullera8/drupalpoc-gophish:latest` | `043a1f9fa369...` | ✅ Pushed |
| `ghcr.io/fullera8/drupalpoc-drupal:latest` | `fe54222ce39f...` | ✅ Pushed |
| `ghcr.io/fullera8/drupalpoc-drupal-nginx:latest` | `5c238cc726ec...` | ✅ Pushed |

**Push commands:**
```powershell
docker push ghcr.io/fullera8/drupalpoc-gophish:latest
docker push ghcr.io/fullera8/drupalpoc-drupal-nginx:latest
docker push ghcr.io/fullera8/drupalpoc-drupal:latest
```

### Day 2 Summary

| Task | Status |
| :--- | :--- |
| Create `docker/` directory structure | ✅ Complete |
| GoPhish Dockerfile | ✅ Built + pushed |
| .NET 8 API Dockerfile (placeholder) | ✅ Created (build on Day 3) |
| Angular SPA Dockerfile (placeholder) | ✅ Created (build on Day 4) |
| Drupal 11 Dockerfile (PHP-FPM + Nginx, 3-stage) | ✅ Built + pushed (2 images) |
| `.dockerignore` | ✅ Created |
| `docker/drupal/settings.php` (Azure MySQL via env vars) | ✅ Created |
| GHCR authentication | ✅ PAT configured, login succeeded |
| Push to GHCR | ✅ All 3 images verified in registry |

**[LLM_CONTEXT: Day 2 is COMPLETE. 3 of 5 images are built and pushed to GHCR. The .NET and Angular images have Dockerfiles ready but cannot be built until their source projects are scaffolded (Day 3-4). The Drupal image produces TWO containers: `drupalpoc-drupal` (PHP-FPM, port 9000) and `drupalpoc-drupal-nginx` (nginx, port 80). On AKS these will be sidecar containers in the same pod. The settings.php is configured for env-var injection — no secrets in the image. GHCR credentials are stored in Docker's credential manager. For Day 3: create AKS image pull secret for GHCR, scaffold .NET 8 project, build + push API image, write K8s deployment manifests.]**

---

## Day 3 — Pre-Implementation Discussions (Mar 6, 2026)
**[SECTION_METADATA: CONCEPTS=DotNet8,AKS,Docker,DDEV,PHP_FPM,Nginx,Project_Structure,Database_Architecture | DIFFICULTY=Beginner-Intermediate | RESPONDS_TO: Architectural_Decision, Implementation_How-To]**

### Where Does the .NET Source Project Live? (Decision: `src/DrupalPOC.Api/`)
**[DIFFICULTY: Beginner] [ARCHITECTURE_DECISIONS: Project_Structure, Source_Layout]**

**Question:** Should the .NET API source code live inside DDEV, or at the repo root?

**Decision:** The .NET source project goes at `src/DrupalPOC.Api/` in the **repo root**, not inside DDEV.

**Key Insight: DDEV Is Drupal's Container — Not Everyone's Container**

DDEV is a **purpose-built Docker environment for Drupal specifically**. When `ddev start` runs, it spins up:
- A **web container** (PHP 8.4 + Apache/nginx) that serves Drupal
- A **database container** (MariaDB 11.8) that stores Drupal content
- A **router** (Traefik) that maps `drupalpoc.ddev.site` to the web container
- Any **sidecar containers** added (like the Azure CLI container)

All of these are tuned for PHP/Drupal. DDEV doesn't know what .NET is, doesn't have the .NET SDK, and has no reason to.

**Each service has its own independent lifecycle:**

```
Repository Root (DrupalPOC/)
│
├── .ddev/                    ← DDEV config (Drupal's local dev environment)
├── web/                      ← Drupal webroot (Drupal's source code)
├── composer.json             ← Drupal's PHP dependencies
├── scripts/                  ← Drupal setup scripts
│
├── src/
│   ├── DrupalPOC.Api/        ← .NET 8 Web API (its own project, its own Dockerfile)
│   └── angular/              ← Angular SPA (its own project, its own Dockerfile)
│
├── docker/
│   ├── api/Dockerfile        ← Builds .NET into a container image
│   ├── angular/Dockerfile    ← Builds Angular into a container image
│   ├── drupal/Dockerfile     ← Builds Drupal into a container image
│   └── gophish/Dockerfile    ← Wraps GoPhish into a container image
│
└── k8s/                      ← Kubernetes manifests (Day 3)
```

**Why they're separated:**

1. **DDEV is a local development tool only** — it doesn't exist on AKS. It's how we run Drupal locally to author content and test JSON:API.
2. **.NET and Angular have their own SDKs** — the .NET 8 SDK is installed locally on the developer's Windows machine. The API is developed using `dotnet` CLI directly.
3. **Docker is the production equalizer** — when each Dockerfile builds, it packages the service into a self-contained image. DDEV, the local .NET SDK, Node.js — none of that matters in production. Only the images matter.

**How services communicate:**

| Environment | Drupal | .NET API | Angular |
| :--- | :--- | :--- | :--- |
| **Local dev** | `ddev start` → `http://drupalpoc.ddev.site` | `dotnet run` → `http://localhost:5000` | `ng serve` → `http://localhost:4200` |
| **AKS (production)** | K8s Service → `http://drupal-service:80` | K8s Service → `http://api-service:80` | K8s Service → `http://angular-service:80` |

Locally, they talk via HTTP on `localhost` with different ports. On AKS, they talk via Kubernetes DNS names. The Ingress controller routes external traffic to the right service based on URL path.

**[LLM_CONTEXT: RESOLVED. DDEV is Drupal-only. .NET source lives at `src/DrupalPOC.Api/`. Angular source lives at `src/angular/`. Each service has its own Dockerfile under `docker/`. K8s manifests go in `k8s/`. The .NET Dockerfile (`docker/api/Dockerfile`) expects `COPY` from `src/DrupalPOC.Api/`. Do not suggest putting .NET or Angular code inside DDEV or the Drupal webroot.]**

---

### Database Architecture — POC vs. Production
**[DIFFICULTY: Intermediate] [CONCEPTS: Azure_SQL, Database_Architecture, Budget_Planning] [ARCHITECTURE_DECISIONS: POC_Database_Schema]**

**Context:** The developer needs a realistic production database design for budget estimation and compute planning, while keeping the POC minimal.

#### POC Schema (What We Build on Day 3)

Minimal — one table, three endpoints, proves .NET ↔ Azure SQL end-to-end:

```
Azure SQL: drupalpoc database
└── SimulationResults table
    ├── Id              (int, PK, identity)
    ├── UserId          (nvarchar - who took the action)
    ├── CampaignId      (nvarchar - which phishing campaign / quiz)
    ├── Score           (int - percentage or points)
    ├── CompletedAt     (datetime2 - when they finished)
    └── CreatedAt       (datetime2 - record creation timestamp)
```

Three endpoints against it: `GET /health`, `POST /api/results` (save), `GET /api/scores` (read).

#### Production Schema Design (For Budget Document)

Post-POC, Azure SQL expands to support the full platform:

| Table / Domain | Purpose | Scale Estimate |
| :--- | :--- | :--- |
| **Tenants** | One row per TSUS institution (Sam Houston, Lamar, Sul Ross, etc.) | ~10 rows |
| **Users** | All students + faculty across all institutions. FK to Tenant. | 100,000–120,000 rows |
| **TrainingModules** | Metadata for training content (mirrors Drupal, .NET owns completion tracking) | ~50–200 rows |
| **Enrollments** | User × Module assignment (who needs to take what) | Millions (120K users × ~10 modules each) |
| **Completions** | User × Module completion record with timestamp and score | Millions (grows over time, never deleted) |
| **SimulationCampaigns** | Phishing campaign definitions (linked to GoPhish campaign IDs) | Hundreds |
| **SimulationResults** | Per-user result for each campaign (clicked? reported? ignored?) | Millions (120K users × multiple campaigns/year) |
| **QuizAttempts** | Per-user quiz attempt with individual answer records | Millions |
| **ComplianceSnapshots** | Periodic roll-up per tenant: completion rates, click rates, scores | Thousands (monthly snapshots per tenant) |
| **AuditLog** | Who did what, when (for compliance/regulatory) | Tens of millions over time |

#### Capacity Planning Notes

- **Storage growth rate:** ~120K users × ~4 campaigns/year × ~10 training modules ≈ 1.2M new completion rows + 480K simulation rows per year, plus audit logs.
- **Compute tier:** POC Basic DTU 5 (~5 transactions/sec). Production at 120K users during peak (semester start, compliance deadline) needs **Standard S3 (100 DTUs)** minimum, or **vCore General Purpose 4–8 vCores** for elasticity.
- **High availability:** Production needs geo-redundant backups and potentially a read replica for the reporting dashboard (heavy reads shouldn't impact transactional writes).
- **MySQL (Drupal):** Drupal's content volume is small (hundreds of nodes, not millions). Burstable B1ms is adequate even in production. Drupal's heavy lifting is content authoring, not transactional throughput.

**Full budget details:** See **[💰 Budget](Budget)**

**[LLM_CONTEXT: POC uses a single SimulationResults table in Azure SQL. Production schema has ~10 tables with million-row scale. The budget analysis is in Budget.md. Do not expand the POC schema beyond SimulationResults — keep it minimal to prove the pattern. The developer will use the production schema estimates for budget/compute planning in the pitch.]**

---

### Why Drupal Needs an Nginx Sidecar (PHP-FPM Architecture)
**[DIFFICULTY: Beginner] [CONCEPTS: PHP_FPM, Nginx, Drupal, Docker, Sidecar_Pattern] [ARCHITECTURE_DECISIONS: Drupal_Pod_Architecture]**

**Question:** Why does Drupal need an Nginx reverse proxy sidecar on AKS? Why can't PHP serve HTTP directly?

**Context:** The developer is experienced with .NET and Angular (both have built-in web servers) but unfamiliar with how PHP serves web requests. This was a critical knowledge gap.

#### .NET and Node.js: Built-in Web Servers

When you run a .NET API with `dotnet run`, the **Kestrel** web server starts up inside the application process. It listens on a port, accepts HTTP requests, routes them to controllers, and returns HTTP responses. Same with Node.js/Express or Angular's dev server. **The application IS the web server.**

#### PHP: No Built-in Production Web Server

PHP doesn't work that way. **PHP-FPM** (FastCGI Process Manager) is a process pool that:
- Sits in memory waiting for work
- Accepts requests **only via the FastCGI protocol** (not HTTP) on port 9000
- Processes the PHP file
- Returns the output back via FastCGI

**PHP-FPM cannot accept an HTTP request from a browser.** It speaks a different protocol. It needs something in front of it that:
1. Accepts the HTTP request from the browser/client
2. Decides if it's a PHP request or a static file (CSS, JS, images)
3. If PHP → forwards to PHP-FPM via FastCGI
4. If static → serves the file directly (much faster than PHP processing)
5. Returns the response to the client

**That "something in front" is Nginx.**

#### The .NET Analogy

| PHP World | .NET Equivalent |
| :--- | :--- |
| PHP-FPM (application runtime) | Kestrel (application runtime) |
| Nginx (reverse proxy in front) | IIS / Azure App Service reverse proxy (in front of Kestrel) |

The key difference: Kestrel *can* accept HTTP directly — PHP-FPM literally *cannot*. The Nginx sidecar isn't optional for Drupal; it's **architecturally required**.

#### Why Nginx + PHP-FPM (Not Apache)

| | Apache + mod_php | Nginx + PHP-FPM |
| :--- | :--- | :--- |
| **Architecture** | PHP lives inside Apache | PHP is a separate process pool |
| **Memory usage** | Every Apache worker loads PHP (even for static files) | Only PHP-FPM workers use PHP memory |
| **Static file performance** | Apache serves them, but with PHP overhead loaded | Nginx serves them natively, very fast |
| **Scaling** | Monolithic — Apache and PHP scale together | Can tune PHP-FPM pool size independently |
| **Production standard** | Legacy | Modern production standard for PHP |

The official `drupal:11` Docker image uses Apache. We chose `php:8.4-fpm` + nginx because it's the production-grade pattern and aligns with the microservice pitch (Day 2 architecture decision).

#### Sidecar Pattern on AKS

On AKS, the two containers share the same network and filesystem within a single pod:

```
┌──────────────────────────────────────────────────────────┐
│  Drupal Pod                                              │
│                                                          │
│  ┌──────────────────┐    ┌─────────────────────────────┐ │
│  │  nginx container  │    │  php-fpm container          │ │
│  │  (port 80)        │───▶│  (port 9000, FastCGI)       │ │
│  │                   │    │                             │ │
│  │  Serves static    │    │  Runs Drupal PHP code       │ │
│  │  files (CSS/JS)   │    │                             │ │
│  │                   │    │  Returns HTML/JSON to nginx  │ │
│  │  Routes *.php to  │    │                             │ │
│  │  PHP-FPM          │    │                             │ │
│  └──────────────────┘    └─────────────────────────────┘ │
│           │                        │                     │
│           └────── shared volume ───┘                     │
│                  (Drupal webroot via emptyDir)            │
└──────────────────────────────────────────────────────────┘
```

**Why sidecar (same pod), not separate Deployments:**
- They **must** share the filesystem — nginx needs to read Drupal's CSS/JS/image files directly, and needs the PHP files to know which ones to forward to FPM
- They **must** share the network — nginx talks to PHP-FPM on `localhost:9000` within the pod
- They scale together — you never want 3 nginx and 1 PHP-FPM, or vice versa

**[LLM_CONTEXT: RESOLVED. Drupal on AKS uses the sidecar container pattern: `drupalpoc-drupal` (PHP 8.4-FPM, port 9000) + `drupalpoc-drupal-nginx` (nginx, port 80) in the same pod, sharing an emptyDir volume for the Drupal webroot. PHP-FPM cannot accept HTTP — nginx is architecturally required. This is NOT optional. The K8s Deployment manifest for Drupal must define both containers in the same pod spec with a shared volume. The Kubernetes Service for Drupal should target port 80 (nginx), not port 9000 (PHP-FPM).]**

---

### Day 3 Decisions Summary
**[DIFFICULTY: Beginner] [ARCHITECTURE_DECISIONS: Day_3_Pre_Implementation]**

| # | Topic | Decision |
| :--- | :--- | :--- |
| 1 | .NET source location | `src/DrupalPOC.Api/` at repo root. DDEV is Drupal-only. |
| 2 | POC database schema | Single `SimulationResults` table in Azure SQL. Production schema documented in Budget.md for compute estimation. |
| 3 | Ingress strategy | Nginx ingress controller with path-based routing. Scaled load balancing deferred to post-POC. |
| 4 | Drupal pod architecture | Sidecar pattern: PHP-FPM + Nginx in same pod, shared emptyDir volume. Nginx is architecturally required (PHP-FPM cannot accept HTTP). |
| 5 | Build order | .NET scaffold first, then K8s manifests. Deploy all 4 services together. |
| 6 | TLS/hostname | Plain HTTP with AKS external IP for POC. Hostname on Day 5 if polish time allows. |

**[LLM_CONTEXT: All Day 3 pre-implementation decisions are resolved. .NET goes in `src/DrupalPOC.Api/`. POC DB is minimal (1 table). Drupal uses sidecar pod (PHP-FPM + Nginx). Nginx ingress for path-based routing. No TLS for POC. Build order: .NET scaffold → build/push image → K8s manifests → deploy all services.]**

---

## Day 3 — Implementation (Mar 7, 2026)
**[SECTION_METADATA: CONCEPTS=DotNet8,AKS,Kubernetes,Docker,EF_Core,Azure_SQL,GHCR | DIFFICULTY=Intermediate | RESPONDS_TO: Implementation_How-To]**

### .NET 8 Web API Scaffold
**[DIFFICULTY: Intermediate] [CONCEPTS: DotNet8, EF_Core, Azure_SQL, Minimal_APIs]**

#### Project Creation

Scaffolded from repo root using .NET 8.0.418 SDK:

```powershell
dotnet new webapi --name DrupalPOC.Api --output src/DrupalPOC.Api --framework net8.0
dotnet add src/DrupalPOC.Api package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.24
dotnet add src/DrupalPOC.Api package Microsoft.EntityFrameworkCore.Design --version 8.0.24
```

Deleted auto-generated `WeatherForecast.cs` and `DrupalPOC.Api.http` template files.

#### Architecture: Minimal APIs (No Controllers)

For a 3-endpoint POC, Minimal APIs are the right choice. No `Controllers/` folder, no base classes — endpoints are defined inline in `Program.cs`.

#### Source Files

| File | Purpose |
| :--- | :--- |
| `src/DrupalPOC.Api/DrupalPOC.Api.csproj` | .NET 8 project, EF Core 8.0.24 (SqlServer + Design) |
| `src/DrupalPOC.Api/Models/SimulationResult.cs` | EF Core entity: `Id`, `UserId`, `CampaignId`, `Score`, `CompletedAt`, `CreatedAt` |
| `src/DrupalPOC.Api/Data/AppDbContext.cs` | DbContext with single `DbSet<SimulationResult>` |
| `src/DrupalPOC.Api/Program.cs` | Service registration, middleware, 3 endpoints |
| `src/DrupalPOC.Api/appsettings.json` | Default config with placeholder connection string (tracked in git) |
| `src/DrupalPOC.Api/appsettings.Development.json` | Real Azure SQL credentials (.gitignored) |

#### Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns `{ status, service, timestamp }` — K8s liveness/readiness probe target |
| `POST` | `/api/results` | Saves a `SimulationResult` to Azure SQL, returns 201 + created entity |
| `GET` | `/api/scores` | Returns all results ordered by `CompletedAt` descending |

#### Key Design Decisions

| Decision | Rationale |
| :--- | :--- |
| `EnsureCreated()` on startup | Auto-creates `SimulationResults` table on first connection. No migrations needed for POC. |
| No `UseHttpsRedirection()` | TLS terminates at the AKS ingress controller. Container-to-container traffic is plain HTTP inside the cluster. |
| CORS: `AllowAnyOrigin/Method/Header` | Wide open for POC. Angular SPA on a different origin needs this. Lock down post-POC. |
| No silent DB fallback | If Azure SQL is unreachable, the app crashes immediately. No in-memory fallback — fail loudly. |
| Port 8080 in container, 5000 locally | ASP.NET 8 defaults to 8080 in Docker. Local dev uses `--urls http://localhost:5000`. |

#### Connection String Strategy

The .NET configuration system supports hierarchical overrides:

| Layer | File / Mechanism | Value |
| :--- | :--- | :--- |
| Default (baked into image) | `appsettings.json` | `Password=REPLACE_VIA_ENV_VAR` (placeholder) |
| Local dev | `appsettings.Development.json` (.gitignored) | Real Azure SQL credentials |
| AKS production | Env var `ConnectionStrings__DefaultConnection` | Injected from K8s Secret |

The double-underscore `__` in the env var name maps to the `:` separator in .NET's configuration hierarchy (`ConnectionStrings:DefaultConnection`).

#### Local Test Results

All 3 endpoints tested against live Azure SQL (`***REDACTED_SQL_HOST***`):

| Test | Result |
| :--- | :--- |
| `GET /health` | `{ "status": "healthy", "service": "drupalpoc-api", "timestamp": "2026-03-07T03:34:48Z" }` |
| `POST /api/results` (sample payload) | 201 — `{ "id": 1, "userId": "jdoe@txstate.edu", "campaignId": "camp-001", "score": 85 }` |
| `GET /api/scores` | Returns inserted row(s) ordered by `CompletedAt` desc |

`EnsureCreated()` successfully connected to Azure SQL and auto-created the `SimulationResults` table on first startup. Azure SQL firewall rule from Day 1 still active.

### Docker Image Build + Push (.NET API)
**[DIFFICULTY: Beginner] [CONCEPTS: Docker, GHCR, Multi_Stage_Build]**

Built using the Day 2 Dockerfile (`docker/api/Dockerfile`) — multi-stage: `sdk:8.0` → `aspnet:8.0`:

```powershell
docker build -t ghcr.io/fullera8/drupalpoc-api:latest -f docker/api/Dockerfile .
docker push ghcr.io/fullera8/drupalpoc-api:latest
```

Added `**/bin` and `**/obj` to `.dockerignore` to exclude .NET build artifacts from the Docker build context.

**All 4 GHCR images now available:**

| Image | Status |
| :--- | :--- |
| `ghcr.io/fullera8/drupalpoc-gophish:latest` | ✅ Pushed (Day 2) |
| `ghcr.io/fullera8/drupalpoc-drupal:latest` | ✅ Pushed (Day 2) |
| `ghcr.io/fullera8/drupalpoc-drupal-nginx:latest` | ✅ Pushed (Day 2) |
| `ghcr.io/fullera8/drupalpoc-api:latest` | ✅ Pushed (Day 3) |
| `ghcr.io/fullera8/drupalpoc-angular:latest` | ⏳ Day 4 |

### Kubernetes Manifests
**[DIFFICULTY: Intermediate-Advanced] [CONCEPTS: AKS, Kubernetes, Ingress, Sidecar_Pattern, Secrets]**

Created 8 manifest files in `k8s/`:

| File | Resources | Notes |
| :--- | :--- | :--- |
| `namespace.yaml` | `Namespace: drupalpoc` | All resources scoped to this namespace |
| `secrets.yaml` | `Secret: api-secrets`, `Secret: drupal-secrets` | Placeholder values — replace before applying. Includes `kubectl create` commands for CLI-based creation. |
| `configmaps.yaml` | `ConfigMap: drupal-nginx-conf`, `ConfigMap: angular-placeholder` | Nginx conf overrides `fastcgi_pass` for sidecar; Angular placeholder HTML |
| `api-deployment.yaml` | `Deployment: api`, `Service: api-service` | 1 replica, port 80→8080, connection string from Secret, health probes at `/health` |
| `drupal-deployment.yaml` | `Deployment: drupal`, `Service: drupal-service` | Sidecar pattern: php-fpm + nginx in one pod. Shared `emptyDir` for uploaded files. Nginx conf from ConfigMap. Health probes at `/healthz`. |
| `angular-deployment.yaml` | `Deployment: angular`, `Service: angular-service` | Uses `nginx:alpine` with placeholder page (ConfigMap). Swap to GHCR image on Day 4. |
| `gophish-deployment.yaml` | `Deployment: gophish`, `Service: gophish-service` | Ports 3333 (admin, HTTPS) + 8080 (phish). TCP probe (self-signed cert). Access via `kubectl port-forward`. |
| `ingress.yaml` | `Ingress: drupalpoc-ingress` | Nginx ingress, path-based routing: `/api`→api, `/health`→api, `/jsonapi`→drupal, `/`→angular |

#### Nginx ConfigMap Override (Sidecar Fix)

The baked-in Drupal nginx.conf uses `fastcgi_pass drupal:9000` (Docker Compose hostname). In a K8s sidecar pod, both containers share the same network namespace, so PHP-FPM is at `127.0.0.1:9000`. The `drupal-nginx-conf` ConfigMap provides the corrected config, mounted into the nginx container at `/etc/nginx/conf.d/default.conf`.

#### Ingress Routing

| Path | Service | Notes |
| :--- | :--- | :--- |
| `/api/*` | `api-service:80` | .NET API — `/api/results`, `/api/scores` |
| `/health` | `api-service:80` | .NET health check (exact match) |
| `/jsonapi/*` | `drupal-service:80` | Drupal JSON:API — headless content delivery |
| `/` (default) | `angular-service:80` | Angular SPA catch-all |

Admin-only services accessed via `kubectl port-forward`:
- **Drupal admin:** `kubectl port-forward -n drupalpoc svc/drupal-service 8080:80` → `http://localhost:8080/user/login`
- **GoPhish admin:** `kubectl port-forward -n drupalpoc svc/gophish-service 3333:3333` → `https://localhost:3333`

#### Deployment Command Sequence

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create GHCR image pull secret
kubectl create secret docker-registry ghcr-secret \
  --namespace=drupalpoc \
  --docker-server=ghcr.io \
  --docker-username=fullera8 \
  --docker-password=<GITHUB_PAT>

# 3. Create secrets (replace placeholder values first)
kubectl apply -f k8s/secrets.yaml

# 4. Create ConfigMaps
kubectl apply -f k8s/configmaps.yaml

# 5. Deploy services
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/drupal-deployment.yaml
kubectl apply -f k8s/angular-deployment.yaml
kubectl apply -f k8s/gophish-deployment.yaml

# 6. Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/cloud/deploy.yaml

# 7. Create ingress
kubectl apply -f k8s/ingress.yaml

# 8. Verify
kubectl get pods -n drupalpoc
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

**[LLM_CONTEXT: Day 3 implementation is complete. .NET API scaffolded, tested locally, Docker image built and pushed to GHCR (4 of 5 images now available). K8s manifests created for all 4 services + ingress. The manifests have NOT been applied to AKS yet — secrets need real values and the deployment commands need to be run via `ddev exec -s azure-cli`. The Drupal nginx ConfigMap fixes `fastcgi_pass` from Docker Compose hostname to `127.0.0.1:9000` for sidecar pod networking. Angular uses a placeholder `nginx:alpine` image until Day 4. GoPhish and Drupal admin are accessed via `kubectl port-forward` (not through ingress). Next steps: apply manifests to AKS, verify pods running, test external access via ingress IP.]**

---

### AKS Deployment (Mar 7, 2026)
**[SECTION_METADATA: CONCEPTS=AKS,Kubernetes,kubectl,Ingress,Secrets,GHCR | DIFFICULTY=Intermediate | TOOLS=DDEV,azure-cli_sidecar,kubectl | RESPONDS_TO: Implementation_How-To,Debugging_Troubleshooting]**

#### Mount Path Discovery

The azure-cli DDEV sidecar doesn't mount the project at `/var/www/html/` (that's the web container). Inspecting `.ddev/docker-compose.azure-cli.yaml` revealed:
```yaml
volumes:
  - ".:/mnt/ddev_config"
  - "../:/mnt/project"
```
K8s manifest files are accessible at `/mnt/project/k8s/` inside the sidecar container.

#### Deployment Execution

All commands ran via `ddev exec -s azure-cli <command>`:

1. **Namespace:** `kubectl apply -f /mnt/project/k8s/namespace.yaml` → `namespace/drupalpoc created`

2. **GHCR pull secret:** `kubectl create secret docker-registry ghcr-secret --namespace=drupalpoc --docker-server=ghcr.io --docker-username=fullera8 --docker-password=<PAT>` → `secret/ghcr-secret created`

3. **API secrets:** `kubectl create secret generic api-secrets --namespace=drupalpoc --from-literal=ConnectionStrings__DefaultConnection=<Azure SQL connection string>` → `secret/api-secrets created`

4. **Drupal secrets:** `kubectl create secret generic drupal-secrets --namespace=drupalpoc` with `--from-literal` for DRUPAL_DB_HOST, DRUPAL_DB_PORT, DRUPAL_DB_NAME, DRUPAL_DB_USER, DRUPAL_DB_PASSWORD, DRUPAL_HASH_SALT → `secret/drupal-secrets created`

5. **ConfigMaps:** `kubectl apply -f /mnt/project/k8s/configmaps.yaml` → `configmap/drupal-nginx-conf created`, `configmap/angular-placeholder created`

6. **Deployments + Services:**
   - `kubectl apply -f /mnt/project/k8s/api-deployment.yaml` → `deployment.apps/api created`, `service/api-service created`
   - `kubectl apply -f /mnt/project/k8s/drupal-deployment.yaml` → `deployment.apps/drupal created`, `service/drupal-service created`
   - `kubectl apply -f /mnt/project/k8s/angular-deployment.yaml` → `deployment.apps/angular created`, `service/angular-service created`
   - `kubectl apply -f /mnt/project/k8s/gophish-deployment.yaml` → `deployment.apps/gophish created`, `service/gophish-service created`

7. **Nginx ingress controller:** `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/cloud/deploy.yaml` → 19 resources created (namespace, serviceaccounts, RBAC, controller deployment, webhook)

8. **Ingress:** `kubectl apply -f /mnt/project/k8s/ingress.yaml` → `ingress.networking.k8s.io/drupalpoc-ingress created` (first attempt failed with webhook not ready; succeeded on retry after controller pod reached Running state)

#### Azure SQL Firewall Fix

API pod initially entered `CrashLoopBackOff`. Logs showed:
```
Cannot open server 'drupalpoc-sql' requested by the login.
Client with IP address '20.69.205.212' is not allowed to access the server.
```

Fix: Added AKS egress IP to Azure SQL firewall:
```bash
az sql server firewall-rule create --resource-group rg-fulleralex47-0403 \
  --server drupalpoc-sql --name AllowAKS \
  --start-ip-address 20.69.205.212 --end-ip-address 20.69.205.212
```
Deleted the crashing pod; replacement pod started successfully.

#### Final State — All 4 Pods Running

```
NAME                       READY   STATUS    RESTARTS   AGE
angular-77c66ff75d-m4tv8   1/1     Running   0          5m10s
api-5986fbfc66-tch7p       1/1     Running   0          43s
drupal-5d9f5777b7-549gm    2/2     Running   0          5m25s
gophish-d8dd44dd4-9g2pf    1/1     Running   0          4m59s
```

#### Ingress & Endpoint Verification

**External IP:** `20.85.112.48` (via `kubectl get svc -n ingress-nginx ingress-nginx-controller`)

| Endpoint | Result |
| :--- | :--- |
| `http://20.85.112.48/health` | `{"status":"healthy","service":"drupalpoc-api","timestamp":"..."}` ✅ |
| `http://20.85.112.48/api/scores` | `[{"id":1,"userId":"jdoe@txstate.edu","campaignId":"camp-001","score":85,...}]` ✅ |
| `http://20.85.112.48/` | Angular placeholder HTML ✅ |
| `http://20.85.112.48/jsonapi` | `500` — expected, Drupal needs install against Azure MySQL (Day 4) |

**[LLM_CONTEXT: AKS deployment is COMPLETE. All 4 services are running. The ingress external IP is 20.85.112.48. The .NET API is fully functional (connected to Azure SQL, all endpoints returning data). Drupal returns 500 because it needs a fresh install against Azure MySQL — this is expected and will be addressed when Drupal admin access is configured. Angular is serving the placeholder page. GoPhish is running but accessed via port-forward (not through ingress). The AKS cluster egress IP (20.69.205.212) was added to the Azure SQL firewall. Day 3 is now COMPLETE.]**

---

## Day 4 — Angular Frontend + Integrations (Mar 7, 2026)
**[SECTION_METADATA: CONCEPTS=Angular,DotNet8,Drupal,GoPhish,Docker,AKS,Webform | DIFFICULTY=Intermediate-Advanced | TOOLS=Angular_CLI,kubectl,ddev,Docker | RESPONDS_TO: Implementation_How-To, Architectural_Decision]**

### Day 4 Planning Discussion

**Angular Version Update:** Angular 21.x (latest stable, active status) selected over previously noted 19.x. Compatible with Node ^20.19.0 || ^22.12.0 || ^24.0.0, TypeScript >=5.9.0 <6.0.0, RxJS ^6.5.3 || ^7.4.0. Existing Dockerfile uses `node:22-alpine` — compatible. Will scaffold with `@angular/cli@21.0.0`.

**Drupal AKS MySQL — Prioritized First:** The Drupal pod on AKS returns 500 at `/jsonapi` because `site:install` has not been run against Azure MySQL. Decision: run `drush site:install` inside the Drupal pod on AKS, then re-run the 4 setup scripts (`create_training_module_type.php`, `create_quiz_webform.php`, `seed_training_content.php`, `configure_cors.php`). Local DDEV development is allowed for speed, but AKS Drupal must be operational before marking Drupal integration complete.

**GoPhish Campaign — Real Data Only:** A minimal real GoPhish campaign will be seeded via the GoPhish REST API. No mocking unless expressly permitted or for debugging purposes only.

**Webform REST Investigation:** The existing `drupal/webform` 6.3.x-dev package is installed. The team will first test whether Webform exposes quiz structure natively via JSON:API before adding the `webform_rest` module. If JSON:API cannot serve webform elements, `webform_rest` will be added via Composer.

**Agreed Day 4 Execution Order:**
1. Drupal AKS MySQL `site:install` + setup scripts → verify `/jsonapi/node/training_module` returns data
2. Angular 21 scaffold (Angular Material, Chart.js, routing, environment config, proxy)
3. Webform API investigation (JSON:API vs. `webform_rest`)
4. Drupal JSON:API integration — training module list + detail pages
5. .NET API integration — scores/results pages
6. GoPhish campaign seeding + Angular integration
7. Dashboard shell (Chart.js)
8. Docker build + GHCR push + AKS deploy

**[LLM_CONTEXT: Day 4 is in progress. Angular version is 21.x (NOT 19.x). The developer requires pair-programming discipline — every change must be discussed and approved before execution. No mocking of data — all integrations use real services. The Drupal AKS install is the critical first step.]**

### Phase 1: Drupal AKS MySQL site:install (Mar 7, 2026)
**[DIFFICULTY: Intermediate] [CONCEPTS: Drupal, Drush, AKS, Azure_MySQL, Kubernetes, Exec_Chain]**

#### Problem: Drupal Pod Returns 500 on `/jsonapi`

The Drupal pod on AKS (`drupal-5d9f5777b7-549gm`, 2/2 containers: `drupal` + `nginx`) was running but not functional. The `/jsonapi` endpoint returned HTTP 500 because `drush site:install` had never been run against Azure MySQL — only the local DDEV MariaDB had a Drupal install.

#### Obstacle 1: MySQL Firewall Blocking AKS Egress

**Symptom:** `drush site:install` hung with no output, then `Connection timed out` in Drupal pod logs.

**Root Cause:** Azure MySQL firewall had rules for the developer's local IP (`38.27.127.48`) but not the AKS cluster's egress IP (`20.69.205.212`).

**Fix:**
```powershell
ddev exec -s azure-cli az mysql flexible-server firewall-rule create \
  --resource-group rg-fulleralex47-0403 --name drupalpoc-mysql \
  --rule-name AllowAKS --start-ip-address 20.69.205.212 --end-ip-address 20.69.205.212
```

**Three IPs in Play (Clarification):**

| IP Address | What It Is | Used For |
| :--- | :--- | :--- |
| `38.27.127.48` | Developer's local public IP | Azure SQL/MySQL `AllowLocalDev` firewall rules |
| `20.69.205.212` | AKS cluster egress (outbound) IP | Azure SQL/MySQL `AllowAKS` firewall rules |
| `20.85.112.48` | AKS ingress (inbound) external IP | Browser access to services (`http://20.85.112.48/...`) |

#### Obstacle 2: Azure MySQL SSL Enforcement (`require_secure_transport=ON`)

**Symptom:** After fixing the firewall, `site:install` failed with SSL-related connection errors. Azure MySQL enforces `require_secure_transport=ON` by default.

**Options Considered:**
- **Option A:** Enable SSL in `settings.php` (uncomment PDO SSL lines), rebuild Drupal image, push to GHCR, redeploy to AKS
- **Option B:** Temporarily disable `require_secure_transport` on Azure MySQL, fix properly later

**Decision:** Option B — disable SSL enforcement now, rebuild with SSL at end of day if time permits.

```powershell
ddev exec -s azure-cli az mysql flexible-server parameter set \
  --resource-group rg-fulleralex47-0403 --server-name drupalpoc-mysql \
  --name require_secure_transport --value OFF
```

Result: `currentValue: OFF`, `isDynamicConfig: True` — immediate effect, no server restart needed.

**[DEFERRED: Re-enable `require_secure_transport=ON` + uncomment SSL lines in `docker/drupal/settings.php` + rebuild Drupal image during Phase 8 (Docker build & AKS deploy).]**

#### Obstacle 3: Exec Chain Output Swallowing / SIGINT

**Symptom:** Commands run via `ddev exec -s azure-cli kubectl exec -n drupalpoc <pod> -c drupal -- vendor/bin/drush ...` would hang, produce no visible output, or get interrupted with exit code 130 (SIGINT). The triple-nested exec chain (PowerShell → DDEV → kubectl → container) swallowed stdout and was unreliable for long-running commands.

**Workaround:** Base64-encode shell scripts in PowerShell (using single-quoted here-strings `@'...'@` to prevent `$?` interpolation), decode inside the pod, write to `/tmp/install.sh`, and run via `nohup` in the background. Poll `/tmp/install.log` for results.

```powershell
# PowerShell: encode script
$script = @'
#!/bin/sh
cd /var/www/html
vendor/bin/drush site:install standard --site-name='TSUS Security Training' --account-name=admin --account-pass=<PASSWORD> --yes >> /tmp/install.log 2>&1
echo "EXIT_CODE=$?" >> /tmp/install.log
'@
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($script))

# Deploy to pod, run in background
ddev exec -s azure-cli kubectl exec -n drupalpoc <pod> -c drupal -- \
  sh -c 'echo <base64> | base64 -d > /tmp/install.sh && chmod +x /tmp/install.sh && rm -f /tmp/install.log && nohup /tmp/install.sh &'

# Poll log
ddev exec -s azure-cli kubectl exec -n drupalpoc <pod> -c drupal -- cat /tmp/install.log
```

**[LLM_CONTEXT: The base64-encode-then-nohup pattern is the proven way to run long Drush commands inside the Drupal pod on AKS via the triple-nested exec chain. Direct `kubectl exec -- drush` commands are unreliable for operations that take >30s due to SIGINT and output swallowing. Always poll a log file for results.]**

#### Obstacle 4: Partial Install State

**Symptom:** After one `site:install` attempt was interrupted by SIGINT, retrying produced: _"To start over, you must empty your existing database and copy default.settings.php over settings.php."_

**Root Cause:** The interrupted install had created `config` and `key_value` tables in Azure MySQL. `drush sql:drop --yes` didn't fully clear them (or re-created them via Drupal bootstrap during the drop operation).

**Fix:** Manually dropped residual tables, then reran install:
```
drush sql:drop --yes              # Dropped most tables
drush sql:query "DROP TABLE config, key_value"   # Cleaned remaining 2
drush sql:query "SHOW TABLES"     # Verified: empty
```

Then ran the base64-encoded install script via nohup. The install completed successfully on the clean database.

#### site:install Success

Install log output:
```
[notice] Starting Drupal installation. This takes a while.
[notice] Performed install task: install_select_language
[notice] Performed install task: install_select_profile
[notice] Performed install task: install_load_profile
[notice] Performed install task: install_verify_requirements
[notice] Performed install task: install_verify_database_ready
[notice] Performed install task: install_base_system
[notice] Performed install task: install_bootstrap_full
[notice] Performed install task: install_profile_modules
[notice] Performed install task: install_profile_themes
[notice] Performed install task: install_install_profile
[notice] Performed install task: install_configure_form
[notice] Performed install task: install_finished
[success] Installation complete. (Admin)
EXIT_CODE=0
```

**Verification:**

| Check | Command | Result |
| :--- | :--- | :--- |
| Bootstrap | `drush status --fields=bootstrap` | `Drupal bootstrap: Successful` |
| Database | `drush sql:query "SHOW TABLES"` | 55 tables created |
| Admin user | `drush sql:query "SELECT uid, name, status FROM users_field_data WHERE uid=1"` | `1  admin  1` (active) |
| Site name | `drush config:get system.site name` | `'TSUS Security Training'` |

#### Module Enablement

```powershell
ddev exec -s azure-cli kubectl exec -n drupalpoc drupal-5d9f5777b7-549gm -c drupal -- \
  vendor/bin/drush en jsonapi serialization webform -y
```

Result:
```
[success] Module jsonapi has been installed. (Configure)
[success] Module serialization has been installed.
[success] Module webform has been installed. (Permissions - Configure)
```

#### Setup Scripts Execution

All 4 scripts ran via a combined background shell script (same base64-encode + nohup pattern):

| Script | Output | Exit Code |
| :--- | :--- | :--- |
| `create_training_module_type.php` | Content type + 5 fields + taxonomy vocab (6 terms) | `0` |
| `create_quiz_webform.php` | Phishing quiz (5 questions, answer key: Q1=c, Q2=c, Q3=b, Q4=b, Q5=b) | `0` |
| `seed_training_content.php` | 3 training modules (nid 1, 2, 3) | `0` |
| `configure_cors.php` | CORS enabled (wildcard origins, POC only) | `0` |

#### JSON:API Verification via AKS Ingress

**Endpoint:** `http://20.85.112.48/jsonapi/node/training_module`

**Result:** JSON:API returns all 3 training modules with full data:

| nid | Title | Difficulty | Duration | Category |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Recognizing Phishing Emails | beginner | 5 min | Phishing Awareness |
| 2 | Social Engineering: Manipulation Tactics | intermediate | 8 min | Social Engineering |
| 3 | Password Best Practices & MFA | beginner | 6 min | Password Hygiene |

All attributes populated: `title`, `field_description`, `field_difficulty`, `field_duration`, `field_video_url`, `field_category` (relationship).

#### Phase 1 Summary

| Step | Status |
| :--- | :--- |
| Azure MySQL firewall rule for AKS egress | ✅ `AllowAKS` (20.69.205.212) |
| Disable `require_secure_transport` (temporary) | ✅ `OFF` (dynamic, immediate) |
| `drush site:install standard` | ✅ `EXIT_CODE=0` |
| Enable jsonapi + serialization + webform modules | ✅ All 3 installed |
| `create_training_module_type.php` | ✅ Content type + fields + taxonomy |
| `create_quiz_webform.php` | ✅ 5-question phishing quiz |
| `seed_training_content.php` | ✅ 3 training modules |
| `configure_cors.php` | ✅ CORS configured |
| JSON:API endpoint verification | ✅ 3 modules returned via `http://20.85.112.48/jsonapi/node/training_module` |

**Drupal on AKS is fully operational.** The `/jsonapi` endpoint that was returning 500 now returns training module data. Phase 1 is complete.

**[LLM_CONTEXT: Drupal on AKS is fully installed and operational as of Day 4. The admin password is stored securely (not in the ChatLog). Azure MySQL `require_secure_transport` is OFF (temporary — re-enable during Phase 8). The base64-encode + nohup pattern is the proven method for running long Drush commands in the AKS pod. All 4 setup scripts are idempotent and have been run successfully against Azure MySQL. JSON:API is confirmed working at the AKS ingress IP. Phase 1 is COMPLETE — proceed to Phase 2 (Angular 21 scaffold).]**

### Phase 2: Angular 21 Scaffold (Mar 7, 2026)
**[DIFFICULTY: Intermediate] [CONCEPTS: Angular, Docker, Node, Angular_Material, Chart_JS]**

#### Containerized Angular Development — No Local Node/npm

**Architectural Decision:** Angular CLI, npm, and all Node.js tooling run exclusively inside `node:22-alpine` Docker containers via volume mounts — **not** installed on the host machine. This enforces the project's Day 1 principle: _"All services run from container images. No local installations beyond Docker Desktop, DDEV, and core SDKs."_

**Why containerize the Angular toolchain:**
- Zero local Node/npm/Angular CLI required — only Docker
- Consistent Node version (`node:22-alpine`) across dev and production
- Clone-and-go for new developers
- Bypasses the Windows PowerShell `Restricted` execution policy that blocks `npm.ps1`/`npx.ps1`/`ng.ps1` wrappers

**Known Tradeoff (Post-POC):** The `docker run --rm -v` approach writes `node_modules/` to the host volume. Post-POC improvement: use a named Docker volume or dev container so `node_modules` never lands on the host filesystem. Documented in Planning.md Post-POC Backlog.

#### Three Docker Commands for Angular Development

| Activity | Command | When |
| :--- | :--- | :--- |
| **Scaffold** | `docker run --rm -v "${PWD}/src/angular:/app" -w /app node:22-alpine sh -c "npx @angular/cli@21 new ..."` | Once |
| **Dev serve** | `docker run --rm --name angular-dev -v "${PWD}/src/angular:/app" -w /app -p 4200:4200 node:22-alpine sh -c "npx ng serve --host 0.0.0.0 --poll 2000"` | During dev |
| **Prod build** | Handled by existing `docker/angular/Dockerfile` (multi-stage: Node 22 build → Nginx serve) | Per deploy |

#### Scaffold Execution

**Command:**
```powershell
docker run --rm -v "${PWD}/src/angular:/app" -w /app node:22-alpine `
  sh -c "npx @angular/cli@21 new drupalpoc-angular --directory . --style=scss --routing --ssr=false --skip-git --skip-tests"
```

**Flags:**
- `--directory .` — scaffold directly into `src/angular/` (not a subdirectory)
- `--style=scss` — Angular Material works best with SCSS
- `--routing` — routes for dashboard, modules, quiz, results
- `--ssr=false` — SPA served by nginx, no server-side rendering
- `--skip-git` — parent repo already has git
- `--skip-tests` — POC velocity
- Project name `drupalpoc-angular` — matches Dockerfile's `COPY --from=build /app/dist/drupalpoc-angular/browser/`

**Result:** Angular CLI 21.2.1 scaffolded successfully. 22 files created.

#### Package Installation

```powershell
docker run --rm -v "${PWD}/src/angular:/app" -w /app node:22-alpine `
  sh -c "npm install @angular/material @angular/cdk @angular/animations chart.js --save"
```

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `@angular/material` | ^21.2.1 | UI component library |
| `@angular/cdk` | ^21.2.1 | Material dependency (Component Dev Kit) |
| `@angular/animations` | ^21.2.0 | Required by `provideAnimationsAsync()` |
| `chart.js` | ^4.5.1 | Dashboard charts (Day 5) |

**Note:** `@angular/animations` was not included in the default scaffold. The production build failed with `Could not resolve "@angular/animations/browser"` until it was installed separately.

#### App Configuration

**`app.config.ts`** — Added `provideHttpClient()` (for API calls) and `provideAnimationsAsync()` (for Material animations).

**`styles.scss`** — Added Material theme import (`@use '@angular/material' as mat`) and global body styles (Roboto font, zero margin, full height).

**`index.html`** — Updated title to "TSUS Security Training". Added Google Fonts CDN links for Roboto and Material Icons.

**`angular.json`** — Added `fileReplacements` in the production configuration to swap `environment.ts` → `environment.prod.ts` at build time.

#### Environment Configs

| File | `drupalBaseUrl` | `apiBaseUrl` | `gophishBaseUrl` |
| :--- | :--- | :--- | :--- |
| `environment.ts` (dev) | `http://localhost:8080` | `http://localhost:5000` | `http://localhost:3333` |
| `environment.prod.ts` | `/drupal` | `/api` | `/gophish` |

Production URLs use relative paths — the AKS nginx ingress handles path-based routing to each service.

#### App Shell (Angular Material)

Replaced the 325-line Angular placeholder HTML with a Material toolbar + sidenav layout:
- **Toolbar:** "TSUS Security Training" with hamburger menu toggle
- **Sidenav:** 4 navigation links with Material Icons — Dashboard, Training Modules, Quiz, Simulation Results
- **Content area:** `<router-outlet />` for routed components

#### Route Structure

| Path | Component | Purpose |
| :--- | :--- | :--- |
| `/` | Redirect → `/dashboard` | Default route |
| `/dashboard` | `DashboardComponent` | Compliance dashboard (Charts — Day 5) |
| `/modules` | `ModulesComponent` | Training module list (Drupal JSON:API — Phase 4) |
| `/quiz` | `QuizComponent` | Phishing quiz (Webform — Phase 3-4) |
| `/results` | `ResultsComponent` | Simulation results (GoPhish — Phase 6) |

All 4 page components are stubs with placeholder text. They will be fleshed out during Phases 4-7.

#### Dockerfile Alignment Fix

Updated [docker/angular/Dockerfile](docker/angular/Dockerfile) comment: `Angular 19` → `Angular 21` (line 33). The `COPY --from=build /app/dist/drupalpoc-angular/browser/` path was already correct and matches the Angular 21 output structure.

#### Production Build Verification

```powershell
docker run --rm -v "${PWD}/src/angular:/app" -w /app node:22-alpine `
  sh -c "npx ng build --configuration=production"
```

**Result:** `Application bundle generation complete. [15.432 seconds]`

| Chunk | Size (raw) | Size (transfer) |
| :--- | :--- | :--- |
| `main-JZDY5IBF.js` | 230.65 kB | 50.47 kB |
| `chunk-27ZACLTW.js` | 142.81 kB | 42.74 kB |
| `styles-E5R2EAIZ.css` | 82 bytes | 82 bytes |
| **Initial total** | **373.54 kB** | **93.30 kB** |

Output at `dist/drupalpoc-angular/browser/` — matches Dockerfile `COPY` path.

#### Dev Server Verification

```powershell
docker run --rm --name angular-dev -v "${PWD}/src/angular:/app" -w /app `
  -p 4200:4200 node:22-alpine sh -c "npx ng serve --host 0.0.0.0 --poll 2000"
```

Dev server compiled successfully: `Application bundle generation complete. [4.612 seconds]`. Accessible at `http://localhost:4200/`. Developer visually confirmed the Material toolbar + sidenav app shell renders correctly.

#### Phase 2 Summary

| Step | Status |
| :--- | :--- |
| Angular 21 scaffold via Docker | ✅ 22 files, project name `drupalpoc-angular` |
| Install Angular Material + CDK + Animations + Chart.js | ✅ 419 packages, 0 vulnerabilities |
| Material app shell (toolbar + sidenav + 4 routes) | ✅ Visually confirmed at `http://localhost:4200/` |
| Environment configs (dev + prod) | ✅ Created |
| Production build | ✅ 373.54 kB initial, output at `dist/drupalpoc-angular/browser/` |
| Dockerfile alignment | ✅ Comment updated, `COPY` path matches |

**Phase 2 is complete.** Angular 21 is scaffolded, building, and serving via containerized Node.js. Ready for Phase 3 (Webform API investigation).

**[LLM_CONTEXT: Angular 21 scaffold is complete. All Angular CLI/npm/Node operations run inside `node:22-alpine` Docker containers — nothing installed on the host. The project is at `src/angular/`, builds to `dist/drupalpoc-angular/browser/`, and the existing Dockerfile at `docker/angular/Dockerfile` is aligned. Four stub page components exist (dashboard, modules, quiz, results) with routes wired up. `provideHttpClient()` is configured in `app.config.ts` — ready for API integration. Environment configs point to localhost (dev) and relative paths (prod/AKS). Phase 2 is COMPLETE — proceed to Phase 3 (Webform API investigation).]**

---

### Phase 3: Webform REST API (Mar 7, 2026)
**[DIFFICULTY: Intermediate] [CONCEPTS: Drupal, Webform, REST_API, JSON_API, webform_rest, Angular_Integration]**

#### Investigation: Can JSON:API Serve Webform Quiz Structure?

**Question:** Does Drupal's built-in JSON:API expose webform element structure (questions, options, types) for Angular to render a quiz dynamically?

**Probes performed against AKS Drupal (`http://20.85.112.48`):**

| Endpoint | Result | Conclusion |
| :--- | :--- | :--- |
| `GET /jsonapi/webform/webform` | HTTP 200, `"data": []`, two webforms omitted ("Access to webform configuration is required") | JSON:API sees webforms as config entities but access-denied even for structure |
| `GET /jsonapi/webform_submission/webform_submission` | HTTP 404 (returned HTML page) | Webform submissions are NOT exposed via JSON:API at all |

**Conclusion:** JSON:API **cannot** serve webform quiz element structure. It treats webforms as config entities with restrictive access, and webform submissions are not JSON:API resources. A dedicated module is required.

#### Decision: Install `webform_rest` Module

**`drupal/webform_rest` 4.2.0** — provides REST resource plugins that expose webform elements, fields, and submission endpoints as proper Drupal REST resources.

**Why this module is required:**
- JSON:API returns empty `data: []` for webforms (access-denied for anonymous)
- JSON:API does not expose `webform_submission` as a resource at all
- `webform_rest` provides dedicated REST endpoints specifically designed for decoupled/headless quiz rendering
- It enables the core pitch: "Admins author quizzes in Drupal, trainees take them in Angular"

#### Local Validation First (DDEV)

Before touching AKS, the module was validated end-to-end on the local DDEV environment to isolate module/config issues from infrastructure issues.

**Installation:**
```powershell
ddev composer require drupal/webform_rest --no-interaction   # 4.2.0 installed
ddev drush en webform_rest -y                                # Enabled webform_rest + rest
```

**Key Discovery — REST Resources Must Be Explicitly Enabled:**

Installing and enabling `webform_rest` is NOT enough. The module provides REST resource *plugins*, but Drupal's REST framework requires explicit `RestResourceConfig` entities to register routes. Without this step, the endpoints return **404 "No route found"**.

Created `scripts/enable_webform_rest.php` to configure this programmatically:

```php
use Drupal\rest\Entity\RestResourceConfig;

$resources = [
  'webform_rest_elements' => ['GET' => ['supported_formats' => ['json'], 'supported_auth' => ['cookie']]],
  'webform_rest_fields'   => ['GET' => ['supported_formats' => ['json'], 'supported_auth' => ['cookie']]],
  'webform_rest_submit'   => ['POST' => ['supported_formats' => ['json'], 'supported_auth' => ['cookie']]],
];

// Create RestResourceConfig entities with method granularity
// Grant anonymous GET permissions for elements + fields
```

**Critical configuration details:**
- `granularity` must be `'method'` (not `'resource'`) — Drupal 11 throws `InvalidArgumentException: Invalid granularity specified` with `'resource'` granularity
- Anonymous role needs explicit `restful get webform_rest_elements` and `restful get webform_rest_fields` permissions
- The `?_format=json` query parameter is **required** on all requests — without it, Drupal doesn't know to return JSON

**Local test results:**

| Endpoint | HTTP | Result |
| :--- | :--- | :--- |
| `GET /webform_rest/phishing_awareness_quiz/elements?_format=json` | 200 | 37KB — full quiz render array (all elements, options, render metadata) |
| `GET /webform_rest/phishing_awareness_quiz/fields?_format=json` | 200 | Cleaner output — just element metadata (type, title, options, webform keys) |

The `fields` endpoint is preferred for Angular — it returns only the essential form element metadata without the full Drupal render array.

#### AKS Replication

With the module validated locally, the same steps were applied to AKS:

1. **`webform_rest` already installed** — `composer require drupal/webform_rest` and `drush en webform_rest -y` had been run on the AKS pod earlier (Composer 2.9.5 installed at runtime, module 4.2.0 downloaded)
2. **REST resource configs already created** — the `RestResourceConfig` entities were created via `drush php:eval` with method granularity
3. **Permissions were missing** — the `enable_webform_rest.php` script was pushed to the pod via base64 and executed via `drush scr`. This granted anonymous GET permissions.
4. **Ingress updated** — added `/webform_rest` → `drupal-service` path to `k8s/ingress.yaml` and applied via `kubectl apply`

**AKS test results:**

| Endpoint | HTTP | Result |
| :--- | :--- | :--- |
| `http://20.85.112.48/webform_rest/phishing_awareness_quiz/elements?_format=json` | 200 | Full quiz JSON — 5 questions with options ✅ |
| `http://20.85.112.48/webform_rest/phishing_awareness_quiz/fields?_format=json` | 200 | Clean element metadata ✅ |

#### Updated Ingress Routing

| Path | Service | Notes |
| :--- | :--- | :--- |
| `/api/*` | `api-service:80` | .NET API |
| `/health` | `api-service:80` | .NET health check |
| `/jsonapi/*` | `drupal-service:80` | Drupal JSON:API — training modules |
| `/webform_rest/*` | `drupal-service:80` | **NEW** — Webform REST — quiz elements + submissions |
| `/` (default) | `angular-service:80` | Angular SPA catch-all |

#### Files Created/Modified

| File | Change |
| :--- | :--- |
| `scripts/enable_webform_rest.php` | **NEW** — Enables REST resource configs + grants anonymous permissions |
| `k8s/ingress.yaml` | Added `/webform_rest` → `drupal-service` route |
| `composer.json` / `composer.lock` | Added `drupal/webform_rest: ^4.2` dependency |

#### Angular Integration Endpoints (For Phase 4)

| Purpose | Method | URL | Notes |
| :--- | :--- | :--- | :--- |
| Get quiz structure | GET | `/webform_rest/{webform_id}/fields?_format=json` | Returns question types, titles, options |
| Get quiz elements (full) | GET | `/webform_rest/{webform_id}/elements?_format=json` | Full render array — use `fields` instead |
| Submit quiz answers | POST | `/webform_rest/{webform_id}/submission?_format=json` | Requires auth (cookie) |

**Phase 3 is complete.** Webform REST endpoints are operational on both local DDEV and AKS. Angular can now fetch quiz structure from Drupal and render it dynamically.

**[LLM_CONTEXT: `webform_rest` 4.2.0 is installed and configured on both DDEV and AKS. JSON:API CANNOT serve webform quiz structure — `webform_rest` is required. The module needs 3 things beyond `drush en`: (1) RestResourceConfig entities with `granularity => 'method'`, (2) anonymous permissions for GET endpoints, (3) `?_format=json` query parameter on all requests. The `fields` endpoint (`/webform_rest/{id}/fields?_format=json`) is the preferred endpoint for Angular — cleaner output than `elements`. The ingress now routes `/webform_rest/*` to Drupal alongside `/jsonapi/*`. A reusable script at `scripts/enable_webform_rest.php` handles the REST resource configuration. Phase 3 is COMPLETE — proceed to Phase 4 (Drupal JSON:API integration in Angular).]**

---

### Phase 4: Drupal JSON:API Integration in Angular (Mar 8, 2026)
**[DIFFICULTY: Intermediate-Advanced] [CONCEPTS: Angular, JSON_API, webform_rest, Decoupled_Drupal, Angular_Material]**

#### Phase 4 Design Decisions

**Decision 1 — Single DrupalService (POC):**
One injectable `DrupalService` handles all Drupal API calls (JSON:API for training modules + webform_rest for quiz data). Post-POC: split into separate services (`TrainingModuleService`, `QuizService`, etc.) based on client-specific requirements. Added to Planning.md Post-POC Backlog.

**Decision 2 — Environment URLs (Dev = DDEV, Prod = same-origin):**
- **Dev (`environment.ts`):** `drupalBaseUrl: 'http://drupalpoc.ddev.site'` — Angular dev server at `localhost:4200` makes cross-origin calls to local DDEV Drupal (CORS wildcard enabled for POC).
- **Prod (`environment.prod.ts`):** `drupalBaseUrl: ''` (empty string) — All API calls are relative to the same origin. The AKS nginx ingress handles path-based routing (`/jsonapi/*` → drupal-service, `/api/*` → api-service). No hardcoded IPs.
- **Correction:** Previous prod config had `drupalBaseUrl: '/drupal'` which was wrong — the ingress routes `/jsonapi/*` directly, not `/drupal/jsonapi/*`. Fixed to empty string.

**Decision 3 — Pluralsight-Style Module Viewer:**
Training modules use a two-column layout inspired by Pluralsight's course viewer:
- **Left column:** Collapsible table-of-contents listing all modules (title, difficulty badge, duration)
- **Right column:** Selected module detail — embedded YouTube/Vimeo video, title, description, metadata
- Global app sidenav (Dashboard, Training Modules, Quiz, Results) remains unchanged
- The two-column layout is nested within the content area of the `/modules` route
- Route structure: `/modules` (list with first module selected) → `/modules/:id` (specific module selected)

**Decision 4 — Read-Only Quiz (Phase 4):**
The `QuizComponent` renders webform questions fetched from `/webform_rest/phishing_awareness_quiz/fields?_format=json` as Material cards with radio button options — but no submit/scoring functionality. This proves Angular can dynamically render quiz structure authored in Drupal. Interactive submission and .NET API scoring integration deferred to Phase 5.

**[LLM_CONTEXT: Phase 4 uses a single DrupalService (not separate services — that's post-POC). Environment URLs: dev hits DDEV locally, prod uses empty base URLs with ingress routing. The module viewer follows Pluralsight's pattern: left sidebar TOC + right video/detail area, nested within the content area (NOT replacing the app sidenav). Quiz is read-only in Phase 4.]**

#### Phase 4 Implementation

##### DrupalService (`src/angular/src/app/services/drupal.service.ts`)

Created a single injectable service with 3 methods:

| Method | Endpoint | Returns |
| :--- | :--- | :--- |
| `getTrainingModules()` | `GET /jsonapi/node/training_module?include=field_category` | `Observable<TrainingModule[]>` |
| `getTrainingModule(id)` | `GET /jsonapi/node/training_module/{id}?include=field_category` | `Observable<TrainingModule>` |
| `getQuizFields(webformId)` | `GET /webform_rest/{id}/fields?_format=json` | `Observable<any>` |

The `?include=field_category` parameter instructs JSON:API to sideload the taxonomy term via the `included` array, avoiding a separate request. Private `mapModule`/`mapModules` helpers resolve the taxonomy reference from the `included` array.

`TrainingModule` interface: `{ id, title, description, videoUrl, difficulty, duration, category }`.

##### ModulesComponent (`src/angular/src/app/pages/modules/modules.component.ts`)

Replaced the stub with a Pluralsight-style module list:
- Fetches all modules via `DrupalService.getTrainingModules()`
- Groups modules by category into Material `MatExpansionPanel` sections (all expanded by default)
- Each module row: play icon, title, color-coded difficulty chip (`beginner`=green, `intermediate`=yellow, `advanced`=red), duration chip with clock icon
- `RouterLink` to `/modules/:id` for each module
- Loading spinner while fetching

##### ModuleDetailComponent (`src/angular/src/app/pages/module-detail/module-detail.component.ts`)

New component for the `/modules/:id` route:
- Fetches single module by UUID via `DrupalService.getTrainingModule(id)`
- Converts YouTube/Vimeo watch URLs to embed format via `toEmbedUrl()` (regex extraction of video ID)
- Renders 16:9 responsive iframe via `DomSanitizer.bypassSecurityTrustResourceUrl()`
- Shows difficulty/duration/category chips, description card, back-to-list button

##### QuizComponent (`src/angular/src/app/pages/quiz/quiz.component.ts`)

Replaced the stub with a read-only quiz renderer:
- Fetches webform field definitions from `/webform_rest/phishing_awareness_quiz/fields?_format=json`
- Parses field `#type`, `#title`, `#options`, `#required` from Drupal's webform field structure
- Renders each question as a Material card:
  - `radios` → disabled `mat-radio-group`
  - `checkboxes` → disabled `mat-checkbox` list
  - `select` → rendered as disabled radio buttons for read-only display
  - `textfield`/`textarea` → placeholder indicator
- Blue preview banner explaining this is read-only data from Drupal Webforms
- "Required" chip on mandatory questions
- Error state handling if webform_rest endpoint is unavailable

##### Routing (`src/angular/src/app/app.routes.ts`)

| Path | Component | Notes |
| :--- | :--- | :--- |
| `/` | redirect → `/dashboard` | |
| `/dashboard` | `DashboardComponent` | Stub |
| `/modules` | `ModulesComponent` | Pluralsight-style list |
| `/modules/:id` | `ModuleDetailComponent` | **NEW** — single module with video embed |
| `/quiz` | `QuizComponent` | Read-only webform renderer |
| `/results` | `ResultsComponent` | Stub |

##### Angular Proxy Configuration (Dev Only)

**Problem:** Angular dev server at `localhost:4200` making cross-origin requests to `drupalpoc.ddev.site` was blocked by CORS despite Drupal CORS being enabled — the Angular container running inside Docker couldn't resolve the DDEV hostname.

**Solution:** Angular CLI proxy configuration (`src/angular/proxy.conf.json`) that intercepts `/jsonapi` and `/webform_rest` paths and forwards them to the DDEV router:

```json
{
  "/jsonapi": {
    "target": "http://ddev-router",
    "secure": false,
    "changeOrigin": true,
    "headers": { "Host": "drupalpoc.ddev.site" }
  },
  "/webform_rest": {
    "target": "http://ddev-router",
    "secure": false,
    "changeOrigin": true,
    "headers": { "Host": "drupalpoc.ddev.site" }
  }
}
```

**Key details:**
- The Angular Docker container runs on `--network ddev_default` to reach the DDEV Traefik router (`ddev-router`)
- The `Host` header is required so Traefik routes the request to the correct DDEV project
- Both `environment.ts` and `environment.prod.ts` use `drupalBaseUrl: ''` (empty string) — all API paths are relative, making the proxy transparent

**Docker dev server command:**
```bash
docker run --rm -p 4200:4200 --network ddev_default \
  -v "${PWD}/src/angular:/app" -w /app \
  node:22-alpine npx ng serve --host 0.0.0.0 --proxy-config proxy.conf.json
```

##### Change Detection Bug (Resolved)

**Symptom:** The "Training Modules" heading rendered but the expansion panels (actual module data) only appeared after interacting with the Material sidenav (e.g., toggling the hamburger menu).

**Root cause:** Angular change detection issue. The HTTP response from `DrupalService` updated component properties (`groupedModules`, `loading`), but Angular didn't re-render the view until an unrelated DOM event (sidenav animation) triggered a change detection cycle.

**Diagnosis:** Network tab confirmed the `/jsonapi/node/training_module?include=field_category` request fired and returned 200 on initial page load. The data was present in memory but not rendered.

**Fix:** Added `ChangeDetectorRef.detectChanges()` in the HTTP subscription callback for all three data-fetching components:
- `ModulesComponent` — after setting `groupedModules` and `loading`
- `ModuleDetailComponent` — after setting `mod` and `safeVideoUrl`
- `QuizComponent` — after setting `questions` and `loading`

**Why this is needed:** The Angular dev server runs inside a Docker container with Vite. The combination of containerized execution, Vite's dev server, and Angular's zoneless or zone-constrained change detection can miss HTTP callback re-renders. `detectChanges()` forces synchronous view update.

##### Files Created/Modified

| File | Change |
| :--- | :--- |
| `src/angular/src/app/services/drupal.service.ts` | **NEW** — DrupalService + TrainingModule interface |
| `src/angular/src/app/pages/modules/modules.component.ts` | **REPLACED** stub → Pluralsight-style expansion panel list |
| `src/angular/src/app/pages/module-detail/module-detail.component.ts` | **NEW** — Module detail + video embed |
| `src/angular/src/app/pages/quiz/quiz.component.ts` | **REPLACED** stub → Read-only webform quiz renderer |
| `src/angular/src/app/app.routes.ts` | **MODIFIED** — Added `/modules/:id` route |
| `src/angular/src/app/app.html` | **MODIFIED** — Sidenav mode adjustments (tested `mode="over"`, reverted to `mode="side" opened`) |
| `src/angular/src/environments/environment.ts` | **MODIFIED** — `drupalBaseUrl: ''` (empty, proxy handles routing) |
| `src/angular/src/environments/environment.prod.ts` | **MODIFIED** — All base URLs `''` |
| `src/angular/proxy.conf.json` | **NEW** — Dev proxy targeting ddev-router |

**[LLM_CONTEXT: Phase 4 Drupal integration is complete. DrupalService, ModulesComponent, ModuleDetailComponent, and QuizComponent are all built and compiling clean. The Angular dev server runs in Docker on the ddev_default network with a proxy to ddev-router. A ChangeDetectorRef.detectChanges() call is required in all HTTP subscription callbacks due to containerized Vite execution. The sidenav remains `mode="side" opened` — the `mode="over"` experiment was reverted after determining the rendering issue was change detection, not layout.]**

---

### Phase 5: .NET API Integration — Scores/Results (Mar 8, 2026)
**[DIFFICULTY: Intermediate] [CONCEPTS: Angular, DotNet8, Azure_SQL, REST_API, Angular_Material]**

#### Design Decisions

**Decision 1 — Separate ApiService:**
Created `ApiService` as a dedicated injectable for .NET API calls (`postResult`, `getScores`), separate from `DrupalService`. This follows the single-responsibility principle — Drupal calls go through `DrupalService`, .NET calls through `ApiService`.

**Decision 2 — Client-Side Quiz Scoring:**
The answer key (Q1=c, Q2=c, Q3=b, Q4=b, Q5=b) is embedded in the `QuizComponent` as a constant. Scoring is computed client-side before POSTing to the .NET API. This is a POC simplification — post-POC, scoring should move server-side to prevent answer key exposure.

**Decision 3 — Environment URLs All Empty (Dev Proxy):**
All `environment.ts` base URLs set to `''` (empty string). The Angular dev proxy in `proxy.conf.json` handles routing: `/jsonapi` and `/webform_rest` → ddev-router, `/api` and `/health` → `host.docker.internal:5000` (.NET API). In production, the AKS ingress handles all routing. No hardcoded service URLs anywhere.

**Decision 4 — Graceful API Failure:**
The quiz submission gracefully handles .NET API unreachability — score is still displayed even if the POST fails. The results page shows an error banner if `GET /api/scores` is unreachable. This allows the Angular dev server to function even when the .NET API isn't running locally.

#### Implementation

##### ApiService (`src/angular/src/app/services/api.service.ts`)

New injectable service with 2 methods:

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `postResult(result)` | `POST /api/results` | Save quiz/simulation result to Azure SQL |
| `getScores()` | `GET /api/scores` | Retrieve all results from Azure SQL |

`SimulationResult` interface: `{ id?, userId, campaignId, score, completedAt, createdAt? }` — matches the .NET `SimulationResult` model.

##### QuizComponent Upgrade (Read-Only → Interactive)

Upgraded from Phase 4's disabled/read-only quiz to a fully interactive quiz:
- Radio buttons are now **enabled** (bound via `[(ngModel)]` to `answers` object)
- "Submit Quiz" button appears when all questions are answered
- Client-side scoring against the answer key constant
- On submit: POST result to `/api/results`, show score banner (pass ≥80% / fail), color-code each question card (green border = correct, red = incorrect)
- "Retake Quiz" button resets the form
- Snackbar notifications for success/failure of API save
- Graceful fallback if .NET API is unreachable (score still shown)

##### ResultsComponent (Stub → Full Implementation)

Replaced placeholder with a Material data table + summary stats:
- Fetches all results from `GET /api/scores`
- **Summary card:** Total attempts, average score, pass rate (≥80%)
- **Material table:** User, Campaign/Quiz, Score (color-coded chip), Completed timestamp
- Refresh button for manual reload
- Loading spinner, error state, empty state handling

##### Proxy Configuration

Added `/api` and `/health` proxy routes targeting `host.docker.internal:5000` for local development. This allows the Angular Docker container to reach the .NET API running on the host machine.

##### Production Build

Build completed successfully:
- Initial: 702.74 kB raw / 150.03 kB transfer (budget warning at 500kB is expected — Material table, forms, snackbar modules added)
- Output: `dist/drupalpoc-angular/browser/` — matches Dockerfile COPY path

#### Files Created/Modified

| File | Change |
| :--- | :--- |
| `src/angular/src/app/services/api.service.ts` | **NEW** — ApiService + SimulationResult interface |
| `src/angular/src/app/pages/quiz/quiz.component.ts` | **REPLACED** — Read-only → interactive quiz with scoring + API submission |
| `src/angular/src/app/pages/results/results.component.ts` | **REPLACED** — Stub → Material table with summary stats |
| `src/angular/src/environments/environment.ts` | **MODIFIED** — All base URLs `''` (proxy handles routing) |
| `src/angular/proxy.conf.json` | **MODIFIED** — Added `/api` + `/health` proxy routes |

#### Phase 5 Summary

| Step | Status |
| :--- | :--- |
| ApiService created (postResult + getScores) | ✅ |
| QuizComponent upgraded to interactive with scoring | ✅ |
| ResultsComponent with Material table + summary stats | ✅ |
| Dev proxy configured for .NET API routes | ✅ |
| Production build verified (0 errors) | ✅ |

**[LLM_CONTEXT: Phase 5 is complete. The Angular quiz is now interactive — users answer questions, get scored client-side (answer key: Q1=c, Q2=c, Q3=b, Q4=b, Q5=b), and results are POSTed to the .NET API at `/api/results`. The results page displays all scores from `GET /api/scores` in a Material table with summary statistics. All environment base URLs are empty strings — dev proxy handles routing, prod AKS ingress handles routing. The quiz gracefully handles API unreachability. Post-POC: move scoring server-side. Phase 5 is COMPLETE — proceed to Phase 6 (GoPhish campaign seeding + Angular integration).]**

---

### Phase 6 — GoPhish Campaign Seeding + Angular Integration

#### What Was Done

1. **GoPhish API Access**: Extracted API key (`8ba7...cb95`) from GoPhish SQLite DB inside the pod using Python. Verified API reachable from Drupal pod via cluster-internal DNS (`https://gophish-service.drupalpoc:3333`).

2. **Campaign Seeding** (`scripts/seed_gophish_campaign.sh`): Created shell script that seeds GoPhish with a complete phishing simulation:
   - Sending Profile: "TSUS IT Helpdesk" (localhost:25, helpdesk@tsus.edu)
   - Email Template: "Password Reset Required" — TSUS-branded HTML with `{{.URL}}` tracking
   - Landing Page: "TSUS Login Portal" — credential capture form (captures usernames, NOT passwords)
   - User Group: "TSUS Security Training Demo" — 5 demo users (Alice, Bob, Carol, David, Eve @tsus.edu)
   - Campaign: "Q1 2026 Phishing Simulation - Password Reset" — launches 2026-03-08, all 5 targets in "Sending" status

3. **GoPhish → .NET API Proxy**: Added 3 proxy endpoints to `Program.cs` to keep the API key server-side:
   - `GET /api/campaigns` → GoPhish campaigns list
   - `GET /api/campaigns/{id}` → single campaign detail
   - `GET /api/campaigns/{id}/results` → campaign result tracking
   - Uses `HttpClientFactory` with `DangerousAcceptAnyServerCertificateValidator` for GoPhish self-signed cert
   - GoPhish config (BaseUrl + ApiKey) stored in `appsettings.json`

4. **Angular GophishService** (`src/angular/src/app/services/gophish.service.ts`): New service with `getCampaigns()`, `getCampaign(id)`, `getCampaignResults(id)`. Calls .NET proxy endpoints (not GoPhish directly).

5. **ResultsComponent Upgraded**: Added `MatTabsModule` with two tabs:
   - "Quiz Scores" — existing quiz results table + summary stats
   - "Phishing Campaigns" — campaign cards with per-target status tracking (Sending, Email Sent, Opened, Clicked Link, Submitted Data), color-coded status chips, per-campaign summary stats

6. **Production Build Verified**: 759.25 kB initial bundle (budget warning expected for POC).

#### GoPhish API Details
- **Admin URL**: `https://gophish-service.drupalpoc:3333` (cluster-internal only)
- **Admin Password**: `bb075005daae538b`
- **API Key**: `***REDACTED_GOPHISH_KEY***`
- **API Note**: Campaign creation requires resource `name` fields (not IDs). Endpoint paths need trailing slash via `/${ENDPOINT}/`.

#### Phase 6 Summary

| Step | Status |
| :--- | :--- |
| GoPhish API key extracted + verified | ✅ |
| Seed script created + executed (5 resources) | ✅ |
| .NET API GoPhish proxy endpoints added | ✅ |
| GophishService Angular service created | ✅ |
| ResultsComponent upgraded with campaigns tab | ✅ |
| Production build verified | ✅ |

**[LLM_CONTEXT: Phase 6 is complete. GoPhish has 1 seeded campaign ("Q1 2026 Phishing Simulation - Password Reset") with 5 demo targets in "Sending" status. The .NET API proxies GoPhish at `/api/campaigns` (keeps API key server-side). Angular ResultsComponent now has 2 tabs: "Quiz Scores" (from .NET SQL) and "Phishing Campaigns" (from GoPhish via .NET proxy). GoPhish uses HTTPS self-signed cert on port 3333 — .NET HttpClient configured with cert bypass. Campaign was created using resource names (not IDs) per GoPhish API requirement. Phase 6 is COMPLETE — proceed to Phase 7 (Dashboard shell with Chart.js).]**

---

### Phase 7 — Dashboard Shell (Chart.js)

#### What Was Done

Replaced the stub `DashboardComponent` with a full compliance dashboard using Chart.js 4.x:

1. **KPI Cards Row** (4 Material cards):
   - Quiz Attempts — total count from `GET /api/scores`
   - Quiz Pass Rate — percentage scoring ≥80%
   - Phishing Campaigns — count from `GET /api/campaigns`
   - Phish Click Rate — percentage of targets who clicked link or submitted data

2. **Charts Row** (2 responsive Chart.js canvases):
   - **Quiz Score Distribution** (Bar chart) — 5 buckets: 0-20%, 21-40%, 41-60%, 61-80%, 81-100%
   - **Phishing Campaign Results** (Pie chart) — slices by GoPhish status: Sending, Email Sent, Opened, Clicked Link, Submitted Data

3. **Data Sources**: Both `ApiService` and `GophishService` called in parallel on init; charts rendered after both respond. Graceful fallback if either API is unreachable (empty data, no crash).

4. **Production Build**: 969.41 kB initial (Chart.js adds ~200 kB). Budget warning expected for POC.

#### Phase 7 Summary

| Step | Status |
| :--- | :--- |
| Dashboard KPI cards (4 metrics) | ✅ |
| Bar chart — quiz score distribution | ✅ |
| Pie chart — phishing campaign results | ✅ |
| Data from .NET API + GoPhish proxy | ✅ |
| Production build verified | ✅ |

**[LLM_CONTEXT: Phase 7 is complete. The dashboard at `/dashboard` (default route) shows 4 KPI cards and 2 Chart.js charts. Data flows from 2 sources: `GET /api/scores` (quiz results from Azure SQL via .NET API) and `GET /api/campaigns` (GoPhish via .NET proxy). Chart.js 4.x is used with `Chart.register(...registerables)`. Charts render after both API calls resolve. The `@ViewChild` canvas refs require `setTimeout` after toggling `loading=false` so the DOM updates before Chart.js initializes. Phase 7 is COMPLETE — proceed to Phase 8 (Docker build + AKS deploy).]**

---

### Phase 8 — Docker Build + GHCR Push + AKS Deploy

#### What Was Done

1. **`.dockerignore` Updated**: Added `**/node_modules` to exclude local node_modules symlinks that were breaking Docker build context (was causing `invalid file request` error for symlinked binaries).

2. **Angular Docker Image** (`ghcr.io/fullera8/drupalpoc-angular:latest`):
   - Built with multi-stage: `node:22-alpine` (build) → `nginx:alpine` (serve)
   - Production bundle: 969.41 kB initial (Dashboard + Chart.js + Material + GoPhish)
   - Pushed to GHCR

3. **.NET API Docker Image** (`ghcr.io/fullera8/drupalpoc-api:latest`):
   - Rebuilt with GoPhish proxy endpoints (`/api/campaigns`, `/api/campaigns/{id}`, `/api/campaigns/{id}/results`)
   - `HttpClientFactory` with `DangerousAcceptAnyServerCertificateValidator` for GoPhish self-signed cert
   - Pushed to GHCR

4. **K8s Angular Deployment Updated** (`k8s/angular-deployment.yaml`):
   - Removed placeholder ConfigMap volume mount
   - Changed image from `nginx:alpine` to `ghcr.io/fullera8/drupalpoc-angular:latest`
   - Added `imagePullSecrets: ghcr-secret`

5. **K8s API Deployment Updated** (`k8s/api-deployment.yaml`):
   - Added `GoPhish__BaseUrl` env var (direct value: `https://gophish-service.drupalpoc:3333`)
   - Added `GoPhish__ApiKey` env var (from `api-secrets` secret)

6. **K8s Secret Patched**: Added `GoPhish__ApiKey` to `api-secrets` secret in `drupalpoc` namespace.

7. **Deployment Verified**:
   - All 4 pods running: angular, api, drupal, gophish
   - `GET http://20.85.112.48/` → Angular SPA (200 OK, "TSUS Security Training")
   - `GET http://20.85.112.48/health` → `{"status":"healthy"}`
   - `GET http://20.85.112.48/api/campaigns` → GoPhish campaign data flowing through .NET proxy

#### Phase 8 Summary

| Step | Status |
| :--- | :--- |
| .dockerignore updated (exclude node_modules) | ✅ |
| Angular Docker image built + pushed to GHCR | ✅ |
| .NET API Docker image rebuilt + pushed to GHCR | ✅ |
| angular-deployment.yaml updated (real image) | ✅ |
| api-deployment.yaml updated (GoPhish env vars) | ✅ |
| GoPhish API key added to K8s secrets | ✅ |
| Both deployments applied + rolled out | ✅ |
| All 4 pods running | ✅ |
| Live endpoint verification (/, /health, /api/campaigns) | ✅ |

**[LLM_CONTEXT: ALL 8 PHASES COMPLETE. The DrupalPOC cybersecurity training platform is live on AKS at http://20.85.112.48. Architecture: Angular 21 SPA → .NET 8 Minimal API → Azure SQL + GoPhish (via cluster-internal proxy). Drupal 11 headless CMS provides training content via JSON:API + Webform REST. GoPhish campaign data proxied through .NET API (API key stays server-side). Dashboard shows KPIs + Chart.js charts. All 4 microservices running in drupalpoc namespace. No git commits per YOLO mode. TASK COMPLETE.]**

---

## DDEV Mutagen Sync Troubleshooting (Mar 8, 2026)
**[SECTION_METADATA: CONCEPTS=DDEV,Mutagen,Docker,Windows,Symlinks | DIFFICULTY=Intermediate | TOOLS=DDEV,Docker,Mutagen,PowerShell | RESPONDS_TO: Debugging_Troubleshooting]**

### Problem: 502 Bad Gateway on Drupal JSON:API Endpoints

**Symptom:** After starting DDEV and the Angular dev server, navigating to `http://localhost:4200/modules` produced a `502 Bad Gateway` error for `/jsonapi/node/training_module?include=field_category`. The Angular SPA itself loaded fine — only the proxied Drupal endpoints failed.

### Diagnosis Chain

**Step 1 — Test Drupal from inside the container:**
```bash
docker exec ddev-DrupalPOC-web curl -s -o /dev/null -w "%{http_code}" http://localhost/jsonapi/node/training_module
# Result: 000 (connection refused — Drupal not responding at all)
```

**Step 2 — Check web server processes:**
```bash
docker exec ddev-DrupalPOC-web bash -c "ps aux | grep -E 'nginx|php-fpm'"
# Result: Only the grep process itself found — nginx and PHP-FPM are NOT running
```

The web container was up (`docker ps` showed it) but only the `bash /pre-start` entrypoint and the `.mutagen/agents` process were running. No nginx, no PHP-FPM — the container never completed initialization.

**Step 3 — Check Mutagen status:**
```powershell
ddev mutagen status
# Result: "ok: transitioning" — Mutagen stuck trying to sync
```

**Step 4 — Run Mutagen diagnostics:**
```powershell
ddev utility mutagen-diagnose
```

This revealed **10 sync conflict problems**, all in `src/angular/node_modules/.bin/`:
```
✗ Sync conflict problem: map[alphaChanges:[map[new:map[kind:untracked]...]]
  betaChanges:[map[new:map[kind:symlink target:../@angular-devkit/architect/bin/cli.js]...]]
  root:src/angular/node_modules/.bin/architect]
```

The same pattern repeated for `browserslist`, `esbuild`, `json5`, `nanoid`, etc.

### Root Cause: Windows vs. Unix Symlinks in Mutagen

DDEV uses **Mutagen** to sync files between the Windows host (alpha) and the Linux container (beta) for performance. The `node_modules/.bin/` directory contains **Unix symlinks** (e.g., `architect → ../@angular-devkit/architect/bin/cli.js`).

**The conflict:**
- **Beta (Linux container):** npm created proper Unix symlinks in `.bin/`
- **Alpha (Windows host):** Windows cannot represent Unix symlinks in the same way — Mutagen sees them as "untracked" files

This creates an **unresolvable two-way conflict** — Mutagen cannot reconcile the symlink (beta) with the non-symlink (alpha). Since conflicts are never auto-resolved, Mutagen stays in "transitioning" state forever.

**The cascading failure:**
1. Mutagen stuck in "transitioning" (sync never completes)
2. DDEV web container's `/pre-start` script **blocks** until Mutagen sync finishes
3. Pre-start never finishes → nginx and PHP-FPM are never launched
4. Container is "running" but has no web server → `ddev describe` still reports "OK"
5. Angular proxy requests to `ddev-router` → Drupal container → **502 Bad Gateway**

### Fix: Exclude node_modules from Mutagen Sync

The Mutagen diagnostics tool itself recommended the fix:

> `⚠ node_modules directory exists but is not excluded from sync`
> `→ Add to .ddev/config.yaml: upload_dirs: - ../src/angular/node_modules`

**Applied fix** — added `upload_dirs` to `.ddev/config.yaml`:
```yaml
upload_dirs:
  - sites/default/files
  - ../src/angular/node_modules
```

The `upload_dirs` setting tells DDEV to **bind-mount** these paths directly instead of syncing them through Mutagen. This means:
- `node_modules` lives only in the container (bind-mounted from host)
- Mutagen ignores it entirely — no symlink conflicts
- The existing `sites/default/files` entry is preserved (Drupal file uploads)

**Recovery steps after changing config:**
```powershell
ddev poweroff                # Stop all DDEV containers (not just this project)
ddev mutagen reset           # Clear stale Mutagen sessions, volumes, and conflict state
ddev start                   # Fresh start with new config
```

**Result:** Mutagen sync completed in 8 seconds (no conflicts). Nginx (master + 20 workers) and PHP-FPM (master + 3 pool workers) started successfully. `GET /jsonapi/node/training_module` returned HTTP 200 from inside the container.

### Key Takeaways

| Issue | Why It Happens | Prevention |
| :--- | :--- | :--- |
| Mutagen symlink conflicts | Windows can't round-trip Unix symlinks; npm creates symlinks in `node_modules/.bin/` | Always exclude `node_modules` from Mutagen sync via `upload_dirs` |
| DDEV container "OK" but no nginx | `ddev describe` checks container status, not internal process health | Check processes with `docker exec ... ps aux` if 502s occur |
| Stuck Mutagen blocks container init | Pre-start script waits for sync completion | Monitor `ddev mutagen status` — "transitioning" for >30s indicates a problem |
| `ddev restart` alone doesn't fix it | Restart recreates containers but reuses stale Mutagen sessions | Use `ddev poweroff` + `ddev mutagen reset` + `ddev start` for full recovery |

### Files Modified

| File | Change |
| :--- | :--- |
| `.ddev/config.yaml` | Added `upload_dirs` with `sites/default/files` and `../src/angular/node_modules` |

### Startup Script Enhancement

The diagnosis chain above was incorporated into `scripts/start-dev.ps1` as an automated self-healing flow. When the script detects DDEV is running but nginx/PHP-FPM are not responding inside the container, it automatically:

1. Checks `ddev mutagen status` for sync problems
2. Runs `ddev poweroff` → `ddev mutagen reset` → `ddev start` to recover
3. Verifies nginx/PHP-FPM are running before proceeding to the Angular dev server

This eliminates the need for manual diagnosis when Mutagen sync issues occur after Docker restarts or system reboots.

#### Angular Health Check Debugging (Mar 8, 2026)

The Angular dev server readiness check in Step 4 went through three iterations before working correctly:

**Iteration 1 — `Invoke-WebRequest` (original):**
Used `Invoke-WebRequest -Uri 'http://localhost:4200'` to check if Angular was serving. **Bug:** The wait loop ran the full 120 seconds despite Angular completing its Vite build in ~5 seconds. PS 5.1's `Invoke-WebRequest` silently throws on Vite dev server HTTP responses (chunked transfer encoding issues). The `catch {}` swallowed every exception, so `$ngAlive` never became `$true`.

**Iteration 2 — TCP socket `Test-Port` (failed):**
Replaced `Invoke-WebRequest` with a `TcpClient` socket test (`Test-Port '127.0.0.1' 4200`). **Bug:** Docker maps port 4200 to the host via `.ddev/docker-compose.angular.yaml` (`ports: - "4200:4200"`) as soon as the DDEV container starts — **before `ng serve` is even launched**. `Test-Port` saw the port as open immediately, the script thought Angular was "already running", skipped launching `ng serve` entirely, and opened the browser to an empty port (`ERR_EMPTY_RESPONSE`).

**Iteration 3 — Process check + log parsing (working):**
Two-part fix:
- **"Already running" check:** Uses `pgrep -f 'ng serve'` inside the container to detect whether the `ng serve` process actually exists. No false positives from Docker port mapping.
- **Wait loop:** Reads `/tmp/ng-serve.log` inside the container every 2 seconds and pattern-matches for `Application bundle generation complete`. This string has been stable across Angular 16–21. Typically detects completion in ~6–8 seconds (one or two iterations after the ~5s Vite build).
- **Stale log guard:** Clears `/tmp/ng-serve.log` before launching `ng serve` so a previous run's log can't trigger a false positive.

| Check | Method | Why It Failed / Works |
| :--- | :--- | :--- |
| `Invoke-WebRequest` | PS 5.1 HTTP request to `localhost:4200` | PS 5.1 can't parse Vite's HTTP responses — exception on every attempt |
| `Test-Port` (TCP socket) | `TcpClient` async connect to `127.0.0.1:4200` | Docker port mapping opens port before `ng serve` starts — always true |
| `pgrep` + log parsing | Check process exists + match `Application bundle generation complete` in container log | **Correct** — process check avoids port mapping false positive; log parsing avoids HTTP parsing issues |

**[LLM_CONTEXT: The Angular dev server health check in `start-dev.ps1` Step 4 uses `pgrep -f 'ng serve'` for the "already running" check and log-based pattern matching (`Application bundle generation complete`) for the wait loop. Do NOT use `Invoke-WebRequest`, `Invoke-RestMethod`, or TCP port checks for Angular — port 4200 is mapped by Docker before `ng serve` starts, and PS 5.1 cannot parse Vite dev server HTTP responses. The `Test-Port` helper function still exists in the script but is unused by the Angular step.]**

---

### Shutdown Script (`scripts/stop-dev.ps1`) (Mar 8, 2026)
**[DIFFICULTY: Beginner] [CONCEPTS: DDEV, Docker, PowerShell, DevOps]**

#### Purpose

Complement to `start-dev.ps1` — cleanly tears down all local dev services in **reverse startup order** so nothing lingers between sessions. Prevents stale processes, port conflicts, and Docker pipe issues on next startup.

#### Two Modes

| Mode | Flag | What It Stops | When To Use |
| :--- | :--- | :--- | :--- |
| **Normal** | _(none)_ | Angular, .NET API, DDEV project (`ddev stop`) | End of dev session — fast restart next time |
| **Full** | `-Full` | All of the above + `ddev poweroff` (router, ssh-agent, Mutagen) + orphan cleanup | Things feel stuck, or before a long break |

#### Shutdown Order (Reverse of Startup)

1. **Angular dev server** — `pkill -f 'ng serve'` inside `ddev-DrupalPOC-web` container
2. **.NET API** — kills `dotnet` process on port 5000 + its host PowerShell wrapper
3. **DDEV** — `ddev stop` (normal) or `ddev poweroff` (full)
4. **Orphan cleanup** (full mode only) — kills stray PowerShell windows from previous `start-dev.ps1` runs
5. **Verification** — confirms ports 4200 and 5000 are free, no DrupalPOC containers running

#### Usage

```powershell
# Normal shutdown (fast restart next session)
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1

# Full cleanup (stuck state, long break between sessions)
powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1 -Full
```

#### Script Trio

| Script | Purpose | Severity |
| :--- | :--- | :--- |
| `scripts/start-dev.ps1` | Boot all services + Mutagen self-healing | Normal operation |
| `scripts/stop-dev.ps1` | Clean shutdown of all services | Normal operation |
| `scripts/restart-docker.ps1` | Kill + restart Docker Desktop itself | Nuclear option (frozen Docker) |

**[LLM_CONTEXT: Three dev lifecycle scripts exist: `start-dev.ps1` (boot with Mutagen self-heal + log-based Angular health check), `stop-dev.ps1` (graceful shutdown, -Full for complete teardown), `restart-docker.ps1` (Docker Desktop restart + optional DDEV start). Normal workflow: `stop-dev.ps1` at end of session → `start-dev.ps1` at start of next session. If Docker is frozen: `restart-docker.ps1` (auto-starts DDEV) → `start-dev.ps1`. The shutdown script verifies ports 4200/5000 are free and no containers linger. Angular readiness is checked via `pgrep` + log pattern matching — NOT via HTTP or TCP port checks (see Angular Health Check Debugging section).]**

---

### DDEV Container Lifecycle Reference (Mar 8, 2026)
**[DIFFICULTY: Beginner] [CONCEPTS: DDEV, Docker, ddev-router, ddev-ssh-agent, Traefik]**

#### The 3 DDEV Container Groups

When you run `ddev start`, DDEV creates three groups of containers. **All are created automatically by `ddev start` — no separate creation step is needed.**

| Container | Scope | Purpose | Created By | Destroyed By |
| :--- | :--- | :--- | :--- | :--- |
| `ddev-router` | **Global** (shared across all DDEV projects) | Traefik reverse proxy — routes `*.ddev.site` hostnames to the correct project | `ddev start` (any project) | `ddev poweroff`, or auto-stops when last project stops |
| `ddev-DrupalPOC-web`, `ddev-DrupalPOC-db`, `ddev-DrupalPOC-azure-cli` | **Project-specific** | Web (nginx + PHP-FPM + Mutagen), database (MariaDB 11.8), Azure CLI sidecar | `ddev start` from project directory | `ddev stop` (this project) or `ddev poweroff` (all) |
| `ddev-ssh-agent` | **Global** (shared) | SSH key forwarding for git/Composer auth inside containers | `ddev start` (any project) | `ddev poweroff` |

#### Fresh Git Clone Workflow

After `git clone`, no DDEV containers exist. The sequence:
1. Developer clones repo — gets `.ddev/config.yaml` + `.ddev/docker-compose.*.yaml` (configuration only)
2. Developer runs `ddev start` — DDEV reads config, pulls images, creates all 3 container groups
3. All containers are created and started — no manual docker commands needed

#### Script Responsibilities

| Script | DDEV Handling |
| :--- | :--- |
| `start-dev.ps1` (Step 1) | Checks `ddev describe -j` → if not running, runs `ddev start` (with retry). This handles both fresh clone and returning sessions. Then runs Mutagen health check. |
| `restart-docker.ps1` (Step 6) | After Docker engine is ready, runs `ddev start` to recreate containers. Skip with `-NoDdev` flag. |
| `stop-dev.ps1` | Normal: `ddev stop` (project containers only, router stays if other projects running). Full: `ddev poweroff` (all containers including router and ssh-agent). |

**Key Insight:** `ddev start` is **idempotent** — safe to call whether containers don't exist (creates them), exist but are stopped (starts them), or are already running (no-op). This is why both `restart-docker.ps1` and `start-dev.ps1` can call it without precondition checks.

**[LLM_CONTEXT: All DDEV containers are created by `ddev start`. No manual docker container creation needed. `restart-docker.ps1` now includes Step 6 to auto-start DDEV after Docker restarts (skippable with -NoDdev). `start-dev.ps1` Step 1 retries `ddev start` once if the first attempt fails (common after fresh Docker restart). `ddev start` is idempotent — safe to call in any state.]**

---

## GoPhish Local Setup, Campaign Seeding & 500 Error Fix (Mar 8, 2026)
**[SECTION_METADATA: CONCEPTS=GoPhish,Mailpit,Docker,DotNet8,Angular,Debugging | DIFFICULTY=Intermediate | TOOLS=Docker,curl,PowerShell | RESPONDS_TO: Debugging_Troubleshooting, Implementation_How-To]**

### GoPhish 500 Error — Root Cause & Fix
**[DIFFICULTY: Intermediate] [DEBUGGING_PATTERNS: GoPhish_API_Proxy_Failure] [CONCEPTS: GoPhish, .NET_8, Angular, Error_Handling]**

**Symptom:** Angular Results page → Phishing Campaigns tab shows "Could not load campaigns. GoPhish API may not be accessible." Browser console: `api/campaigns:1 Failed to load resource: the server responded with a status of 500`.

**Request Flow:** Angular `GophishService.getCampaigns()` → Angular dev proxy (`/api` → `http://host.docker.internal:5000`) → .NET API GoPhish proxy endpoints → GoPhish at configured `BaseUrl`.

**Three Root Causes Identified:**

| # | Root Cause | Detail | Fix |
| :--- | :--- | :--- | :--- |
| 1 | **Wrong GoPhish BaseUrl** | `appsettings.json` had `BaseUrl: "https://gophish-service.drupalpoc:3333"` (AKS cluster-internal DNS, unreachable locally). Error: `HttpRequestException: No such host is known.` | Added GoPhish section to `appsettings.Development.json` with `BaseUrl: "https://localhost:3333"` |
| 2 | **Missing `ASPNETCORE_ENVIRONMENT`** | `start-dev.ps1` spawns .NET API via `Start-Process powershell` — the child process does NOT inherit `ASPNETCORE_ENVIRONMENT`, so `appsettings.Development.json` was never loaded | Added `$env:ASPNETCORE_ENVIRONMENT='Development'` to the spawned command in `start-dev.ps1` (~line 194) |
| 3 | **No error handling on proxy endpoints** | GoPhish proxy endpoints in `Program.cs` had no try/catch — unhandled `HttpRequestException` became raw 500 with stack trace | Wrapped all 3 endpoints in try/catch returning JSON 502: `{ error: "GoPhish unreachable", detail: ex.Message }` |

**Files Modified:**

| File | Change |
| :--- | :--- |
| `src/DrupalPOC.Api/appsettings.Development.json` | Added `GoPhish: { BaseUrl, ApiKey }` for local development |
| `src/DrupalPOC.Api/Program.cs` | All 3 GoPhish proxy endpoints wrapped in try/catch (returns 502 JSON on failure, passes through GoPhish status code on success) |
| `scripts/start-dev.ps1` | Explicit `$env:ASPNETCORE_ENVIRONMENT='Development'` in spawned .NET process |

**[LLM_CONTEXT: `appsettings.json` (production) still has AKS-internal GoPhish URLs. `appsettings.Development.json` overrides with `localhost:3333` for local dev. The .NET API MUST be started with `ASPNETCORE_ENVIRONMENT=Development` to load the correct GoPhish config. `start-dev.ps1` handles this. If GoPhish proxy returns 502, check: (1) is the local GoPhish container running? (2) is port 3333 mapped correctly? (3) is `ASPNETCORE_ENVIRONMENT` set?]**

---

### Local GoPhish Container Setup
**[DIFFICULTY: Beginner] [CONCEPTS: GoPhish, Docker, Mailpit, SMTP]**

GoPhish runs as a standalone Docker container for local development (separate from DDEV). Two ports are exposed:

| Port Mapping | Purpose | Protocol |
| :--- | :--- | :--- |
| `3333:3333` | Admin API + Web UI | HTTPS (self-signed cert) |
| `8080:80` | Phish listener (landing pages, tracking links) | HTTP |

**Critical:** GoPhish `phish_server` listens on port **80** internally (per its `config.json`), NOT 8080. The host-side mapping is `-p 8080:80`.

**Docker Network:** The GoPhish container is connected to the `ddev-drupalpoc_default` Docker network so it can reach DDEV's Mailpit SMTP at `ddev-DrupalPOC-web:1025`. Mailpit's SMTP port (1025) is NOT exposed to the host — GoPhish must be on the DDEV network to send emails.

**Container Launch:**
```powershell
docker run -d --name gophish `
  -p 3333:3333 -p 8080:80 `
  --network ddev-drupalpoc_default `
  gophish/gophish:latest
```

**Credentials:**
- **Admin URL:** `https://localhost:3333`
- **Admin User:** `admin`
- **Admin Password:** `8b5c20f1d87cff29` (from initial container logs: `docker logs gophish`)
- **API Key:** `***REDACTED_GOPHISH_KEY***` (extracted from SQLite DB inside container via regex `[a-f0-9]{64}`)

**Mailpit Integration:**
- **Mailpit SMTP** (from GoPhish's perspective): `ddev-DrupalPOC-web:1025` (no authentication, no TLS)
- **Mailpit Web UI:** `http://drupalpoc.ddev.site:8025` — view captured emails
- GoPhish sends phishing emails → Mailpit captures them locally (no real email delivery)

**Ephemeral Data Warning:** GoPhish uses SQLite internally. All campaigns, templates, and results are **lost on container restart** unless a volume mount is added. For the POC, campaigns are re-seeded via API calls.

**[LLM_CONTEXT: Local GoPhish container is ephemeral — data lost on restart. API key for local dev is `a56eb18f...be2` (different from the AKS GoPhish API key `8ba78f...cb95`). GoPhish phish_server is port 80 internally, mapped to 8080 on host. GoPhish must be on the DDEV Docker network to reach Mailpit SMTP. Mailpit SMTP port 1025 is NOT exposed to the host.]**

---

### GoPhish Campaign Seeding (Local — Mailpit SMTP)
**[DIFFICULTY: Intermediate] [CONCEPTS: GoPhish, Phishing_Simulation, Mailpit, REST_API]**

Seeded a complete phishing campaign via the GoPhish REST API. All 5 prerequisite objects must be created in order before launching a campaign.

**Seeding Order (dependencies flow top-down):**

| # | GoPhish Object | ID | Key Details |
| :--- | :--- | :--- | :--- |
| 1 | **Sending Profile** | 1 | SMTP: `ddev-DrupalPOC-web:1025` (Mailpit, no auth), From: `helpdesk@tsus.edu` |
| 2 | **Landing Page** | 1 | "You Were Phished" — HTML page shown after clicking the phishing link |
| 3 | **Email Template** | 1 | "Password Expiration Notice" — subject: "Action Required: Your TSUS Account Password Expires in 24 Hours", body contains `{{.URL}}` tracking link |
| 4 | **User Group** | 1 | "TSUS Demo Targets" — 1 target: `Alex Fuller <fulleralex47@gmail.com>` |
| 5 | **Campaign** | 1 | "TSUS Password Expiration - March 2026" — launched immediately, phish URL `http://localhost:8080` |

**Campaign Lifecycle Verified:**

| Step | Verification | Result |
| :--- | :--- | :--- |
| Email delivered | Mailpit Web UI (`http://drupalpoc.ddev.site:8025`) | ✅ Email captured with subject "Action Required: Your TSUS Account Password Expires in 24 Hours" |
| Tracking URL extracted | Mailpit API → parsed email body for `http://localhost:8080?rid=...` | ✅ `http://localhost:8080?rid=p6EF0lD` |
| Phishing link clicked | `curl -L http://127.0.0.1:8080/?rid=p6EF0lD` | ✅ HTTP 200 — landing page served |
| Status updated | `GET /api/campaigns` via .NET proxy | ✅ Target status changed from "Email Sent" → **"Clicked Link"** |
| Full pipeline verified | `curl http://localhost:4200/api/campaigns` (Angular proxy) | ✅ Returns campaign JSON with `results[0].status = "Clicked Link"` |

**PowerShell Note:** GoPhish API calls used `curl.exe -k -s` with `--data-binary @file` pattern to avoid PowerShell 5.1 encoding/escaping issues with inline JSON. JSON payloads written to temp files via `[System.IO.File]::WriteAllText()` for BOM-free UTF-8.

**Email Delivery Limitation:** Mailpit captures emails locally only — it does NOT deliver to real inboxes (e.g., Gmail). To deliver phishing test emails to real addresses, configure a real SMTP relay (e.g., Gmail SMTP with App Password at `smtp.gmail.com:587`).

**[LLM_CONTEXT: Local GoPhish has 1 active campaign with 1 target (`fulleralex47@gmail.com`) in "Clicked Link" status. Campaign was seeded via REST API (5 objects in dependency order). Emails go to Mailpit — NOT real inboxes. Use `--data-binary @file` for GoPhish API calls from PowerShell to avoid encoding issues. To re-seed after container restart: recreate all 5 objects in the same order. The tracking URL format is `http://localhost:8080?rid=<trackingId>`.]**

---

## Drupal Mailpit Admin Link (Mar 8, 2026)
**[SECTION_METADATA: CONCEPTS=Drupal,Custom_Module,Admin_Toolbar,Mailpit | DIFFICULTY=Beginner | TOOLS=Drush,DDEV | RESPONDS_TO: Implementation_How-To]**

### Custom Module: `mailpit_link`
**[DIFFICULTY: Beginner] [CONCEPTS: Drupal, Custom_Module, Menu_System, Admin_Toolbar]**

Created a lightweight custom Drupal module that adds a "Mailpit" link with a mail icon to the Drupal admin toolbar (left sidebar). Clicking it redirects to the Mailpit Web UI.

**Module Location:** `web/modules/custom/mailpit_link/`

| File | Purpose |
| :--- | :--- |
| `mailpit_link.info.yml` | Module definition (D10/D11 compatible) |
| `mailpit_link.routing.yml` | Route: `/admin/mailpit` → redirect controller |
| `mailpit_link.links.menu.yml` | Adds "Mailpit" to admin menu as child of `system.admin` |
| `mailpit_link.libraries.yml` | Registers CSS library for toolbar icon |
| `mailpit_link.module` | `hook_page_attachments()` — attaches icon CSS library |
| `src/Controller/MailpitRedirectController.php` | Redirects to `http://{current_host}:8025` |
| `css/mailpit_link.toolbar.css` | Envelope icon via inline SVG data URI |

**How It Works:**
1. The menu link is a child of `system.admin` (`parent: system.admin`), placing it in the admin sidebar alongside Content, Structure, Appearance, etc.
2. Clicking "Mailpit" hits `/admin/mailpit` — the controller reads the current request host and returns a `TrustedRedirectResponse` to `http://{host}:8025`
3. The redirect is dynamic — works regardless of domain (e.g., `drupalpoc.ddev.site`, `localhost`, etc.)
4. Requires `access administration pages` permission (admin-only)
5. Icon uses the Drupal toolbar CSS convention: class `toolbar-icon-mailpit-link-mailpit` with a `::before` pseudo-element containing an SVG envelope

**Debugging Notes:**
- The controller method was initially named `redirect()`, which conflicts with `ControllerBase::redirect()`. Renamed to `redirectToMailpit()`.
- The menu link initially had no `parent` key, so it appeared at the admin menu root (invisible in the sidebar). Adding `parent: system.admin` fixed placement.
- Cache rebuild (`ddev drush cr`) required after any menu link or library changes.

**Enable Command:**
```powershell
ddev drush en mailpit_link -y
ddev drush cr
```

**[LLM_CONTEXT: The `mailpit_link` module is a dev-only convenience for local Drupal admins. It dynamically constructs the Mailpit URL from the current request host — no hardcoded URLs. The module should NOT be deployed to AKS (Mailpit is local-only). If the menu link doesn't appear after enabling, run `ddev drush cr`. The controller method must NOT be named `redirect()` — it conflicts with `ControllerBase::redirect()`.]**

---

## AKS Deployment Script & Drupal Admin Fix (Mar 8–9, 2026)
**[SECTION_METADATA: CONCEPTS=AKS,GHCR,Deployment_Script,kubectl,Port_Forwarding,Nginx,CSS_Aggregation,Drush,Post_Deploy | DIFFICULTY=Intermediate | TOOLS=PowerShell,Docker,kubectl,DDEV,Drush | RESPONDS_TO: Implementation_How-To, Debugging_Troubleshooting]**

### `deploy-aks.ps1` — Reusable AKS Deployment Script
**[DIFFICULTY: Intermediate] [CONCEPTS: GHCR, Docker, AKS, PowerShell, Deployment_Automation]**

Created `scripts/deploy-aks.ps1` — a comprehensive deployment script matching the style of `scripts/start-dev.ps1`. Automates the full build → push → deploy → verify cycle for AKS.

**Script Location:** `scripts/deploy-aks.ps1`
**Config File:** `scripts/.env.deploy` (added to `.gitignore` — contains GHCR_TOKEN)

**6-Step Pipeline:**

| Step | Action | Details |
| :--- | :--- | :--- |
| 1 | **Pre-flight** | Checks Docker, DDEV azure-cli sidecar, Azure auth, refreshes AKS kubeconfig |
| 2 | **Build** | `docker build` for each image; prunes stale BuildKit cache (`--filter until=48h`); auto-retries with `--no-cache` on failure |
| 3 | **Push** | Authenticates to GHCR, pushes all images |
| 4 | **Deploy** | `kubectl rollout restart` for unique deployments, waits for rollout completion |
| 5 | **Post-deploy** | Applies ConfigMaps, restarts Drupal for config pickup, enables custom modules via Drush, rebuilds caches |
| 6 | **Verify** | Gets ingress IP, checks pod status, HTTP health checks against 4 endpoints |

**Parameters:**

| Parameter | Effect |
| :--- | :--- |
| `-SkipBuild` | Skip Docker build, just push + deploy |
| `-SkipPush` | Skip GHCR push, just build + deploy |
| `-BuildOnly` | Build images only, don't push or deploy |
| `-Only api,angular` | Build/deploy only specified services |

**Usage Examples:**
```powershell
# Full deploy (build + push + deploy + verify)
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1

# Redeploy without rebuilding images
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1 -SkipBuild

# Build and deploy only the API
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1 -Only api
```

**Image Definitions (5 images, 4 Dockerfiles):**

| Name | Dockerfile | GHCR Tag | Deployment | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `angular` | `docker/angular/Dockerfile` | `drupalpoc-angular:latest` | `angular` | |
| `api` | `docker/api/Dockerfile` | `drupalpoc-api:latest` | `api` | |
| `drupal` | `docker/drupal/Dockerfile` | `drupalpoc-drupal:latest` | `drupal` | `--target drupal` (PHP-FPM) |
| `drupal-nginx` | `docker/drupal/Dockerfile` | `drupalpoc-drupal-nginx:latest` | `drupal` | `--target nginx` (sidecar) |
| `gophish` | `docker/gophish/Dockerfile` | `drupalpoc-gophish:latest` | `gophish` | |

**`.env.deploy` Format:**
```ini
GHCR_USER=fullera8
GHCR_TOKEN=ghp_xxxxxxxxxxxx
AKS_RESOURCE_GROUP=rg-fulleralex47-0403
AKS_CLUSTER_NAME=drupalpoc-aks
AKS_NAMESPACE=drupalpoc
GHCR_REGISTRY=ghcr.io/fullera8
```

### BuildKit Cache Corruption Fix
**[DIFFICULTY: Intermediate] [CONCEPTS: Docker, BuildKit, Cache_Corruption]**

**Problem:** During a full deploy, `drupal-nginx` build failed with `parent snapshot does not exist: not found` — a stale BuildKit cache error.

**Root Cause:** BuildKit's layer cache had dangling references to deleted parent layers.

**Fix Added to `deploy-aks.ps1` Step 2:**
1. Pre-build: Report cache size via `docker builder du --verbose`
2. Pre-build: Prune stale entries via `docker builder prune -f --filter "until=48h"`
3. Per-image: If build fails, automatically retry with `--no-cache`

### kubectl Port-Forward — Port 8080 Conflict
**[DIFFICULTY: Beginner] [CONCEPTS: kubectl, Port_Forwarding, DDEV, Docker]**

**Problem:** `kubectl port-forward -n drupalpoc svc/drupal-service 8080:80` returned 404 for all requests, despite Drupal working perfectly inside the pod (internal `curl http://127.0.0.1/` returned 200).

**Root Cause:** Port 8080 was already occupied by Docker Desktop (`com.docker.backend`) and WSL (`wslrelay`) — used by DDEV. The port-forward silently failed to bind, and requests to `localhost:8080` hit the Docker/DDEV listener instead of the AKS tunnel.

**Fix:** Use an alternate port:
```powershell
kubectl port-forward -n drupalpoc svc/drupal-service 9090:80
# Then access http://localhost:9090/user/login
```

**Diagnostic Steps That Confirmed the Root Cause:**
1. `kubectl exec ... curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/` → **200** (pod is healthy)
2. `Invoke-WebRequest http://localhost:8080/` → **404** (port-forward not reaching pod)
3. `Get-NetTCPConnection -LocalPort 8080` → Two processes: `com.docker.backend` (PID 101664) and `wslrelay` (PID 41660)
4. Switched to port 9090 → **200** — Drupal served correctly

**[LLM_CONTEXT: Port 8080 is occupied by Docker/DDEV when DDEV is running. Always use an alternate port (9090, 9091, etc.) for kubectl port-forward. Check with `Get-NetTCPConnection -LocalPort <port>` before starting a port-forward. The deploy script summary still shows port 8080 as the example — users should substitute a free port.]**

### Drupal Admin Unstyled + Missing Mailpit Link on AKS
**[DIFFICULTY: Intermediate] [CONCEPTS: Nginx, CSS_Aggregation, Drupal, try_files, Drush, Post_Deploy]**

**Problem:** The AKS-deployed Drupal admin appeared unstyled (no CSS) and was missing the Mailpit toolbar link, even though the local DDEV instance displayed correctly.

**Two Root Causes Identified:**

#### 1. Nginx Static File Block Prevented CSS/JS Aggregation

**Symptom:** All CSS files returned 404. The page HTML referenced aggregated CSS URLs like `/sites/default/files/css/css_sfh-D8Zwnn...css` but these files didn't exist on disk.

**Root Cause:** The nginx config had a static file location block that intercepted `.css` requests and tried to serve them directly — but without a `try_files` fallback to PHP:

```nginx
# BROKEN — returned 404 for aggregated CSS that doesn't exist on disk yet
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|mp4|webm)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    log_not_found off;
}
```

In Drupal 11, CSS/JS aggregation is **lazy** — aggregated files are generated on-demand when first requested through PHP. Since nginx intercepted the `.css` request and returned 404 (file doesn't exist yet), PHP-FPM never got the chance to generate it.

**Fix:** Added `try_files` fallback to the static file block so it falls through to Drupal's front controller when files don't exist:

```nginx
# FIXED — falls back to PHP for lazy CSS/JS aggregation
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|mp4|webm)$ {
    try_files $uri /index.php?$query_string;
    expires 1y;
    add_header Cache-Control "public, immutable";
    log_not_found off;
}
```

**Files Changed:**
- `docker/drupal/nginx.conf` — baked into Docker image for future builds
- `k8s/configmaps.yaml` (`drupal-nginx-conf`) — applied to AKS immediately via `kubectl apply`

**Verification:**
1. Applied ConfigMap: `kubectl apply -f k8s/configmaps.yaml` → `configmap/drupal-nginx-conf configured`
2. Restarted deployment: `kubectl rollout restart deployment/drupal -n drupalpoc`
3. Tested CSS URLs: All 3 aggregated CSS files returned HTTP 200 (1,653 + 69,280 + 3,400 bytes)
4. CSS files generated on disk: `ls /var/www/html/web/sites/default/files/` now shows `css/` directory

#### 2. `mailpit_link` Module Not Enabled on AKS

**Symptom:** The Mailpit toolbar link was missing from the admin sidebar.

**Root Cause:** The `mailpit_link` module code was present in the Docker image (copied via `COPY web/ web/` in the Dockerfile), but it was never **enabled** against the Azure MySQL database. In Drupal, module enable state is stored in the database — having the files in the filesystem is not enough.

**Comparison (local vs AKS):**
```
# Local DDEV — mailpit_link enabled (last in list)
ddev exec drush pm:list --status=enabled --format=list → ... mailpit_link

# AKS — mailpit_link NOT in enabled list
kubectl exec ... drush pm:list --status=enabled --format=list → ... (no mailpit_link)
```

**Fix:** Ran Drush inside the AKS pod to enable the module:
```powershell
kubectl exec -n drupalpoc <pod> -c drupal -- php /var/www/html/vendor/bin/drush.php pm:install mailpit_link -y
kubectl exec -n drupalpoc <pod> -c drupal -- php /var/www/html/vendor/bin/drush.php cache:rebuild
```

### Post-Deploy Step Added to `deploy-aks.ps1`
**[DIFFICULTY: Intermediate] [CONCEPTS: Drush, Post_Deploy, ConfigMap, Module_Enable]**

To prevent these issues from recurring on future deployments, added **Step 5 (Post-deploy setup)** to `deploy-aks.ps1`:

1. **Apply ConfigMaps** — Ensures the nginx config fix is always applied (uses local `kubectl` since k8s files aren't mounted in the azure-cli sidecar)
2. **Restart Drupal deployment** — Picks up ConfigMap changes
3. **Enable custom modules** — Runs `drush pm:install` for each module in the `$customModules` array (currently: `mailpit_link`)
4. **Rebuild caches** — `drush cache:rebuild` to regenerate CSS/JS aggregation references

**Key Detail:** The post-deploy step uses local `kubectl` (not the DDEV sidecar) because:
- ConfigMap apply needs local filesystem access to `k8s/configmaps.yaml`
- Local kubectl has the AKS kubeconfig (copied from sidecar earlier via `docker cp`)
- Direct kubectl exec is more reliable than nesting `ddev exec -s azure-cli kubectl exec`

**Drush Invocation Pattern in AKS:**
```powershell
# Use drush.php (not the shell shim at vendor/bin/drush)
kubectl exec -n drupalpoc <pod> -c drupal -- php /var/www/html/vendor/bin/drush.php <command>
```

The shell shim at `vendor/bin/drush` is a bash script that tries to re-exec itself — it prints the script source instead of running Drush when invoked via `kubectl exec`. Using `vendor/bin/drush.php` calls the PHP entry point directly.

**[LLM_CONTEXT: Two critical AKS deployment lessons: (1) Nginx must have `try_files $uri /index.php?$query_string` in the static file location block — without it, Drupal's lazy CSS/JS aggregation breaks and the admin is unstyled. (2) Drupal module enable state lives in the database, not the filesystem — deploying a new Docker image does NOT auto-enable modules. The deploy script's Step 5 handles both. When running Drush via kubectl exec, always use `vendor/bin/drush.php` (PHP file), not `vendor/bin/drush` (shell shim). Port 8080 is typically occupied by Docker/DDEV — use 9090+ for port-forwarding.]**

---

## Mailpit Link 404 Fix — Environment-Aware Redirect (Mar 9, 2026)
**[SECTION_METADATA: CONCEPTS=Drupal,Custom_Module,Environment_Config,AKS | DIFFICULTY=Beginner-Intermediate | TOOLS=kubectl,Drush | RESPONDS_TO: Debugging_Troubleshooting]**

### Problem
**[DIFFICULTY: Beginner] [CONCEPTS: Drupal, Custom_Module, Routing]**

After enabling the `mailpit_link` module on AKS (previous fix), clicking the **Mailpit** link in the Drupal admin sidebar returned a **404 Not Found** in the browser.

### Root Cause

The `MailpitRedirectController` unconditionally redirected to `http://<current-host>:8025`:

```php
public function redirectToMailpit(): TrustedRedirectResponse {
    $request = $this->requestStack->getCurrentRequest();
    $host = $request->getHost();
    $url = 'http://' . $host . ':8025';
    return new TrustedRedirectResponse($url);
}
```

This only works in **DDEV local development**, where Mailhog listens on port 8025 of the same host. On AKS:
- Via `kubectl port-forward` (localhost:9091) → redirects to `http://localhost:8025` → nothing listening → 404
- Via ingress (20.85.112.48) → redirects to `http://20.85.112.48:8025` → port not exposed → 404

Mailpit/Mailhog is a **dev-only tool** (per Architecture.md: "Mailhog — DDEV only (local), Captures GoPhish emails during local dev, Replaced by real SMTP in production"). There is no Mailpit service deployed to AKS.

### Fix

Made the controller **environment-aware** using a `MAILPIT_URL` environment variable:

```php
public function redirectToMailpit(): TrustedRedirectResponse|array {
    $mailpitUrl = getenv('MAILPIT_URL');

    if ($mailpitUrl && $mailpitUrl !== '') {
        if ($mailpitUrl === 'disabled') {
            return [
                '#markup' => '<p>Mailpit is not available in this environment. '
                    . 'Mailpit/Mailhog is a local development tool for capturing emails. '
                    . 'In production, emails are sent via a real SMTP server.</p>',
            ];
        }
        return new TrustedRedirectResponse($mailpitUrl);
    }

    // Default: DDEV local development — Mailhog on same host, port 8025.
    $request = $this->requestStack->getCurrentRequest();
    $host = $request->getHost();
    $url = 'http://' . $host . ':8025';
    return new TrustedRedirectResponse($url);
}
```

**Behavior by environment:**

| Environment | `MAILPIT_URL` | Behavior |
| :--- | :--- | :--- |
| DDEV (local) | Not set | Redirects to `http://drupalpoc.ddev.site:8025` (Mailhog) |
| AKS | `disabled` | Renders informational message (no redirect) |
| Custom | Any URL | Redirects to that URL (future flexibility) |

### Files Changed

1. **`web/modules/custom/mailpit_link/src/Controller/MailpitRedirectController.php`** — Added `MAILPIT_URL` env var check with three branches: disabled → render message, URL → redirect, unset → original DDEV behavior
2. **`k8s/drupal-deployment.yaml`** — Added `MAILPIT_URL: disabled` env var to the Drupal container

### Deployment Steps

```powershell
# 1. Apply updated deployment (sets MAILPIT_URL=disabled, triggers rolling update)
kubectl apply -f k8s/drupal-deployment.yaml
kubectl rollout status deployment/drupal -n drupalpoc --timeout=120s

# 2. Copy updated PHP file into running pod (avoids full image rebuild)
$pod = kubectl get pods -n drupalpoc -l app=drupal -o jsonpath='{.items[0].metadata.name}'
kubectl cp web/modules/custom/mailpit_link/src/Controller/MailpitRedirectController.php \
    "drupalpoc/${pod}:/var/www/html/web/modules/custom/mailpit_link/src/Controller/MailpitRedirectController.php" -c drupal

# 3. Clear cache
kubectl exec -n drupalpoc $pod -c drupal -- php vendor/bin/drush.php cr
```

**Note:** The `kubectl cp` is a hotfix shortcut. On the next full `deploy-aks.ps1` run, the updated controller is baked into the Docker image automatically.

### No Deploy Script Changes Needed

The existing `deploy-aks.ps1` already handles this:
- **Step 2 (Build)** — Rebuilds Docker image with updated PHP file
- **Step 5 (Post-deploy)** — Enables `mailpit_link` module and rebuilds caches
- The `MAILPIT_URL=disabled` env var is in `drupal-deployment.yaml`, which is applied during initial cluster setup

**[LLM_CONTEXT: The `mailpit_link` module's redirect controller is environment-aware via the `MAILPIT_URL` env var. In DDEV (no env var), it redirects to Mailhog on port 8025. On AKS (`MAILPIT_URL=disabled`), it renders an inline message instead. This pattern can be extended post-POC when a real SMTP service replaces Mailhog — just set `MAILPIT_URL` to the SMTP admin UI URL. The env var is set in `k8s/drupal-deployment.yaml`, not in secrets, because it's not sensitive.]**
