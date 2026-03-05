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
| - [ ] | GHCR Access from AKS | Image pull secret | So AKS can pull container images from GitHub |

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

### Day 2 — Dockerfiles + Container Registry

**Dockerfiles:**
- [ ] Create Dockerfile for Angular SPA (multi-stage: Node build → Nginx serve)
- [ ] Create Dockerfile for .NET 8 Web API (multi-stage: SDK build → runtime)
- [ ] Create Dockerfile for Drupal 11 (based on official PHP image + Composer install)
- [ ] Create Dockerfile for GoPhish (based on official GoPhish image or custom build)

**Container Registry:**
- [ ] Build all 4 images locally and test
- [ ] Push images to GHCR (`ghcr.io/fullera8/drupalpoc-*`)
- [ ] Verify images are accessible from GHCR

### Day 3 — AKS Deployment + .NET Thin API

**AKS Manifests:**
- [ ] Create Kubernetes namespace (`drupalpoc`)
- [ ] Create Deployment + Service for Angular SPA
- [ ] Create Deployment + Service for .NET 8 API
- [ ] Create Deployment + Service for Drupal 11
- [ ] Create Deployment + Service for GoPhish
- [ ] Create Ingress (nginx) for external access
- [ ] Create GHCR image pull secret in AKS
- [ ] Create ConfigMaps / Secrets for database connection strings
- [ ] Verify all pods running (`kubectl get pods -n drupalpoc`)

**.NET 8 Thin API:**
- [ ] Scaffold .NET 8 Web API project
- [ ] Implement `GET /health` endpoint
- [ ] Implement `POST /api/results` endpoint (save simulation result to Azure SQL)
- [ ] Implement `GET /api/scores` endpoint (retrieve scores from Azure SQL)
- [ ] Configure Entity Framework Core with Azure SQL connection string
- [ ] Test locally, then deploy to AKS

### Day 4 — Angular Frontend + Integrations

**Angular Scaffold:**
- [ ] Create Angular project with Angular Material
- [ ] Configure routing (dashboard, modules, quiz, simulation results)
- [ ] Install Chart.js / ngx-charts for dashboard

**Integrations:**
- [ ] Connect to Drupal JSON:API (fetch training modules, display list)
- [ ] Connect to .NET API (fetch scores, post results)
- [ ] Connect to GoPhish REST API (fetch campaign results, click tracking stats)
- [ ] Embed YouTube/Vimeo training video in module viewer
- [ ] Build basic quiz component (renders Webform questions, submits answers)

### Day 5 — Dashboard, Demo Data, Polish

**Reporting Dashboard:**
- [ ] Build compliance dashboard page (Chart.js bar/pie charts)
- [ ] Display: completion rates, simulation click rates, quiz scores
- [ ] Pull data from .NET API + GoPhish API

**Demo Data & Polish:**
- [ ] Seed Drupal with 5–10 training modules across categories
- [ ] Seed 1–2 GoPhish phishing campaigns with mock results
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

**[LLM_CONTEXT: This is the POC task tracker. Check boxes (- [x]) indicate completed items. The developer updates these as work progresses. Day 1 is the highest-risk day (Azure provisioning). If blocked, the fallback is DDEV local development. Post-POC backlog items should NOT be pulled into the POC timeline. The risk register identifies the most likely blockers and their mitigations.]**
