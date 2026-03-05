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
