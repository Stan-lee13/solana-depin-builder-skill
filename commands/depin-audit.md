# /depin-audit

Run a comprehensive audit of an existing DePIN protocol's architecture, economics, and growth. Returns a structured report with severity-rated findings and specific remediation steps.

## Invocation

User types: `/depin-audit` or "audit my DePIN network" or "what's wrong with my DePIN"

## Required input

Ask the user to provide:

```
1. Network type (connectivity / compute / sensor / mapping / bandwidth)
2. Current node count and target node count
3. Proof mechanism (how do you verify work?)
4. Oracle setup (who validates proofs? how are they signed?)
5. Reward structure (emission schedule, work unit definition, scoring)
6. Stake requirement (amount and in what token)
7. Geographic distribution (target region, current coverage)
8. Current protocol revenue (real demand-side income)
9. Any known issues or community complaints
10. Link to on-chain program (if deployed) or GitHub repo
```

## Audit framework — 8 domains

---

### Domain 1: Proof Mechanism Integrity [CRITICAL]

```
Audit questions:
□ Is the proof cryptographically verifiable?
  PASS:  Oracle verifies device signature using registered device_pubkey
  WARN:  Multi-source cross-validation without cryptographic proof
  FAIL:  Self-reported work with no independent verification

□ Can a fake node generate valid proofs without physical hardware?
  PASS:  Requires device-side signature from hardware keypair
  WARN:  Could be simulated with enough effort/cost
  FAIL:  Proofs can be generated without any physical presence

□ Are proofs replay-resistant?
  PASS:  Includes epoch + nonce + timestamp; on-chain deduplication
  WARN:  Timestamp only (small replay window)
  FAIL:  No replay protection

□ Is the oracle trust model appropriate for network maturity?
  PASS:  TEE attestation or cryptographic challenge-response
  WARN:  Statistical consensus (acceptable if node count > 1000)
  FAIL:  Single centralized oracle with no multisig
```

---

### Domain 2: Economic Security [CRITICAL]

```
□ Is the minimum stake sufficient to deter Sybil attacks?
  Calculate: Expected daily reward × Slash deterrence factor (30×)
  PASS:  Stake ≥ 30× daily reward per fake node
  WARN:  Stake 10-30× daily reward
  FAIL:  Stake < 10× daily reward or no stake required

□ Does the emission schedule create sustainable tokenomics?
  Check: Is there a credible path to protocol revenue > emissions?
  PASS:  Protocol revenue covers >50% of rewards by Year 2
  WARN:  Protocol revenue covers <50% but growing fast
  FAIL:  Pure inflation with no demand-side revenue path

□ Are there per-hex or per-area node caps?
  PASS:  Hard cap + diminishing returns after 1st node in hex
  WARN:  Diminishing returns only (soft cap)
  FAIL:  No geographic concentration limits

□ Can a single entity capture >10% of epoch rewards?
  PASS:  Per-node cap prevents single-entity dominance
  WARN:  No cap but distribution is empirically healthy
  FAIL:  No cap; whale nodes dominate rewards
```

---

### Domain 3: Oracle Security [CRITICAL]

```
□ How is the oracle keypair protected?
  PASS:  HSM or multi-party oracle set with threshold signatures
  WARN:  Single keypair on hardened server with monitoring
  FAIL:  Private key in environment variable or repo

□ Is there oracle key rotation capability?
  PASS:  On-chain oracle pubkey updatable via Squads multisig
  WARN:  Updatable by single admin key
  FAIL:  Hardcoded oracle pubkey with no rotation path

□ Are oracle submissions rate-limited on-chain?
  PASS:  Max proofs per node per epoch enforced in program
  WARN:  Rate limited off-chain only
  FAIL:  No rate limiting

□ What happens if the oracle goes offline?
  PASS:  Secondary oracle, graceful epoch skip, node protection
  WARN:  Manual intervention needed but documented
  FAIL:  Network halts entirely; no fallback
```

---

### Domain 4: Smart Contract Safety [HIGH]

```
□ Has the on-chain program been audited?
  PASS:  Audit by OtterSec / Sec3 / Trail of Bits / Neodyme
  WARN:  Internal review only; audit scheduled
  FAIL:  No audit; mainnet deployment planned

□ Is program upgrade authority behind multisig?
  PASS:  Squads v4, threshold ≥ 2-of-3
  WARN:  Single admin key with timelock
  FAIL:  Single EOA with immediate upgrade capability

□ Is there an emergency pause mechanism?
  PASS:  Pause instruction gated by multisig; tested
  WARN:  Pause exists but untested
  FAIL:  No pause mechanism; bugs require full program migration

□ Are slashing conditions bounded and well-defined?
  PASS:  Enumerated slash reasons with specific amounts; max 100%
  WARN:  Admin discretion on slash amounts
  FAIL:  Unbounded or undefined slashing

□ Integer overflow protection on reward calculations?
  PASS:  All arithmetic uses checked_add/checked_mul; fuzz tested
  WARN:  Checked arithmetic but no fuzz testing
  FAIL:  Unchecked arithmetic on reward calculations
```

---

### Domain 5: Node Operator Experience [HIGH]

```
□ How long from registration to first reward?
  PASS:  < 24 hours
  WARN:  1-7 days
  FAIL:  > 7 days or unclear

□ Is there an operator dashboard?
  PASS:  Live earnings, uptime, proof submissions, hex position visible
  WARN:  Basic earnings view only
  FAIL:  Operators must query on-chain directly

□ What is the hardware setup experience?
  PASS:  Plug-and-play hardware with guided setup; < 30 minutes
  WARN:  Technical setup requiring CLI knowledge; 1-2 hours
  FAIL:  Complex multi-step setup requiring developer skills

□ What is the de-registration / stake recovery UX?
  PASS:  Self-serve; stake returns within 7 epochs
  WARN:  Manual request process
  FAIL:  No clear path to recover stake
```

---

### Domain 6: Geographic Distribution [MEDIUM]

```
□ Are there rewards for underserved areas?
  PASS:  Explicit bonus multiplier for low-density hexes
  WARN:  No bonus but hex caps create indirect incentive
  FAIL:  Uniform rewards regardless of coverage saturation

□ What is the current geographic concentration?
  PASS:  No single region > 30% of nodes
  WARN:  One region 30-60% of nodes (concentration risk)
  FAIL:  One region > 60% of nodes (highly centralized)

□ Is there a global hardware availability plan?
  PASS:  Hardware ships internationally; customs guidance provided
  WARN:  Ships to major regions only
  FAIL:  Domestic shipping only
```

---

### Domain 7: Demand Side (Revenue) [MEDIUM]

```
□ Is there real paying demand for the network's service?
  PASS:  Paying B2B customers generating protocol revenue
  WARN:  Pilots underway; LOIs signed
  FAIL:  No customers; demand assumed but untested

□ Is the data marketplace live or planned?
  PASS:  Live; consumers can access data programmatically
  WARN:  In development; expected within 6 months
  FAIL:  Not designed; demand side undefined

□ What is the path to protocol revenue > emissions?
  PASS:  Modeled with specific milestones and deadlines
  WARN:  General plan without specific timelines
  FAIL:  No modeled path; pure speculation
```

---

### Domain 8: Legal & Compliance [MEDIUM]

```
□ Does the hardware comply with radio regulations in target markets?
  (FCC Part 15 in US, CE marking in EU, ANATEL in Brazil, NCC in Nigeria)
  PASS:  Certifications obtained; compliance documented
  WARN:  In process; restricted to certified markets
  FAIL:  Unknown; deploying without regulatory clearance

□ Is the data collection GDPR-compliant (if serving EU)?
  PASS:  No PII collected; or privacy policy + consent flow live
  WARN:  PII incidentally collected; legal review needed
  FAIL:  PII collected without consent mechanism

□ Are node operators in regulated bandwidth (radio) networks?
  PASS:  Operating on unlicensed spectrum (ISM bands); documented
  WARN:  Mixed spectrum use; legal review needed
  FAIL:  Licensed spectrum use without operator licenses addressed
```

---

## Audit output format

```
DEPIN PROTOCOL AUDIT REPORT
============================
Protocol: [Name]
Date: [Date]
Network Type: [Category]
Current Nodes: [N]

FINDINGS SUMMARY:
  CRITICAL: [N] findings
  HIGH:      [N] findings
  MEDIUM:    [N] findings
  PASS:      [N] items

CRITICAL FINDINGS (must resolve before mainnet / before scaling):
─────────────────────────────────────────────────────────────────
[C1] [Domain] Finding description
     Impact: [What happens if this isn't fixed]
     Fix: [Specific remediation steps]
     Effort: [hours/days/weeks]

HIGH FINDINGS (must resolve before next growth phase):
──────────────────────────────────────────────────────
[H1] [Domain] ...

MEDIUM FINDINGS (should resolve within 60 days):
─────────────────────────────────────────────────
[M1] [Domain] ...

PASSED CHECKS:
──────────────
✅ [Item that is well-implemented]

OVERALL ASSESSMENT:
  [LAUNCH READY / NEEDS WORK / NOT READY FOR MAINNET]
  
  [2-3 sentences on the network's strongest aspect and 
   the single most important thing to fix]

PRIORITY ACTION PLAN:
  Week 1: [Specific tasks]
  Week 2-4: [Specific tasks]
  Month 2-3: [Specific tasks]
```
