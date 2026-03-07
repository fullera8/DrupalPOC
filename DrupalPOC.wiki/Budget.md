# Budget & Capacity Planning

**[SECTION_METADATA: CONCEPTS=Azure_SQL,Azure_MySQL,AKS,Budget,Capacity_Planning,Database_Architecture | DIFFICULTY=Intermediate | RESPONDS_TO: Architectural_Decision, Implementation_How-To]**

> **Status:** High-level estimates only (Day 3). Full analysis planned for Day 5 polish.

---

## POC Cost (Current)

| Resource | Azure Tier | Monthly Cost |
| :--- | :--- | :--- |
| **AKS Cluster** | Free tier (1 node, Standard_B2s) | ~$0 (free control plane) + ~$30 (B2s VM) |
| **Azure SQL Server** | Basic / DTU 5 | ~$5/mo |
| **Azure Database for MySQL** | Burstable B1ms | ~$6/mo |
| **GHCR** | Free (public images) | $0 |
| **Total** | | **~$41/mo** |

---

## Production Database Schema (Estimated)

The POC uses a single `SimulationResults` table. Production expands to support the full platform at 100,000–120,000 users.

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

---

## Production Compute Estimates

### Azure SQL Server

| Scale | Users | Recommended Tier | Estimated Cost | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **POC** | Demo only | Basic DTU 5 | ~$5/mo | Current — sufficient for demo |
| **Pilot** | ~10,000 | Standard S2 (50 DTUs) | ~$75/mo | Single institution pilot |
| **Production** | 100,000–120,000 | Standard S3 (100 DTUs) or vCore GP 4 vCores | ~$150–$300/mo | Full TSUS deployment |
| **Production + HA** | 100,000–120,000 | vCore GP 4–8 vCores + geo-redundant backup + read replica | ~$500–$800/mo | With compliance & reporting isolation |

**Key factors:**
- **Storage growth:** ~1.2M completion rows + ~480K simulation rows per year
- **Peak load:** Semester start + compliance deadlines drive concurrent usage
- **Read replica:** Reporting dashboard runs heavy aggregation queries — isolate from transactional writes

### Azure Database for MySQL (Drupal)

| Scale | Recommended Tier | Estimated Cost | Notes |
| :--- | :--- | :--- | :--- |
| **POC → Production** | Burstable B1ms | ~$6–12/mo | Drupal content volume is small (hundreds of nodes). Burstable is likely sufficient even at full scale. |

### AKS Cluster

| Scale | Node Config | Estimated Cost | Notes |
| :--- | :--- | :--- | :--- |
| **POC** | 1× Standard_B2s (2 vCPU, 4 GB) | ~$30/mo | Current — minimal |
| **Pilot** | 2× Standard_B2ms (2 vCPU, 8 GB) | ~$120/mo | Room for all 4 services + headroom |
| **Production** | 3× Standard_D2s_v3 (2 vCPU, 8 GB) + HPA | ~$300–$500/mo | Auto-scaling node pool |

---

## Total Estimated Monthly Cost

| Tier | Azure SQL | MySQL | AKS | Other (Storage, Networking) | Total |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POC** | $5 | $6 | $30 | $5 | **~$46/mo** |
| **Pilot (~10K users)** | $75 | $12 | $120 | $20 | **~$227/mo** |
| **Production (~120K users)** | $300 | $12 | $500 | $50 | **~$862/mo** |
| **Production + HA** | $800 | $12 | $500 | $100 | **~$1,412/mo** |

> **Comparison:** KnowBe4 and Proofpoint license at ~$2–5 per user per year. At 120,000 users, that's **$240,000–$600,000/year**. This platform costs ~**$10,000–$17,000/year** at full production scale — a **95%+ cost reduction**.

---

## TODO (Day 5 Analysis)

- [ ] Refine AKS node sizing based on actual pod resource requests/limits
- [ ] Estimate Azure Blob Storage costs for video hosting (post-YouTube)
- [ ] Estimate Redis costs for session/cache layer
- [ ] Estimate bandwidth/egress costs at 120K users
- [ ] Factor in Azure AD / Entra ID licensing (if applicable)
- [ ] Build 3-year TCO comparison vs. KnowBe4/Proofpoint

**[LLM_CONTEXT: This is a high-level budget placeholder created on Day 3. The cost estimates are rough — do not cite them as final figures. The primary takeaway is the 95%+ cost reduction vs commercial SaaS. Full analysis is planned for Day 5. Do not expand this document during the POC unless the developer explicitly asks.]**
