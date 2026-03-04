# TSUS Security Awareness Training Platform

A cybersecurity training and phishing simulation platform for the **Texas State University System (TSUS)**, serving approximately **100,000–120,000 students and faculty** across multiple member institutions.

Modeled after commercial products like **KnowBe4** and **Proofpoint Security Awareness Training**, this platform delivers security awareness courses, simulated phishing campaigns, quizzes, and compliance dashboards — built on open-source tools and deployed to Azure Kubernetes Service (AKS).

> **Status:** Proof-of-concept (POC) — March 2026

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

### Services

| Service | Role | Backing Store |
| :--- | :--- | :--- |
| **Angular SPA** | Trainee-facing UI — training viewer, quiz interface, dashboard | — |
| **.NET 8 Web API** | Business logic — scores, completions, health checks | Azure SQL Server |
| **Drupal 11 Headless** | Content management — training modules, quizzes via JSON:API | Azure MySQL |
| **GoPhish** | Phishing simulation engine — campaigns, email templates, click tracking | SQLite (internal) |

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
| Frontend | Angular + Angular Material + Chart.js | 19.x |
| Business API | .NET 8 Web API (thin stub) | 8.x |
| CMS | Drupal (headless, JSON:API) | 11.3.3 |
| Phishing Engine | GoPhish | Latest |
| Dependency Mgmt | Composer | 2.x |
| CLI | Drush | 13.7.1 |

### Infrastructure & DevOps

| Component | Technology |
| :--- | :--- |
| Container Orchestration | Azure Kubernetes Service (AKS) — Free tier |
| Transactional Database | Azure SQL Server — Basic DTU 5 |
| CMS Database | Azure Database for MySQL — Burstable B1ms |
| Container Registry | GitHub Container Registry (GHCR) |
| CI/CD | GitHub Actions |
| Local Development | DDEV v1.25.0 (Docker-based) |
| Local Email Testing | Mailhog (built into DDEV) |

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
├── composer.json            # PHP dependencies (Drupal, Drush)
├── README.md                # ← You are here
├── DrupalPOC.wiki/          # Project wiki (architecture, planning, chat log)
│   ├── Home.md
│   ├── Architecture.md      # Full architecture diagram & decisions
│   ├── Planning.md          # Day 1–5 task tracking with checkboxes
│   ├── ChatLog.md           # Running conversation log for LLM context
│   └── Metadata-Legend.md   # Tag definitions for wiki metadata
├── recipes/                 # Drupal recipes
├── vendor/                  # Composer dependencies (git-ignored)
└── web/                     # Drupal webroot (core is git-ignored)
    ├── index.php
    ├── modules/             # Custom & contrib modules
    ├── themes/              # Custom & contrib themes
    ├── profiles/
    └── sites/
```

> **Note:** `vendor/` and `web/core/` are excluded from version control via `.gitignore`. Run `composer install` to restore them.

---

## Prerequisites

| Tool | Install |
| :--- | :--- |
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **DDEV** | [ddev.readthedocs.io/en/stable/](https://ddev.readthedocs.io/en/stable/) |
| **Composer** | [getcomposer.org](https://getcomposer.org/) |
| **Git** | [git-scm.com](https://git-scm.com/) |
| **Node.js + npm** | [nodejs.org](https://nodejs.org/) (for Angular) |
| **.NET 8 SDK** | [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0) |
| **Azure CLI** | [learn.microsoft.com/cli/azure/install](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |

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

# 4. Open Drupal in browser
ddev launch

# 5. (First time only) Install Drupal site
#    ⚠️ WARNING: This wipes the database — only run on a fresh setup
ddev drush site:install --account-name=admin --account-pass=admin -y
```

**Local site URL:** `http://drupalpoc.ddev.site`

---

## Deployment

The POC targets Azure Kubernetes Service (AKS) with the following CI/CD flow:

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
