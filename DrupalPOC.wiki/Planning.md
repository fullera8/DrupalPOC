# Planning

**[SECTION_METADATA: CONCEPTS=POC,Timeline,Azure_Provisioning,Task_Tracking | DIFFICULTY=Intermediate | RESPONDS_TO: Implementation_How-To]**

## POC Implementation Plan (Mar 2026)

**Timeline:** < 1 week
**Goal:** Pitch-ready demo of microservice architecture on AKS with real Azure backing services.
**Architecture Reference:** See **[🏗️ Architecture](Architecture)** for diagrams and design decisions.

---

## Azure Provisioning Checklist

| Status | Resource | Tier | Notes |
| :--- | :--- | :--- | :--- |
| - [x] | AKS Cluster | Free tier (1 node pool, B2s VMs) | `drupalpoc-aks` in `eastus2`, K8s v1.33.6 |
| - [x] | Azure SQL Server + Database | Basic / DTU 5 (~$5/mo) | `drupalpoc-sql` + `drupalpoc` DB in `centralus` |
| - [x] | Azure Database for MySQL | Burstable B1ms (~$6/mo) | `drupalpoc-mysql` + `drupal` DB in `centralus` |
| - [x] | Resource Group | Existing | Already provisioned |
| - [x] | Storage Account | Existing | Already provisioned |
| - [x] | GHCR Access from AKS | Image pull secret | `ghcr-secret` created in `drupalpoc` namespace |

---

## Day-by-Day Plan

### Day 1 — Infrastructure + Drupal Content Modeling

**Azure Provisioning:**
- [x] Create AKS cluster (free tier, 1 node pool, B2s VMs)
- [x] Create Azure SQL Server + `drupalpoc` database
- [x] Create Azure Database for MySQL + `drupal` database
- [x] Verify `kubectl` connectivity to AKS
- [x] Verify database connectivity from local machine

**Drupal Content Modeling:**
- [x] Enable JSON:API module (core, should be enabled by default)
- [x] Install and configure Webform module (`ddev composer require drupal/webform`)
- [x] Create "Training Module" content type (title, description, video embed URL, category, difficulty)
- [x] Create "Quiz" webform (multiple choice questions, scoring)
- [x] Create sample training content (2–3 modules + 1 quiz)
- [x] Verify JSON:API endpoints return content (`/jsonapi/node/training_module`)

### Day 2 — Dockerfiles + Container Registry (Mar 5, 2026) ✅

**Dockerfiles:**
- [x] Create Dockerfile for Angular SPA (multi-stage: Node 22 build → Nginx serve) — placeholder, needs Day 4 source
- [x] Create Dockerfile for .NET 8 Web API (multi-stage: SDK build → ASP.NET runtime) — placeholder, needs Day 3 source
- [x] Create Dockerfile for Drupal 11 (3-stage: Composer → PHP 8.4-FPM → Nginx sidecar) — produces 2 images
- [x] Create Dockerfile for GoPhish (thin wrapper on `gophish/gophish:latest`)
- [x] Create `.dockerignore` for clean build context
- [x] Create `docker/drupal/settings.php` — production settings with Azure MySQL via env vars
- [x] Create `docker/drupal/nginx.conf` — Drupal front-controller + PHP-FPM proxy
- [x] Create `docker/angular/nginx.conf` — SPA routing + `/healthz` health check

**Container Registry:**
- [x] Build 3 images locally (`drupalpoc-gophish`, `drupalpoc-drupal`, `drupalpoc-drupal-nginx`)
- [x] Smoke test Drupal image (PHP extensions + Drush verified)
- [x] Authenticate to GHCR (GitHub PAT with `write:packages`)
- [x] Push 3 images to GHCR (`ghcr.io/fullera8/drupalpoc-*`)
- [x] Verify images accessible via `docker manifest inspect`
- [x] Build + push `drupalpoc-api` (Day 3 — .NET scaffold complete)
- [x] Build + push `drupalpoc-angular` (Day 4 Angular scaffold complete)

### Day 3 — AKS Deployment + .NET Thin API

**AKS Manifests:**
- [x] Create Kubernetes namespace (`drupalpoc`)
- [x] Create Deployment + Service for Angular SPA
- [x] Create Deployment + Service for .NET 8 API
- [x] Create Deployment + Service for Drupal 11
- [x] Create Deployment + Service for GoPhish
- [x] Create Ingress (nginx) for external access
- [x] Create GHCR image pull secret in AKS
- [x] Create ConfigMaps / Secrets for database connection strings
- [x] Verify all pods running (`kubectl get pods -n drupalpoc`)

**.NET 8 Thin API:**
- [x] Scaffold .NET 8 Web API project
- [x] Implement `GET /health` endpoint
- [x] Implement `POST /api/results` endpoint (save simulation result to Azure SQL)
- [x] Implement `GET /api/scores` endpoint (retrieve scores from Azure SQL)
- [x] Configure Entity Framework Core with Azure SQL connection string
- [x] Test locally against Azure SQL (all 3 endpoints verified)
- [x] Deploy to AKS — all 4 pods running, ingress at `20.85.112.48`

### Day 4 — Angular Frontend + Integrations

**Angular Scaffold:**
- [x] Create Angular project with Angular Material
- [x] Configure routing (dashboard, modules, quiz, simulation results)
- [x] Install Chart.js / ngx-charts for dashboard

**Integrations:**
- [x] Connect to Drupal JSON:API (fetch training modules, display list)
- [x] Connect to .NET API (fetch scores, post results)
- [x] Connect to GoPhish REST API (fetch campaign results, click tracking stats)
- [x] Embed YouTube/Vimeo training video in module viewer
- [x] Build basic quiz component (renders Webform questions, read-only preview)
- [x] Upgrade quiz to interactive with scoring + .NET API submission
- [x] Build results page with Material table + summary stats

### Day 5 — Dashboard, Demo Data, Polish

**Reporting Dashboard:**
- [x] Build compliance dashboard page (Chart.js bar/pie charts)
- [x] Display: completion rates, simulation click rates, quiz scores
- [x] Pull data from .NET API + GoPhish API

**Demo Data & Polish:**
- [ ] Seed Drupal with 5–10 training modules across categories
- [x] Seed 1–2 GoPhish phishing campaigns with mock results
- [ ] Seed Azure SQL with sample scores and completions
- [ ] End-to-end walkthrough: trainee views module → takes quiz → views dashboard
- [ ] Verify all services accessible via AKS ingress URL
- [ ] Take screenshots for wiki / pitch deck

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| AKS provisioning delays | Medium | High | Continue with DDEV locally; deploy to AKS on Day 2–3 |
| Azure SQL connectivity issues | Low | Medium | Use DDEV MariaDB as fallback; swap connection string later |
| GoPhish Docker image build issues | Low | Medium | Use pre-built GoPhish Docker image from Docker Hub |
| Drupal JSON:API CORS issues | High | Low | Configure CORS in Drupal `services.yml` or use proxy |
| Angular ↔ multi-service auth | Medium | Low | No auth for POC; all endpoints open |
| Timeline overrun | Medium | Medium | Cut dashboard charts first; focus on working data flow |

---

## Post-POC Backlog

These items are **intentionally deferred** from the POC. They represent the "scale up" work referenced in the pitch.

- [ ] Azure AD / Entra ID SSO integration
- [ ] LTI 1.3 provider implementation (.NET API)
- [ ] Multi-tenancy: tenant isolation via tenant ID in Azure SQL
- [ ] Full .NET business logic (scoring engine, analytics aggregation, enrollment)
- [ ] Redis caching layer
- [ ] Solr / Elasticsearch for training module search
- [ ] Azure Blob Storage for video hosting (replace YouTube embeds)
- [ ] Auto-grading engine (replace Webform basic scoring)
- [ ] HPA (Horizontal Pod Autoscaler) configuration for AKS
- [ ] GitHub Actions CI/CD pipeline (automated build → GHCR → AKS)
- [ ] Production Ingress with TLS certificates
- [ ] Monitoring & logging (Azure Monitor, Application Insights)
- [ ] Containerize Angular dev workflow (eliminate host `node_modules`) — POC scaffolds via `docker run --rm -v` which writes `node_modules` to the host volume. Production-grade approach: use a named Docker volume or multi-stage dev container so `node_modules` never lands on the host filesystem. This avoids platform-specific native module issues and ensures true "clone-and-go" portability.
- [ ] Separate Angular services — POC uses a single `DrupalService` for all Drupal API calls (JSON:API + webform_rest). Post-POC: split into `TrainingModuleService`, `QuizService`, etc. based on client-specific requirements after bid is won.
- [ ] SMTP integration for phishing campaigns — POC uses Mailhog (DDEV-only) for email capture. Production requires a real SMTP relay (e.g., Azure Communication Services, SendGrid, or institutional SMTP) so GoPhish can deliver simulated phishing emails to actual user inboxes.

**[LLM_CONTEXT: This is the POC task tracker. Check boxes (- [x]) indicate completed items. The developer updates these as work progresses. Day 1 is the highest-risk day (Azure provisioning). If blocked, the fallback is DDEV local development. Post-POC backlog items should NOT be pulled into the POC timeline. The risk register identifies the most likely blockers and their mitigations.]**
