# Architecture

**[SECTION_METADATA: CONCEPTS=Decoupled_Drupal,Angular,DotNet8,AKS,Azure,GoPhish,Microservices,Security_Awareness_Training | DIFFICULTY=Intermediate-Advanced | PREREQUISITES=DDEV_Setup | RESPONDS_TO: Architectural_Decision, Implementation_How-To]**

## Project Summary

The **TSUS Security Awareness Training Platform** is a cybersecurity training and phishing simulation system built for the Texas State University System (TSUS). It serves approximately **100,000–120,000 students and faculty** across multiple TSUS member institutions.

The platform is modeled after commercial products like **KnowBe4** and **Proofpoint Security Awareness Training**. It provides:

- **Security awareness training modules** — short, focused courses covering topics like phishing, social engineering, password hygiene, and data handling.
- **Phishing simulations** — realistic simulated phishing emails sent to users, with click tracking and reporting to measure susceptibility and improvement over time.
- **Quizzes and assessments** — embedded knowledge checks tied to training content, with automatic scoring.
- **Compliance dashboards** — per-institution visibility into training completion rates, quiz scores, and simulation results so administrators can track compliance and target remediation.
- **Video-based content delivery** — embedded training videos from YouTube/Vimeo, supplemented by written modules authored in Drupal.

The goal is to give TSUS an in-house, cost-effective alternative to expensive commercial SaaS products, while maintaining full control over data, branding, and integration with existing university systems (LTI 1.3, Azure AD SSO — planned post-POC).

This repository contains the **proof-of-concept (POC)**, which demonstrates the full microservice architecture running on Azure Kubernetes Service (AKS) within a one-week timeline. The POC proves the pattern works end-to-end; post-POC, the platform scales up to production with expanded business logic, authentication, multi-tenancy, and reporting.

---

## POC Architecture (Mar 2026)

**[DIFFICULTY: Advanced] [CONCEPTS: Decoupled_Drupal, JSON_API, Angular, .NET_8, AKS, Azure, GoPhish, Phishing_Simulation] [ARCHITECTURE_DECISIONS: POC_Scope, Build_vs_Borrow]**

### Design Philosophy

This is a **proof-of-concept** with a < 1 week timeline. The goal is to demonstrate a working microservice architecture on AKS that can be "scaled up" — not to build every feature. We leverage free/open-source tools aggressively and defer custom development where possible.

**Pitch statement:** _"The microservice architecture is already deployed and working on Azure Kubernetes Service. We just need to scale it up."_

### Architecture Diagram

```mermaid
graph TB
    subgraph "Azure Kubernetes Service (AKS)"
        direction TB

        subgraph "Frontend Tier"
            Angular["🅰️ Angular SPA<br/>(Angular Material + Chart.js)<br/>Trainee Dashboard"]
        end

        subgraph "API Tier"
            DotNet[".NET 8 Web API<br/>(Thin Stub)<br/>Health · Scores · Results"]
        end

        subgraph "CMS Tier"
            Drupal["🔵 Drupal 11 Headless<br/>(JSON:API + Webform)<br/>Content Authoring"]
        end

        subgraph "Simulation Tier"
            GoPhish["📧 GoPhish<br/>(Phishing Campaigns)<br/>REST API + Click Tracking"]
        end

        Angular -- "JSON:API<br/>(Training Content,<br/>Quizzes)" --> Drupal
        Angular -- "REST API<br/>(Scores, Completions)" --> DotNet
        Angular -- "REST API<br/>(Campaign Results,<br/>Click Tracking)" --> GoPhish
    end

    subgraph "Azure Managed Services"
        AzureSQL["🗄️ Azure SQL Server<br/>(Transactional Data)<br/>Scores · Completions · Tenants"]
        AzureMySQL["🗄️ Azure MySQL<br/>(Drupal Content Store)"]
    end

    subgraph "External Services"
        YouTube["🎬 YouTube / Vimeo<br/>(Unlisted Embeds)<br/>Training Videos"]
        GHCR["📦 GHCR<br/>(Container Images)"]
        GitHubActions["⚙️ GitHub Actions<br/>(CI/CD Pipeline)"]
    end

    subgraph "Local Development Only"
        DDEV["🐳 DDEV v1.25.0<br/>(PHP 8.4 · MariaDB 11.8 · Drush 13.7.1)"]
        Mailhog["📬 Mailhog<br/>(Email Capture)"]
        AzureCLI["☁️ Azure CLI Sidecar<br/>(mcr.microsoft.com/azure-cli)<br/>kubectl · az commands"]
        DDEV --> Mailhog
        DDEV --> AzureCLI
    end

    DotNet --> AzureSQL
    Drupal --> AzureMySQL
    Angular -- "Embedded iframes" --> YouTube
    GitHubActions -- "Build & Push" --> GHCR
    GHCR -- "Pull Images" --> Angular
    GHCR -- "Pull Images" --> DotNet
    GHCR -- "Pull Images" --> Drupal
    GHCR -- "Pull Images" --> GoPhish

    User["👤 Trainee<br/>(Student / Faculty)"] --> Angular
    Admin["👤 Admin<br/>(Content Editor)"] --> Drupal

    style Angular fill:#dd0031,color:#fff
    style DotNet fill:#512bd4,color:#fff
    style Drupal fill:#0678be,color:#fff
    style GoPhish fill:#7b68ee,color:#fff
    style AzureSQL fill:#003545,color:#fff
    style AzureMySQL fill:#003545,color:#fff
    style YouTube fill:#ff0000,color:#fff
    style GHCR fill:#24292e,color:#fff
    style GitHubActions fill:#24292e,color:#fff
    style Mailhog fill:#4caf50,color:#fff
    style DDEV fill:#00aa00,color:#fff
    style AzureCLI fill:#0078d4,color:#fff
```

### Service Inventory

| Service | Deployment | Backing Store | POC Scope | Post-POC Expansion |
| :--- | :--- | :--- | :--- | :--- |
| **Angular SPA** | AKS (2 replicas) | — | Training module viewer, quiz UI, basic dashboard | Full reporting dashboard, simulation inbox, collaboration |
| **.NET 8 Web API** | AKS (2 replicas) | Azure SQL Server | Thin stub: health check, save simulation result, get scores (2–3 endpoints) | Full business logic: auth, LTI 1.3, scoring engine, analytics aggregation |
| **Drupal 11 Headless** | AKS (1 replica) | Azure MySQL | Training Module content type (6 fields), phishing quiz webform (5 questions), 6 taxonomy categories, JSON:API + CORS configured | Full content modeling, workflow, permissions, tenant-scoped content |
| **GoPhish** | AKS (1 replica) | SQLite (internal) | Basic phishing campaign with click tracking via REST API | Custom templates, scheduled campaigns, SMTP integration |
| **Mailhog** | DDEV only (local) | — | Captures GoPhish emails during local dev | Replaced by real SMTP in production |
| **YouTube/Vimeo** | External (embeds) | — | Unlisted training videos embedded in Drupal content | Azure Blob Storage or Azure Media Services |
| **Azure CLI** | DDEV sidecar | — | Azure provisioning + kubectl from inside Docker (no local install) | Not needed in production |

> **Note:** Webform 6.3.x-dev is the only branch compatible with Drupal 11 (stable releases only support D10). Locked at commit `13ce2a6`.

### Data Flow

```
Trainee (Browser)
  → Angular SPA (AKS)
      → Drupal JSON:API (AKS → Azure MySQL)     ... training content, quizzes
      → .NET 8 API (AKS → Azure SQL)            ... scores, completions, tenant data
      → GoPhish REST API (AKS)                   ... campaign results, click tracking
      → YouTube/Vimeo (embedded iframes)         ... training videos

Admin (Browser)
  → Drupal Admin UI (AKS → Azure MySQL)         ... content authoring
```

### CI/CD Pipeline

```
Developer Push (GitHub)
  → GitHub Actions
      → Build Docker images (Angular, .NET, Drupal, GoPhish)
      → Push to GHCR (GitHub Container Registry)
      → Deploy to AKS via kubectl / Helm
```

**Pattern:** OIDC auth from GitHub Actions to Azure, GHCR for image storage, AKS for deployment.

### Azure Resources (POC) — Provisioned

All resources provisioned on **Day 1 (Mar 4, 2026)**. See **[📋 Planning](Planning)** for the full checklist.

| Resource | Name | Location | Tier | FQDN / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Resource Group** | `rg-fulleralex47-0403` | eastus2 | — | Logical container for all resources |
| **AKS Cluster** | `drupalpoc-aks` | eastus2 | Free tier (1 node, Standard_B2s) | K8s v1.33.6, 1 node Ready |
| **Azure SQL Server** | `drupalpoc-sql` | centralus | Basic / DTU 5 (~$5/mo) | `***REDACTED_SQL_HOST***` · DB: `drupalpoc` |
| **Azure MySQL** | `drupalpoc-mysql` | centralus | Burstable B1ms (~$6/mo) | `***REDACTED_MYSQL_HOST***` · DB: `drupal` |
| **Storage Account** | (existing) | eastus2 | — | AKS diagnostics |

> **Region note:** SQL and MySQL are in `centralus` because `eastus2` had capacity constraints for SQL Server provisioning during Day 1. The resource group location (`eastus2`) is a logical designation only — resources can be in any region.

### POC Build vs. Borrow Strategy

**[ARCHITECTURE_DECISIONS: Build_vs_Borrow, POC_Scope]**

| Component | Strategy | Tool/Approach | Rationale |
| :--- | :--- | :--- | :--- |
| Content management | **Borrow** | Drupal 11 JSON:API (built into core) | Zero custom code for REST API |
| Quizzes/assessments | **Borrow** | Drupal Webform module (free) | Form builder with scoring, no custom quiz engine |
| Phishing simulations | **Borrow** | GoPhish (open source, Apache 2.0) | Full campaign engine with REST API, click tracking |
| Training videos | **Borrow** | YouTube/Vimeo unlisted embeds | No video infrastructure needed |
| Email testing | **Borrow** | Mailhog (built into DDEV) | Captures outbound emails locally |
| Discussion forums | **Borrow** | Drupal Forum module (in core) | Basic threaded discussions |
| Frontend UI | **Borrow** | Angular Material | Pre-built component library |
| Dashboard charts | **Borrow** | Chart.js / ngx-charts | Drop-in charting |
| Business logic API | **Build** (thin) | .NET 8 Web API | 2-3 endpoints: health, save result, get scores |
| Container images | **Build** | Dockerfiles + multi-stage | One per service |
| CI/CD pipeline | **Build** | GitHub Actions | Build → GHCR → AKS |
| AKS manifests | **Build** | Kubernetes YAML / Helm | Deployment, service, ingress per service |

### Deferred to Post-POC

See **[📋 Planning](Planning)** for the full post-POC backlog with checkboxes.

| Feature | Reason for Deferral |
| :--- | :--- |
| Azure AD / SSO | Complex integration — use Drupal built-in auth for POC |
| LTI 1.3 provider | Complex protocol — document integration point only |
| Multi-tenancy (tenant isolation) | Database schema concern — single-tenant for POC |
| Redis caching | Irrelevant at POC scale |
| Solr / Elasticsearch | Drupal core search is sufficient for demo |
| Azure Blob Storage | Use YouTube embeds + Drupal file uploads for POC |
| Full .NET business logic | Thin stub proves the pattern; expand later |
| Auto-grading engine | Webform handles basic scoring for POC |

### POC Implementation Timeline

**Full task breakdown:** See **[📋 Planning](Planning)**

| Day | Focus | Deliverable | Status |
| :--- | :--- | :--- | :--- |
| **Day 1** | Azure provisioning (AKS, SQL, MySQL) + Drupal content modeling | Infrastructure + content types | ✅ Complete |
| **Day 2** | Dockerfiles for all services + GHCR push | 3 container images in GHCR (GoPhish, Drupal FPM, Drupal Nginx) | ✅ Complete |
| **Day 3** | AKS deployment manifests + .NET thin API | Services running on AKS | ⬜ Not started |
| **Day 4** | Angular scaffold + connect to Drupal JSON:API + GoPhish | Working frontend | ⬜ Not started |
| **Day 5** | Dashboard, demo data, polish | Pitch-ready demo | ⬜ Not started |

**[LLM_CONTEXT: This is the POC architecture. Days 1-2 are COMPLETE. Day 1: all Azure resources provisioned and verified, Drupal content model built (Training Module type with 6 fields, phishing quiz webform with 5 questions, 6 taxonomy categories, 3 sample nodes seeded, JSON:API + CORS configured). Day 2: 4 Dockerfiles created under `docker/` (GoPhish, .NET API, Angular, Drupal 3-stage), 3 images built and pushed to GHCR (`drupalpoc-gophish`, `drupalpoc-drupal`, `drupalpoc-drupal-nginx`). The Drupal image uses php:8.4-fpm + nginx (NOT the official drupal:11 image). The .NET and Angular images need their source projects scaffolded on Day 3-4 before building. Webform 6.3.x-dev is the only D11-compatible branch (locked at commit 13ce2a6). Azure CLI runs as a DDEV sidecar container — no local install needed. SQL and MySQL are in centralus due to eastus2 capacity constraints. The .NET API is intentionally thin (2-3 endpoints) to stay within the <1 week timeline. GoPhish is the "wow factor" for the pitch — a real phishing simulation engine. webform_rest module will be needed on Day 4 for quiz API exposure. Post-POC, the .NET API expands to handle auth, LTI, scoring, analytics, and tenant isolation. Do not suggest adding deferred features back into the POC scope. For detailed task tracking, see [Planning](Planning).]**
