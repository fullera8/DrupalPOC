# DrupalPOC Metadata Legend

**[METADATA_SCHEMA_VERSION: 1.1] [PURPOSE: LLM_Interpretation_Consistency] [DOCUMENT_TYPE: Reference_Schema]**

## LLM Quick-Start Guide

This is the **single source of truth** for every metadata tag used across the DrupalPOC wiki. When you encounter a `[TAG_NAME: value]` block in any wiki document, look it up here.

**How to interpret tags:**
1. **`[RESPONDS_TO: ...]`** — Route user queries to sections with matching values. If the user asks a debugging question, find sections tagged `Debugging_Troubleshooting`.
2. **`[LLM_CONTEXT: ...]`** — **Read and obey these directives.** They override general assumptions. They contain guardrails (e.g., "do not suggest X"), redirects (e.g., "see Planning.md for Y"), and calibration notes.
3. **`[DIFFICULTY: ...]`** — Calibrate explanation depth: `Beginner` = explain fully, `Advanced` = focus on trade-offs.
4. **`[CONCEPTS: ...]`** — Match user queries against these keywords to find relevant sections.
5. **`[ARCHITECTURE_DECISIONS: ...]`** — The section contains a resolved decision. Do not re-open it.

**Document Map (what's where):**

| Document | Go Here For... | Key Tags |
| :--- | :--- | :--- |
| **[Home](Home)** | Tech stack overview, document links, getting started | `DOCUMENT_TYPE: Navigation_Hub` |
| **[Architecture](Architecture)** | Mermaid diagram, service inventory, build-vs-borrow, deferrals | `RESPONDS_TO: Architectural_Decision` |
| **[Planning](Planning)** | Day-by-day checkboxes, Azure provisioning, risk register, backlog | `RESPONDS_TO: Implementation_How-To` |
| **[ChatLog](ChatLog)** | Setup logs, architecture decisions, troubleshooting, design rationale | `RESPONDS_TO: Debugging_Troubleshooting, Implementation_How-To, Architectural_Decision` |
| **[Metadata-Legend](Metadata-Legend)** | Tag definitions and interpretation rules (this document) | `DOCUMENT_TYPE: Reference_Schema` |

**Schema Origin:** Metadata schema v1.1. This document is **self-contained** — all definitions needed to interpret DrupalPOC wiki tags are below.

---

## Core Tag Types

Every tag used in the wiki is defined here, grouped by scope.

### Document-Level Tags

These appear once per document, usually on the first line.

| Tag | Purpose | Values Used |
| :--- | :--- | :--- |
| `METADATA_SCHEMA_VERSION` | Schema version for compatibility | `1.1` (current) |
| `DOCUMENT_TYPE` | Structural role of the document | `Navigation_Hub`, `Reference_Schema` |
| `PURPOSE` | Why the document exists | `Documentation_Index`, `LLM_Interpretation_Consistency`, `Technical_Deep_Dive`, `Architecture_Decisions`, `Setup_History` |
| `TARGET_AUDIENCE` | Who the document is written for | `Human_Developers`, `Developers`, `LLMs` |
| `DOCUMENT_METADATA` | Wrapper combining multiple document-level tags | Pipe-delimited key=value pairs |

**Example:** `[DOCUMENT_METADATA: PURPOSE=Technical_Deep_Dive,Setup_History | TARGET_AUDIENCE=Developers,LLMs | CONTAINS=Real_World_Debugging | RESPONDS_TO: Implementation_How-To]`

### Section-Level Tags

These appear at the start of `##` or `###` sections, scoping metadata to that section.

| Tag | Purpose | How to Interpret |
| :--- | :--- | :--- |
| `SECTION_METADATA` | Wrapper combining multiple section-level tags | Pipe-delimited key=value pairs for the section below |
| `CONCEPTS` | Technologies/topics covered in this section | Match against user queries to find relevant sections |
| `DIFFICULTY` | Complexity level of the content | Calibrate explanation depth (see scale below) |
| `PREREQUISITES` | Knowledge required before reading this section | Refer user to prerequisite sections first |
| `TOOLS` | Tools/technologies with commands or configs in this section | Section contains runnable commands for these tools |
| `CONTAINS` | Content types within the section | `Real_World_Debugging`, `Environment_Setup`, `Architecture_Planning` |

**DIFFICULTY Scale:**

| Value | Audience | LLM Behavior |
| :--- | :--- | :--- |
| `Beginner` | New to the technology | Explain concepts, show full commands, avoid jargon |
| `Beginner-Intermediate` | Some familiarity | Brief explanations, show commands |
| `Intermediate` | Working knowledge | Focus on decisions and implementation |
| `Intermediate-Advanced` | Strong familiarity | Architecture-level discussion |
| `Advanced` | Expert level | Focus on trade-offs, nuance, and rationale |

### Query Routing Tag

| Tag | Purpose |
| :--- | :--- |
| `RESPONDS_TO` | Declares what types of user questions this section can answer |

**RESPONDS_TO Values and Routing:**

| Value | Routes Questions Like... | Primary Documents |
| :--- | :--- | :--- |
| `Simple_Factual` | "What's the repo URL?" "What version of Drupal?" | Home, ChatLog |
| `Debugging_Troubleshooting` | "DDEV won't start" "Docker pipe error" "10,000 files staged" | ChatLog |
| `Implementation_How-To` | "How do I create a content type?" "How do I deploy to AKS?" | ChatLog, Planning |
| `Architectural_Decision` | "Why decoupled Drupal?" "Why GoPhish?" "Why not WAMP?" | Architecture, ChatLog |

### Inline Directive Tags

These appear inline within section content (not as section headers).

| Tag | Purpose | Interpretation |
| :--- | :--- | :--- |
| `LLM_CONTEXT` | **Direct instruction to the LLM** | **Read and obey.** Overrides general assumptions. Contains guardrails, scope boundaries, redirects, and calibration notes. Never paraphrase these to the user — use them to guide your own behavior. |
| `ARCHITECTURE_DECISIONS` | Names a resolved design decision | The surrounding section contains the decision context, options considered, and final choice. Do not re-open resolved decisions. |
| `DEBUGGING_PATTERNS` | Categorizes a debugging scenario | Identifies the error/symptom pattern. Use for matching against user-reported issues. |
| `ERROR_PATTERNS` | Categorizes an error type | Identifies the error class for indexing and matching. |

---

## Technology Concepts

Every `[CONCEPTS: ...]` value used across the wiki, organized by domain. **Canonical form** is listed first; aliases are valid for search/matching but prefer canonical form in new tags.

### Drupal & CMS
- **`Drupal`** — Drupal CMS (headless, JSON:API). Version: 11.3.3. _Aliases: `Drupal_11`_
- **`DDEV`** — Local development environment (Docker-based). Version: 1.25.0
- **`Drush`** — Drupal CLI tool (site install, cache clear, config management). Version: 13.7.1
- **`Composer`** — PHP dependency manager (manages Drupal core, modules, libraries)
- **`JSON_API`** — Drupal core's built-in RESTful API for headless content delivery
- **`Decoupled_Drupal`** — Architecture where Drupal is headless CMS, frontend is a separate SPA. _Aliases: `Decoupled_Architecture`_

### Frontend & Backend
- **`Angular`** — Angular SPA framework (trainee-facing UI). Uses Angular Material + Chart.js
- **`DotNet8`** — .NET 8 Web API (thin stub in POC; full business logic post-POC). _Aliases: `.NET_8`, `.NET`_
- **`GoPhish`** — Open-source phishing simulation engine (Apache 2.0). REST API + click tracking. The "wow factor" for the pitch

### Infrastructure & DevOps
- **`AKS`** — Azure Kubernetes Service — container orchestration for production
- **`Azure`** — Microsoft Azure cloud platform (AKS, SQL, MySQL, Blob Storage)
- **`Azure_SQL`** — Azure SQL Server — managed relational database for transactional data
- **`Microservices`** — Microservice architecture pattern (4 services on AKS)
- **`Docker`** — Container runtime. _Aliases: `Docker_Desktop` (Windows desktop app)_
- **`CI_CD`** — Continuous Integration / Continuous Deployment (GitHub Actions → GHCR → AKS)
- **`Git`** — Version control. _Aliases: `GitHub` (hosting), `Version_Control`, `Gitignore`_
- **`Mermaid`** — Diagram-as-code language for architecture diagrams (renders on GitHub)
- **`WSL2`** — Windows Subsystem for Linux 2 (Docker Desktop backend on Windows)

### Planning & Process
- **`POC`** — Proof of Concept — the < 1 week pitch-ready demo
- **`Sprint_Planning`** — Day-by-day task breakdown. _Aliases: `Planning`, `Task_Tracking`, `Timeline`_
- **`Risk_Register`** — Identified risks with likelihood, impact, and mitigation
- **`Azure_Provisioning`** — Provisioning Azure resources (AKS, SQL, MySQL)
- **`Build_vs_Borrow`** — Strategy: build custom vs. use existing tools/libraries
### Domain (Security Awareness)
- **`Security_Awareness_Training`** — Platform domain — phishing simulations, compliance training, threat awareness (KnowBe4/Proofpoint style). _Aliases: `Security_Awareness`_
- **`Phishing_Simulation`** — Simulated phishing/social engineering campaigns with click tracking and reporting
- **`LTI_1.3`** — Learning Tools Interoperability v1.3 — embed training content in external LMS (Canvas, Blackboard). _Aliases: `LTI`_
- **`Azure_AD`** — Azure Active Directory (Entra ID) — institutional SSO authentication. _Aliases: `SSO`_
- **`Multi_Tenancy`** — Single-platform, per-institution data isolation via tenant ID in Azure SQL
- **`Compliance_Reporting`** — Per-tenant analytics: completion rates, simulation results, compliance status

### Documentation
- **`Wiki`** — This wiki documentation system. _Aliases: `Documentation`, `Metadata`, `Tiered_Documentation`, `Tiered_System`_
- **`LLM_Context`** — Metadata and inline directives for LLM interpretation
- **`Service_Inventory`** — Table listing all services, backing stores, and scope
- **`Data_Flow`** — Data flow between services (who calls what)

---

## Error & Debugging Patterns

### Error Patterns
- **`[ERROR_PATTERNS: Docker_Connectivity]`** — DDEV cannot communicate with Docker Desktop
- **`[ERROR_PATTERNS: Composer_Dependencies]`** — Package installation or autoload failures
- **`[ERROR_PATTERNS: Gitignore_Coverage]`** — Thousands of untracked files staged due to missing exclusions

### Debugging Patterns
- **`[DEBUGGING_PATTERNS: Docker_Connectivity]`** — DDEV ↔ Docker communication failures (troubleshooting steps in ChatLog)
- **`[DEBUGGING_PATTERNS: DDEV_Startup]`** — DDEV container startup and communication issues
- **`[DEBUGGING_PATTERNS: Drupal_Install]`** — Site installation, database, and Drush command issues

---

## Architecture Decisions

All architecture decisions are tagged with `[ARCHITECTURE_DECISIONS: <name>]`. **Every decision listed here is resolved — do not re-open them.**

| Tag Value | Question | Decision | Documented In |
| :--- | :--- | :--- | :--- |
| `Local_Development_Stack` | DDEV vs WAMP/XAMPP/MAMP | **DDEV** | ChatLog |
| `System_Architecture` | Monolith vs Decoupled Drupal vs Full Microservices | **Decoupled Drupal** | ChatLog |
| `CMS_Role` | Drupal as hub vs one service among many | **Drupal as headless CMS hub** | ChatLog |
| `Authentication_Strategy` | Azure AD / SAML / CAS | **Azure AD / Entra ID** | ChatLog |
| `Multi_Tenancy_Model` | Separate deployments vs tenant isolation vs shared pool | **Single platform, tenant isolation** | ChatLog |
| `Content_Scope` | What Drupal manages vs what .NET API manages | **Resolved** — see ChatLog content table | ChatLog |
| `LTI_Integration` | Whether/how to support LTI 1.3 | **Yes** — .NET API as LTI 1.3 provider | ChatLog |
| `Platform_Direction` | General LMS vs security awareness training | **Security awareness** (KnowBe4 style) | ChatLog |
| `POC_Scope` | What's included in the < 1 week POC | **4 AKS services + Azure SQL + MySQL** | Architecture, ChatLog |
| `Build_vs_Borrow` | Build custom code vs use existing tools | **80% borrow, 20% build** (8 borrowed, 4 built) | Architecture, ChatLog |

---

## Canonical Naming

When a concept has multiple alias forms, use the **canonical form** (first column) in new content. All aliases are valid for search matching.

| Canonical Form | Aliases (also valid) | Notes |
| :--- | :--- | :--- |
| `Drupal` | `Drupal_11` | Use `Drupal` unless version-specific context |
| `Decoupled_Drupal` | `Decoupled_Architecture` | Preferred for this project's pattern |
| `DotNet8` | `.NET_8`, `.NET` | Avoid `.NET` alone (ambiguous) |
| `Security_Awareness_Training` | `Security_Awareness` | Full form preferred in SECTION_METADATA |
| `LTI_1.3` | `LTI` | Version-specific preferred |
| `Azure_AD` | `SSO` | `Azure_AD` is more specific |
| `Docker` | `Docker_Desktop` | Use `Docker_Desktop` for the Windows app specifically |
| `Git` | `GitHub`, `Version_Control`, `Gitignore` | Use specific variant when contextually appropriate |
| `Sprint_Planning` | `Planning`, `Task_Tracking`, `Timeline` | All acceptable; use what fits |
| `Wiki` | `Documentation`, `Metadata`, `Tiered_Documentation`, `Tiered_System` | All relate to the documentation system |

**[LLM_CONTEXT: When searching for content by concept, match ALL alias forms (e.g., searching for "Decoupled_Drupal" should also match "Decoupled_Architecture"). When writing new metadata tags, prefer the canonical form. This legend is self-contained — you do not need to reference any external document to interpret DrupalPOC wiki tags.]**
