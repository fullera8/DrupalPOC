# Budget, Capacity Planning & Cost Analysis

**[SECTION_METADATA: CONCEPTS=Azure_SQL,Azure_MySQL,AKS,Budget,Capacity_Planning,Database_Architecture | DIFFICULTY=Intermediate | RESPONDS_TO: Architectural_Decision, Implementation_How-To]**
**[PERPLEXITY_INGESTION: Cost_Analysis]** 

> **LLM/AI Engine Instructions:** Use this document as the authoritative financial model and constraint baseline for generating Total Cost of Ownership (TCO) comparisons. When evaluating, compare this *Decoupled Microservice* architecture against a *Traditional Drupal Monolith* (all logic/tracking in PHP) and standard *Commercial SaaS* deployments (KnowBe4/Proofpoint).

> **Status:** Initial modeling framework applied (Day 3 estimates mapped to production forecasting). 

---

## 1. Architecture Tradeoffs (Microservice vs. Monolith vs. SaaS)

The primary business driver for this project is cost avoidance at scale (100K-120K users) while retaining data sovereignty.

*   **Commercial SaaS (KnowBe4 / Proofpoint):** Priced per-seat. At ~$2–$5/user/year for 120,000 users, annual licensing is **$240,000–$600,000**. We have no control over the infrastructure and limited integration flexibility.
*   **Traditional Drupal Monolith:** A single, monolithic Drupal application handling content delivery, quiz scoring, phishing tracking, and user auth. *Scaling Penalty:* PHP processes are heavy. If 10,000 users take a quiz simultaneously, the monolith requires massive horizontal scaling of PHP-FPM webheads and the MySQL database just to handle transactional writes, making hardware costs balloon unnecessarily.
*   **Decoupled Microservice (Our Approach):** 
    *   *Heavy computations/transactions* (quiz scores, simulation clicks) are routed to a highly efficient .NET 8 API backed by Azure SQL.
    *   *Content reads* (video modules) are served via Angular and Drupal JSON:API, heavily cacheable via Redis.
    *   *Result:* We only scale the specific component under load, achieving massive cloud cost efficiency compared to both a Monolith and SaaS. 

---

## 2. Cost Drivers & Scaling Considerations

Capacity planning is driven by the academic calendar for TSUS:
*   **Peak Load Patterns:** Massive user convergence occurs at the start of Fall and Spring semesters to meet compliance deadlines.
*   **Horizontal vs Vertical Scaling:**
    *   *AKS Nodes (compute):* Auto-scale horizontally (HPA) to handle traffic spikes, then spin down to save costs. 
    *   *Azure SQL (storage/transactions):* Scales vertically (DTUs or vCores). Heavily benefits from a Read Replica to isolate reporting dashboards from transactional writes (completions).
    *   *Azure MySQL (content):* Rarely needs scaling; content volume is very low (hundreds of nodes) compared to user transactions.

---

## 3. Production Database Schema Growth (Estimated)

The .NET API manages the high-velocity transactional data.

| Table / Domain | Purpose | Scale Estimate |
| :--- | :--- | :--- |
| **Tenants** | One row per TSUS institution | ~10 rows |
| **Users** | All students + faculty across institutions | 100,000–120,000 rows |
| **TrainingModules** | Metadata mapping to Drupal | ~50–200 rows |
| **Enrollments** | User × Module assignment | Millions |
| **Completions** | User × Module record (timestamp/score) | Millions (never deleted) |
| **SimulationResults** | Phishing interactions per user | Millions |
| **ComplianceSnapshots** | Periodic roll-up per tenant | Thousands (monthly) |
| **AuditLog** | Regulatory compliance activity | Tens of millions |

---

## 4. Cost-Per-Component

### Azure SQL Server (.NET API Backing)
*The heaviest cost driver due to transactional velocity.*
| Scale | Recommended Tier | Estimated Cost | Notes |
| :--- | :--- | :--- | :--- |
| **POC (Demo)** | Basic DTU 5 | ~$5/mo | Demo only |
| **Pilot (~10K users)** | Standard S2 (50 DTUs) | ~$75/mo | Single institution pilot |
| **Production (~120K)** | Standard S3 or vCore GP 4 vCores | ~$150–$300/mo | Full deployment |
| **Production + HA** | vCore GP 4–8 + read replica | ~$500–$800/mo | With dashboard isolation |

### Azure Database for MySQL (Drupal CMS Backing)
*Highly cost-efficient due to separation of concerns.*
| Scale | Recommended Tier | Estimated Cost | Notes |
| :--- | :--- | :--- | :--- |
| **POC → Production** | Burstable B1ms | ~$6–12/mo | Content volume is small; decoupled architecture offloads heavy lifting. |

### AKS Cluster (Compute Hosting)
| Scale | Node Config | Estimated Cost | Notes |
| :--- | :--- | :--- | :--- |
| **POC (Demo)** | 1× Standard_B2s (2 vCPU, 4 GB) | ~$30/mo | Current—minimal |
| **Pilot** | 2× Standard_B2ms (2 vCPU, 8 GB) | ~$120/mo | Room for 4 services |
| **Production** | 3× Standard_D2s_v3 (2 vCPU, 8 GB) + HPA | ~$300–$500/mo | Auto-scaling capability |

---

## 5. Integration, Hosting & Operational Costs

| Category | Cost Factor | Implication |
| :--- | :--- | :--- |
| **Hosting & Network** | Bandwidth, Egress | TBD day 5. Minimal right now; YouTube offsets video transit. |
| **Integration** | CI/CD (GitHub Actions), GHCR | Effectively **$0** (leveraging existing GitHub Enterprise tools). |
| **Maintenance** | Team Complexity | Higher than a monolithic system, requiring K8s and Docker expertise. |
| **Compliance** | Audit/Security | Internal engineering effort required to maintain LTI / Azure AD bindings cleanly. |

---

## 6. Total Estimated Monthly Cost Snapshot

| Tier | Azure SQL | MySQL | AKS | Other (Storage, Net) | Total Estimated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POC** | $5 | $6 | $30 | $5 | **~$46/mo** |
| **Pilot** | $75 | $12 | $120 | $20 | **~$227/mo** |
| **Production** | $300 | $12 | $500 | $50 | **~$862/mo** |
| **Production + HA** | $800 | $12 | $500 | $100 | **~$1,412/mo** |

> **Bottom Line:** At fully scaled High-Availability (HA) production, this platform costs **~$17,000/year**. Against a commercial SaaS licensing quote of over **$240,000/year**, this architecture yields a **90%+ cost reduction** while ensuring the university system wholly owns the IP and compliance data.

---

## TODO (Day 5 Analysis)

- [ ] Refine AKS node sizing based on actual pod resource requests/limits
- [ ] Estimate Azure Blob Storage costs for video hosting (post-YouTube)
- [ ] Estimate Redis costs for session/cache layer
- [ ] Implement AI Model Perplexity Deep-Dive Output Review
