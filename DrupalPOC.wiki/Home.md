# DrupalPOC Wiki

**[DOCUMENT_TYPE: Navigation_Hub] [PURPOSE: Documentation_Index] [TARGET_AUDIENCE: Human_Developers] [RESPONDS_TO: Simple_Factual] [METADATA_SCHEMA_VERSION: 1.1]**

## Documentation Architecture

This wiki uses a **tiered documentation system** optimized for LLM-assisted development. See the **[📖 Metadata Legend](Metadata-Legend)** for all tag definitions, interpretation rules, and query routing.

### Architecture & Planning
- **[🏗️ Architecture](Architecture)** - POC architecture diagram (Mermaid), service inventory, build-vs-borrow strategy
- **[📋 Planning](Planning)** - Day-by-day task breakdown with checkboxes, Azure provisioning checklist, risk register, post-POC backlog

### Reference
- **[💬 Chat Log](ChatLog)** - Running conversation log: architecture decisions, setup history, debugging, and design rationale
- **[📖 Metadata Legend](Metadata-Legend)** - Tag definitions, LLM interpretation rules, canonical naming, query routing

## Project Overview

**Project:** Security Awareness Training Platform for the Texas State University System (TSUS)
**Comparable Products:** KnowBe4, Proofpoint Security Awareness Training
**Expected Users:** 100,000–120,000 (students, faculty, staff across multiple TSUS institutions)
**Multi-Tenancy:** Single platform with tenant isolation per institution

### Tech Stack (Planned)
- **CMS:** Drupal 11 (headless, JSON:API) — content authoring for training modules, simulations, and assessments
- **Frontend:** Angular (SPA) — student/faculty-facing training UI
- **Backend API:** .NET 8 Web API — business logic, simulation engine, assessment scoring, analytics aggregation
- **Authentication:** Azure Active Directory (Entra ID) — institutional SSO
- **Database:** Azure SQL Server (transactional data) + Azure MySQL (Drupal content)
- **Cache:** Redis (session + caching at scale)
- **Search:** Solr or Elasticsearch (training module discovery)
- **File Storage:** Azure Blob Storage (training videos, simulation assets, reports)
- **Containerization:** Docker (local via DDEV) → AKS (production)
- **CI/CD:** GitHub Actions → GHCR → AKS
- **Cloud:** Microsoft Azure
- **LTI:** LTI 1.3 compliant (integration with institutional LMS platforms)
- **Version Control:** GitHub (private repo: [fullera8/DrupalPOC](https://github.com/fullera8/DrupalPOC))

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

## Getting Started

1. Ensure Docker Desktop and DDEV are installed
2. Clone the repo and run `ddev start`
3. Read the [💬 Chat Log](ChatLog) for full setup history and architecture decisions
