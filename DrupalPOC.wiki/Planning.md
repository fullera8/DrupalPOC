# Planning

**[SECTION_METADATA: CONCEPTS=POC,Timeline,Azure_Provisioning,Task_Tracking | DIFFICULTY=Intermediate | RESPONDS_TO: Implementation_How-To]**
**[PERPLEXITY_INGESTION: Cost_Analysis]**

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
| - [x] | Open Brain Resource Group | — | `rg-openbrain` in `eastus2` |
| - [x] | Open Brain Container Registry | Basic | `openbrainacr.azurecr.io` in `eastus2` |
| - [x] | Open Brain Container App + Env | Consumption (0–3 replicas) | `openbrain-aca` in `eastus2` (scale-to-zero) |
| - [x] | Open Brain SQL Server + Database | Basic DTU 5 | `openbrain-sql` + `openbrain-db` in `centralus` (VECTOR 1536) |
| - [x] | Open Brain Key Vault | Standard | `kvob-7kqm2qodhvyos` in `eastus2` |
| - [x] | Azure OpenAI + Embedding Model | Standard | `ps-azopenai-eastus-afuller2` in `eastus` — `text-embedding-3-small` |

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
- [x] Seed Drupal with 3 training modules across 3 categories (infrastructure proven, expand content post-POC)
- [x] Seed 1–2 GoPhish phishing campaigns with mock results
- [ ] Seed Azure SQL with sample scores and completions
- [ ] End-to-end walkthrough: trainee views module → takes quiz → views dashboard
- [x] Verify all services accessible via AKS ingress URL
- [ ] Take screenshots for wiki / pitch deck

### Landing Page — HomeComponent (Mar 20, 2026) ✅

- [x] Create `HomeComponent` standalone component with inline template/styles
- [x] Copy UTSA brand assets to `src/angular/public/images/` (backdrop, logo)
- [x] Hero section with campus backdrop, gradient overlay, CTAs
- [x] Value proposition cards (4 cards on Limestone background)
- [x] Training pathway tiles (4 clickable `mat-card` links to `/modules` and `/results`)
- [x] Live KPI row (quiz attempts, pass rate, campaigns, click rate via ApiService + GophishService)
- [x] Footer with placeholder links and UTSA attribution
- [x] Update sidenav: add Home as first nav item (5 total)
- [x] Change default route from `/dashboard` to `/home`
- [x] Add Montserrat font (Google Fonts, wght 600/700/800) for headlines
- [x] Angular build verified (zero errors)

### Dashboard Visual Overhaul — UTSA Branding (Mar 20, 2026) ✅

- [x] Branded header bar (Midnight Navy, Montserrat title + Roboto subtitle)
- [x] KPI stat blocks (transparent on navy, orange values, white labels, white icons)
- [x] Charts section (Limestone background, UTSA color arrays for bar + pie charts)
- [x] Responsive breakpoints (desktop 4-col/2-col, tablet 2-col/1-col, mobile 1-col)
- [x] Loading spinner with UTSA Orange stroke on navy background
- [x] Edge-to-edge layout (`margin: -24px`)
- [x] Chart.js fonts updated to Roboto
- [x] Angular build verified (zero errors)

### Quiz Visual Overhaul — UTSA Branding (Mar 20, 2026) ✅

- [x] Branded header bar (Midnight Navy, Montserrat title + Roboto subtitle)
- [x] Info banner restyle (Limestone background, UTSA Orange left border, navy icon)
- [x] Question card restyle (white cards, Concrete border, 12px radius, orange number badges, Montserrat titles)
- [x] Required chip restyle (transparent with navy border, replacing `color="accent"`)
- [x] Submit button (UTSA Orange) + Retake button (outlined orange), Montserrat 600
- [x] Pass banner (warm orange `#FFF3E0` + orange left border) + Fail banner (navy `#032044` + white text)
- [x] Loading spinner with UTSA Orange stroke
- [x] Edge-to-edge layout (`margin: -24px`) + Limestone content background
- [x] Responsive breakpoints (tablet ≤768px, mobile ≤480px)
- [x] Angular build verified (zero errors)

### Modules & Module Detail Visual Overhaul — UTSA Branding (Mar 20, 2026) ✅

- [x] Branded header bar (Navy `#032044`, Montserrat title, Roboto subtitle) on both pages
- [x] Pluralsight-inspired split layout on list page (hero panel + dark sidebar accordion)
- [x] Hero placeholder with Athletics Navy background, large orange `play_circle` icon
- [x] Dark sidebar accordion (transparent panels, white text, first expanded, others collapsed)
- [x] Numbered orange circle badges (1, 2, 3…) replacing `play_circle` icons
- [x] Duration chips restyled (`rgba(255,255,255,0.2)` on sidebar, Concrete on detail)
- [x] Module detail: branded header with orange back link, Limestone content area
- [x] Video frame with Athletics Navy `#0C2340` outer frame, 12px radius, shadow
- [x] Description card with "About This Module" title, Concrete border, 12px radius
- [x] Metadata chips: difficulty green/yellow/red, duration/category Concrete with Navy text
- [x] UTSA Orange loading spinners on both pages
- [x] Edge-to-edge layout (`margin: -24px`) on both pages
- [x] Responsive breakpoints (tablet 768px, mobile 480px)
- [x] Angular build verified (zero errors)
- [x] Bugfix: `field_video_url` (Link field) → extract `.uri` from JSON:API object in `mapModule()`
- [x] Bugfix: `field_description` (formatted text) → extract `.value` from JSON:API object in `mapModule()`
- [x] Bugfix: `field_category.data` (entity reference array) → unwrap with `Array.isArray()` in `mapModule()`
- [x] Bugfix: Seed script `find_term_id()` → `find_or_create_term_id()` to auto-create missing taxonomy terms
- [x] Re-seeded training modules with proper category assignments

### Results Visual Overhaul — UTSA Branding (Mar 20, 2026) ✅

- [x] Branded header bar (Midnight Navy `#032044`, Montserrat title + Roboto subtitle)
- [x] Tab group restyled on navy background (orange `#F15A22` active indicator, white labels, transparent background)
- [x] Quiz KPI row (Athletics Navy `#0C2340`, 3-column grid, orange stat values, white labels, thin white borders)
- [x] Quiz scores table (white card wrapper, Concrete `#EBE6E2` header row, branded typography, Limestone hover)
- [x] Pass/fail chips pill-shaped (16px radius) with semantic green/red colors
- [x] Campaign cards (white, 12px radius, Concrete border, subtle shadow)
- [x] Campaign summary stats (5-column grid, orange values, Navy labels, uppercase)
- [x] Campaign target tables matching quiz table styling
- [x] Status chips pill-shaped with semantic colors retained
- [x] Refresh buttons (orange `#F15A22` outlined, Montserrat 600, 8px radius)
- [x] Empty state cards (Limestone background, Concrete left border)
- [x] Error state cards (Limestone background, red left border)
- [x] Loading spinners UTSA Orange via `::ng-deep`
- [x] Edge-to-edge layout (`margin: -24px`)
- [x] Responsive breakpoints (desktop >1024px, tablet 768–1024px, mobile <768px)
- [x] Tab content area Limestone `#F8F4F1` background
- [x] Angular build verified (zero errors)

### Open Brain — MCP Server (Steps 1–12)

See **[🧠 Open Brain](Open-Brain)** for full architecture and **[💬 Chat Log](ChatLog)** Steps 1–12 for implementation details.

**Build (Steps 1–11):**
- [x] Step 1: Project scaffold (17-file structure)
- [x] Step 2: Bicep infrastructure (subscription-scoped, SQL + KV + ACA + RBAC)
- [x] Step 3: SQL schema (3 tables, VECTOR(1536), stored proc)
- [x] Step 4: Embedding service (Azure OpenAI text-embedding-3-small)
- [x] Step 5: Database service (6 functions via tedious, parameterized queries)
- [x] Step 6: Metadata extractor (deterministic rule engine, no LLM)
- [x] Step 7: Four MCP tools (remember, recall, search, forget)
- [x] Step 8: MCP server entry point (Express + StreamableHTTPServerTransport)
- [x] Step 8.5: Pre-deployment fixes (7 surgical corrections)
- [x] Step 9: Deploy embedding model to Azure OpenAI
- [x] Step 10: Azure infrastructure provisioned (Bicep → 16 resources)
- [x] Step 11: Build, test, deploy (TSC clean, Docker → ACR, ACA updated, health OK)

**Integration Testing (Step 12):**
- [x] Fix: Workspace root `.vscode/mcp.json` for VS Code MCP discovery
- [x] Fix: `.ddev/docker-compose.openbrain.yaml` for port 3000 mapping
- [x] Local tests: 6/6 passed (remember, recall, recall-no-match, search, forget, remember-untagged)
- [x] Remote tests: 6/6 passed (same test suite against ACA FQDN)
- [x] Verified shared database (sequential IDs across servers: local 3–4, remote 5–6)

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
- [ ] Azure Key Vault for cross-pod secret management — Replace K8s `stringData` secrets (GoPhish API key, database passwords, GHCR tokens) with Azure Key Vault references using the [Secrets Store CSI Driver](https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver). Pods mount secrets at runtime from Key Vault via `SecretProviderClass`, eliminating plaintext values in K8s manifests and enabling centralized rotation. This was identified as Tier 3 prevention after a GoPhish API key drift incident where the K8s secret and MySQL-backed GoPhish key fell out of sync post-migration.
- [ ] **VPAT 2.5 Accessibility Conformance Report (ACR)** — Produce a completed VPAT 2.5-format ACR for the platform as a formal deliverable (generated from WCAG 2.1 AA testing artifacts in WP15).
  - **Drupal 11:** Drupal core maintains community-contributed accessibility conformance documentation ([Drupal Accessibility](https://www.drupal.org/about/accessibility)). Reference this as the CMS-layer baseline in the ACR and supplement with platform-specific testing results.
  - **Angular Material:** Ships with built-in ARIA support (roles, labels, keyboard navigation) per the [CDK a11y module](https://material.angular.io/cdk/a11y/overview), but has no formal VPAT published by Google. Document Angular Material's ARIA conformance as part of the **platform-level** ACR rather than citing a component-library VPAT.
  - **GoPhish:** Admin-facing only (campaign management, not student-facing). Excluded from the WCAG AA evaluation scope — the ACR should explicitly note GoPhish as out-of-scope with rationale (internal administrative tool, no student/public interaction).
- [ ] Containerize Angular dev workflow (eliminate host `node_modules`) — POC scaffolds via `docker run --rm -v` which writes `node_modules` to the host volume. Production-grade approach: use a named Docker volume or multi-stage dev container so `node_modules` never lands on the host filesystem. This avoids platform-specific native module issues and ensures true "clone-and-go" portability.
- [ ] Separate Angular services — POC uses a single `DrupalService` for all Drupal API calls (JSON:API + webform_rest). Post-POC: split into `TrainingModuleService`, `QuizService`, etc. based on client-specific requirements after bid is won.
- [ ] SMTP integration for phishing campaigns — POC uses Mailhog (DDEV-only) for email capture. Production requires a real SMTP relay (e.g., Azure Communication Services, SendGrid, or institutional SMTP) so GoPhish can deliver simulated phishing emails to actual user inboxes.
- [ ] Environment strategy (Dev / Staging / Production) — Define three deployment tiers with environment-specific configuration. **Dev:** DDEV-based local stack with all services (Drupal, .NET API, Angular, GoPhish) running in containers; uses Mailpit for email capture, MariaDB for Drupal, and a shared MariaDB database for GoPhish (replacing default SQLite). **Staging:** AKS cluster mirroring production topology but on Free/Dev-tier resources; used for integration testing and demo walkthroughs. **Production:** AKS with HPA, TLS ingress, Azure AD SSO, real SMTP relay (Azure Communication Services or institutional), and production-grade database tiers. Environment-specific config managed via `appsettings.{Environment}.json` (.NET), DDEV config overrides (Drupal), and Kubernetes ConfigMaps/Secrets (AKS).
- [ ] Finalize `conversations` table schema before Phase 2 conversation capture
  - Add `message_text NVARCHAR(MAX)` column
  - Confirm direction enum: 'user'/'assistant' vs 'inbound'/'outbound'
  - Add columns for conversation threading if needed
- [ ] Migrate Container App secrets from direct env vars to Key Vault references
  - Requires system-assigned identity RBAC to be established first
  - See chicken-and-egg note in Architecture.md / resources.bicep

**[LLM_CONTEXT: This is the POC task tracker. Check boxes (- [x]) indicate completed items. The developer updates these as work progresses. Day 1 is the highest-risk day (Azure provisioning). If blocked, the fallback is DDEV local development. Post-POC backlog items should NOT be pulled into the POC timeline. The risk register identifies the most likely blockers and their mitigations.]**
