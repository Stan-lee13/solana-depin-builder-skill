<div align="center">

<img src="https://img.shields.io/badge/Solana-DePIN_Builder_Skill-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana DePIN Builder Skill"/>

**The most complete DePIN engineering skill for the Solana AI Kit.**

*Node registry · Proof mechanisms · ZK compression · Oracle integration · Hardware supply chain · Token economics · Incident response · RF compliance · Dynamic pricing · Coverage insurance*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Anchor](https://img.shields.io/badge/Anchor-v0.30+-blue?style=flat-square)](examples/anchor)
[![Tests](https://img.shields.io/badge/Tests-17_passing-brightgreen?style=flat-square)](examples)
[![Skills](https://img.shields.io/badge/Skill_files-21-9945FF?style=flat-square)](skill/)
[![Agents](https://img.shields.io/badge/Agents-5-orange?style=flat-square)](agents/)
[![Runbooks](https://img.shields.io/badge/Runbooks-9-red?style=flat-square)](runbooks/)

</div>

---

## What This Skill Builds

A complete Solana DePIN — from first architecture decision to mainnet operator onboarding. Every layer is covered:

| Layer | What you get |
|---|---|
| **On-chain program** | Anchor node registry with stake escrow, proof submission, jail/slash, emergency pause |
| **Proof mechanisms** | PoC (Helium-style challenge-response), PoW, PoB, multi-device consensus — 5 patterns |
| **ZK Compression** | Compressed device accounts for 1M+ nodes at 1/1000th the rent cost |
| **Oracle integration** | Switchboard v3 custom feeds, VRF challenges, TEE attestation, 5-tier trust framework |
| **Token economics** | Burn-and-mint equilibrium, coverage-weighted emissions, death-spiral early warning |
| **Hardware** | SE-based device identity (ATECC608A/SE050), firmware signing, FCC/CE RF compliance |
| **Adaptive proof** | Auto-switches proof strategy by H3 cell density — attackers cannot target a fixed mode |
| **Coverage insurance** | On-chain parametric SLA pool — automatic enterprise payouts when uptime drops |
| **Node reputation** | Bayesian 0–10K score, 5 reward tiers (0.5×–3×), detects degrading nodes proactively |
| **Dynamic pricing** | On-chain bonding curve adjusts data marketplace price every epoch by supply/demand |
| **Cross-skill wiring** | Feeds live into Observability, Incident Response, and Token Launch skills |

---

## 60-Second Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh)
```

---

## Runnable Examples (Zero Setup)

```bash
# TypeScript ROI calculator — 10 unit tests
cd examples/ts && npm install && npm test

# Anchor node registry — 7 integration tests on local validator
cd examples/anchor && anchor test
```

**Anchor test output:**
```
7 passing (12s)
  ✅ initializes network config
  ✅ registers node — escrows stake on-chain
  ✅ accepts valid Ed25519 proof — accrues rewards
  ✅ operator claims accumulated rewards
  ✅ jails rogue node — blocks further proofs
  ✅ emergency pause halts all write instructions
  ✅ rejects proof with wrong device keypair
```

**TypeScript test output:**
```
10 passing
  ✅ ROI positive at 18 months breakeven
  ✅ death-spiral triggers at correct threshold
  ✅ emission schedule conserves total supply
  ✅ coverage-weighted rewards scale with H3 density
  ✅ halving schedule computes correctly
  ... (5 more)
```

---

## Complete Repository Map (76 files)

```
solana-depin-builder-skill/
│
├── SKILL.md                              ← Top-level routing table — start here
├── CLAUDE.md                             ← Behavior rules, stack defaults, quick start
├── AGENTS.md                             ← Agent roster, pattern map, oracle trust levels
├── QUICK_REFERENCE.md                    ← Common code snippets for rapid implementation
├── wallet-framework.md                   ← Shared wallet security baseline (cross-skill)
├── ecosystem-signals.md                  ← Cross-skill event routing (5 canonical signals)
├── install.sh                            ← Interactive installer with framework detection
├── Makefile                              ← make validate / make test / make roi targets
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE                               ← MIT
│
├── skill/                                ← 22 files (21 skill docs + SKILL.md sub-router)
│   ├── SKILL.md                          ← Sub-skill routing table
│   │
│   ├── ── Core skills ──
│   ├── overview.md                       ← 7 DePIN categories, real protocol post-mortems
│   ├── network-architecture.md           ← Architecture patterns A–G, Solana program design
│   ├── node-registry.md                  ← Device identity, two-keypair model, Anchor program
│   ├── oracle-integration.md             ← Switchboard v3, TEE, ZK — 5-tier trust framework
│   ├── coverage-verification.md          ← H3 hex grid, beacon/witness, anti-gaming
│   ├── reward-system.md                  ← Emission design, game theory, Sybil economics
│   ├── data-marketplace.md               ← On-chain data monetization, subscription model
│   ├── network-growth.md                 ← Bootstrap strategy, operator acquisition
│   ├── hardware-integration.md           ← Firmware pipeline, field deployment (ESP32/RPi/nRF52)
│   ├── depin-token-launch.md             ← TGE readiness gate (cross-skill handoff)
│   ├── incident-response-integration.md  ← Rogue nodes, oracle attack (cross-skill)
│   ├── storage.md                        ← Proof-of-storage, challenge-response, sharding
│   │
│   ├── ── Advanced skills ──
│   ├── zk-compression.md                 ← 100K–1M devices at 1/1000th rent cost          ★
│   ├── depin-tokenomics.md               ← BME simulation, death-spiral early warning      ★
│   ├── hardware-supply-chain.md          ← SE attestation, firmware signing, anti-counterfeit ★
│   ├── regulatory-rf-compliance.md       ← FCC/CE/RED, 8-jurisdiction frequency matrix    ★
│   ├── depin-wallet-security.md          ← A1–A8 threat model, Argon2id, HD gap limits    ★
│   │
│   └── ── Innovation skills ──
│       ├── adaptive-proof-engine.md      ← Auto-switches proof strategy by H3 density     ★
│       ├── coverage-insurance.md         ← On-chain SLA insurance — automatic payouts     ★
│       ├── node-reputation-system.md     ← Bayesian reputation, 5 tiers, 0.5×–3× rewards ★
│       └── data-pricing-oracle.md        ← Supply/demand bonding curve for data pricing   ★
│
├── agents/                               ← 5 specialized agent personas
│   ├── depin-architect.md                ← System design, architecture patterns (opus)
│   ├── reward-engineer.md                ← ROI modeling, emission schedules (sonnet)
│   ├── hardware-engineer.md              ← PCB, SE selection, firmware, RF (sonnet)
│   ├── operator-ux-engineer.md           ← Operator dashboard, fleet UX (sonnet)
│   └── tech-docs-writer.md               ← Operator guides, ADRs, API refs (sonnet)      ★
│
├── commands/                             ← 6 slash commands
│   ├── depin-audit.md                    ← /depin-audit: 8-domain protocol audit
│   ├── node-economics.md                 ← /node-economics: ROI + emission modeling
│   ├── depin-deploy.md                   ← /depin-deploy: pre-mainnet checklist
│   ├── depin-design.md                   ← /depin-design: full architecture design flow
│   ├── depin-diagram.md                  ← /depin-diagram: Mermaid architecture diagrams
│   └── depin-hardware.md                 ← /depin-hardware: BOM + cost estimation
│
├── runbooks/                             ← 9 operational incident playbooks
│   ├── rogue-node-detected.md            ← Sybil cluster — evidence, slash procedure
│   ├── oracle-failure.md                 ← Stale/deviated feed — recovery procedure
│   ├── oracle-key-compromise.md          ← Signing key leaked — emergency rotation
│   ├── coverage-drift.md                 ← Node churn spike — stabilization protocol
│   ├── operator-onboarding.md            ← First-node setup, step-by-step with gates
│   ├── governance-attack.md              ← DAO takeover attempt — defense protocol
│   ├── token-price-crash.md              ← Death-spiral response, treasury intervention
│   ├── exchange-delisting.md             ← CEX delisting notice — liquidity response
│   └── regulatory-enforcement.md        ← FCC/CE cease-and-desist response           ★
│
├── rules/                                ← 4 always-on rule files
│   ├── depin-safety.md                   ← Irreversible action warnings, safety guardrails
│   ├── anchor.md                         ← Account validation, CU budget, error codes
│   ├── rust.md                           ← No-panic, checked arithmetic, Borsh layout
│   └── typescript.md                     ← BigInt for u64, rate limiting, strict types
│
├── examples/
│   ├── anchor/                           ← Runnable Anchor node registry
│   │   ├── Cargo.toml
│   │   ├── README.md
│   │   ├── programs/depin-registry/
│   │   │   ├── Cargo.toml
│   │   │   └── src/lib.rs                ← Full Anchor program (register, prove, claim, jail)
│   │   └── tests/depin-registry.ts       ← 7 integration tests
│   └── ts/                               ← Runnable TypeScript ROI calculator
│       ├── package.json
│       ├── tsconfig.json
│       ├── README.md
│       ├── src/roi-calculator.ts          ← ROI + emission scheduler
│       ├── tests/roi-calculator.test.ts   ← 10 unit tests
│       └── benchmarks/performance.ts     ← Performance benchmarks
│
└── docs/
    └── ci.md                             ← CI/CD pipeline documentation

★ = not found in any other DePIN submission in this bounty
```

---

## Eight Things No Other DePIN Submission Has

**1. Adaptive Proof Engine** (`skill/adaptive-proof-engine.md`)
Every DePIN picks one proof at genesis — this is wrong. A sparse cell with 2 nodes needs simple heartbeat. A dense cell with 50 nodes needs VRF challenge so attackers can't target a predictable mechanism. This meta-layer switches automatically based on H3 cell density, with a full Anchor program + TypeScript SDK that builds the correct proof payload for whichever strategy is currently active. Geographic distribution emerges from the economics: sparse cells have easy proof → attract operators → density rises → proof upgrades.

**2. Coverage Insurance Protocol** (`skill/coverage-insurance.md`)
The question every enterprise data buyer asks: "What happens when you miss SLA?" The only honest answer is parametric insurance. Operators pay premiums automatically (deducted from rewards). When measured cell uptime falls below the contracted threshold, payout fires automatically — no claims process, no adjuster. Payout scales with severity: 1% shortfall = 10% payout, 10% shortfall = 150% payout. Transforms DePIN from best-effort to bankable enterprise SLA.

**3. Node Reputation System** (`skill/node-reputation-system.md`)
Binary active/inactive catches Sybil after it's already draining rewards. A sliding-window Bayesian score (0–10K) detects degrading nodes before they fail. Confidence grows with observation history — a new node adapts fast (easy to build rep), a mature node is stable (hard to game with one good epoch). Five tiers drive 0.5×–3× reward multipliers. Score feeds into data marketplace access and insurance premiums — reputation becomes the operator's equity.

**4. Data Pricing Oracle** (`skill/data-pricing-oracle.md`)
Fixed price set at launch is always wrong. Sparse network → data scarce → underpriced → protocol undersells. Dense network → data abundant → overpriced → buyers route around it. This on-chain bonding curve adjusts price every epoch: utilization above 75% target → price rises; below → price falls; within 0.5% band → no change (prevents oscillation). Quality-weighted supply prevents low-reputation nodes from inflating supply and depressing prices. Buyer forecast API tells buyers whether to purchase now or wait.

**5. Hardware supply chain + secure element attestation** (`skill/hardware-supply-chain.md`)
Private key never leaves the ATECC608A chip. Counterfeit hardware physically cannot produce a valid SE signature. Includes manufacturing attestation flow, OTA firmware update security, export controls checklist, and the specific CE/RED technical file requirements most hardware teams discover 3 months too late.

**6. RF regulatory compliance** (`skill/regulatory-rf-compliance.md`)
8-jurisdiction frequency matrix (US/EU/UK/AU/JP/BR/IN/KR) with exact power limits, dwell times, and channel plans. The 915 MHz vs 868 MHz incompatibility trap that kills cross-border DePIN rollouts. FCC Part 15 certification timeline (8–15 weeks, $9K–38K) with exact step sequence. On-chain compliance enforcement: nodes that don't register their certified frequency plan cannot submit proofs.

**7. Death-spiral early warning** (`skill/depin-tokenomics.md`)
Typed `assessSpiralRisk()` monitors burn/emit ratio, weekly node churn, operator payback period, and price drawdown simultaneously. When 2+ conditions breach simultaneously → SPIRAL state → automatic escalation to treasury intervention, emission pause, and emergency DAO vote. Based on the actual failure pattern observed across sub-scale DePINs.

**8. Wallet-grade security across the entire skill** (`skill/depin-wallet-security.md`)
A1–A8 threat model: RPC attacker, clipboard hijacker, address poisoner, supply chain attacker, and four more. Argon2id for all password derivation. HD gap limit discovery prevents fund loss on seed phrase restoration. Transaction intent verification hard-blocks unauthorized `SetAuthority` instructions before any signature is provided.

---

## Who Uses Which File

| You want to... | Load this |
|---|---|
| Design a new DePIN from scratch | `agents/depin-architect.md` |
| Model operator ROI before building | `commands/node-economics.md` |
| Build a Proof of Coverage system | `skill/coverage-verification.md` |
| Handle 100K+ device accounts cheaply | `skill/zk-compression.md` |
| Design token economics | `skill/depin-tokenomics.md` |
| Integrate Switchboard or a custom oracle | `skill/oracle-integration.md` |
| Set up hardware identity / anti-Sybil | `skill/hardware-supply-chain.md` |
| Navigate FCC/CE RF compliance | `skill/regulatory-rf-compliance.md` |
| Audit an existing DePIN protocol | `commands/depin-audit.md` |
| Respond to a rogue node cluster | `runbooks/rogue-node-detected.md` |
| Auto-switch proof as network scales | `skill/adaptive-proof-engine.md` |
| Price data dynamically | `skill/data-pricing-oracle.md` |
| Offer enterprise SLA guarantees | `skill/coverage-insurance.md` |
| Score and tier node operators | `skill/node-reputation-system.md` |
| Write operator documentation | `agents/tech-docs-writer.md` |

---

## Quick Prompts (Copy → Paste into Claude Code)

```
"Load agents/depin-architect.md — I'm building a LoRa sensor network for air quality"

"Load skill/zk-compression.md — I need to handle 100K device accounts without paying $40K/year in rent"

"Load skill/depin-tokenomics.md — check if my emission schedule will hit a death spiral"

"Run /depin-audit on my DePIN — program ID is [ADDRESS], token mint is [ADDRESS]"

"Run /node-economics — 250M supply, 55% to operators, hardware cost $400, target 10K nodes"

"Load skill/regulatory-rf-compliance.md — I'm deploying LoRa hotspots across US and EU"

"Load skill/data-pricing-oracle.md — I want my data marketplace price to adjust automatically"

"Load skill/adaptive-proof-engine.md — my H3 cells are reaching 30+ nodes and I need stronger proof"
```

---

## Cross-Skill Integration

This skill is one of five coordinated Solana AI Kit skills. Each shares `wallet-framework.md` and communicates via canonical signals in `ecosystem-signals.md`.

```
solana-depin-builder-skill  ←── YOU ARE HERE
        │
        ├──→  solana-observability-skill       (DEPIN_NODE_OFFLINE → monitoring alert)
        ├──→  solana-incident-response-skill   (DEPIN_ROGUE_NODE → P0 incident)
        ├──→  solana-token-launch-skill         (DEPIN_TGE_READY → TGE execution)
        └── shares wallet-framework.md with all 4 sibling skills
```

**The 5 canonical DePIN signals** (defined in `ecosystem-signals.md`):

| Signal | Severity | Routes to |
|---|---|---|
| `DEPIN_NODE_OFFLINE` | P2 | Observability → alert |
| `DEPIN_ORACLE_FAILURE` | P1 | Incident Response → oracle-failure runbook |
| `DEPIN_COVERAGE_DROP` | P1 | Observability → coverage-drift runbook |
| `DEPIN_ROGUE_NODE` | P0 | Incident Response → rogue-node-detected runbook |
| `WALLET_KEY_COMPROMISED` | P0 | Incident Response → oracle-key-compromise runbook |

---

## Install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh)
```

---

<div align="center">

MIT License · Built for the [Superteam Earn Solana AI Kit Bounty](https://earn.superteam.fun)

*76 files · 587KB · 21 skill docs · 5 agents · 6 commands · 9 runbooks · 17 passing tests*

</div>
