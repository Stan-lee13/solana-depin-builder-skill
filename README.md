<div align="center">

<img src="https://img.shields.io/badge/Solana-DePIN_Builder_Skill-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana DePIN Builder Skill"/>

**The most complete DePIN engineering skill for the Solana AI Kit.**

*Node registry · Proof mechanisms · ZK compression · Oracle integration · Hardware supply chain · Token economics · Incident response · RF compliance*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Anchor](https://img.shields.io/badge/Anchor-v0.30+-blue?style=flat-square)](examples/anchor)
[![Tests](https://img.shields.io/badge/Tests-passing-brightgreen?style=flat-square)](examples)
[![Skills](https://img.shields.io/badge/Skill_files-14-9945FF?style=flat-square)](skill/)
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
| **Cross-skill wiring** | Feeds live into Observability, Incident Response, and Token Launch skills |

---

## 5-Second Proof: What Ships Ready to Run

```bash
# Install
bash <(curl -fsSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh)

# Run the ROI calculator — operator economics in seconds
cd examples/ts && npm install && npm run roi

# Run the Anchor node registry — 7 integration tests on local validator
cd examples/anchor && anchor test
```

**ROI calculator output:**
```
Verdict:   ✅ Breakeven in 18 months
Year 1:    -12.4% ROI   (hardware payback phase)
Year 2:    +38.1% ROI   (network effect kicks in)
Year 3:    +78.0% ROI   (burn rate exceeds emissions)

Node count: 500 → 2,000 → 5,000 over 3 years
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

---

## Skill Map (14 Files, Progressive Loading)

```
solana-depin-builder-skill/
│
├── SKILL.md                          ← Start here: routing table for all 14 skills
├── CLAUDE.md                         ← Behavior rules + opinionated 2026 stack
│
├── skill/
│   ├── overview.md                   ← 5 DePIN patterns, real protocol post-mortems
│   ├── network-architecture.md       ← Architecture patterns A–E with Solana impl
│   ├── node-registry.md              ← Device identity + Anchor program design
│   ├── oracle-integration.md         ← Switchboard, TEE, ZK — 5 trust tiers
│   ├── coverage-verification.md      ← H3 hex grid, beacon/witness, anti-gaming
│   ├── reward-system.md              ← Emission design, game theory, Sybil economics
│   ├── zk-compression.md             ← 100K–1M device accounts at 1/1000th the rent  ★
│   ├── depin-tokenomics.md           ← BME, coverage-weighted rewards, death-spiral ★
│   ├── hardware-supply-chain.md      ← SE attestation, firmware signing, OTA updates ★
│   ├── regulatory-rf-compliance.md   ← FCC Part 15, CE/RED, 8-jurisdiction matrix    ★
│   ├── depin-wallet-security.md      ← A1–A8 threat model, Argon2id, HD gap limits   ★
│   ├── data-marketplace.md           ← On-chain data monetization
│   ├── network-growth.md             ← Bootstrap strategy, operator acquisition
│   ├── hardware-integration.md       ← Firmware pipeline, field deployment
│   ├── depin-token-launch.md         ← TGE readiness gate (cross-skill)
│   └── incident-response-integration.md ← Rogue node, oracle attack (cross-skill)
│
├── agents/
│   ├── depin-architect.md            ← System design, tokenomics, architecture
│   ├── reward-engineer.md            ← ROI modeling, emission design
│   ├── hardware-engineer.md          ← PCB design, SE selection, RF compliance
│   ├── operator-ux-engineer.md       ← Operator dashboard, onboarding UX
│   └── tech-docs-writer.md           ← Operator guides, ADRs, API references   ★
│
├── commands/
│   ├── depin-audit.md                ← /depin-audit: 8-domain protocol audit
│   ├── node-economics.md             ← /node-economics: ROI + emission modeling
│   ├── depin-deploy.md               ← /depin-deploy: pre-mainnet checklist
│   ├── depin-design.md               ← /depin-design: architecture decision flow
│   ├── depin-diagram.md              ← /depin-diagram: generate architecture diagrams
│   └── depin-hardware.md             ← /depin-hardware: hardware spec generator
│
├── runbooks/                         ← 9 incident playbooks with CLI commands
│   ├── rogue-node-detected.md
│   ├── oracle-failure.md
│   ├── oracle-key-compromise.md
│   ├── coverage-drift.md
│   ├── operator-onboarding.md
│   ├── governance-attack.md
│   ├── token-price-crash.md          ← Death-spiral response
│   ├── exchange-delisting.md
│   └── regulatory-enforcement.md     ← FCC/CE enforcement response         ★
│
├── rules/
│   ├── anchor.md                     ← Account validation, CU budget, error codes ★
│   ├── rust.md                       ← No-panic, checked arithmetic, Borsh layout  ★
│   ├── typescript.md                 ← BigInt for u64, rate limiting, strict types  ★
│   └── depin-safety.md               ← Always-on safety guardrails
│
└── examples/
    ├── ts/                           ← ROI calculator + 10 unit tests (run now)
    └── anchor/                       ← Node registry + 7 integration tests (run now)

★ = not found in any other DePIN submission in this bounty
```

---

## Five Things No Other DePIN Submission Has

**1. Hardware supply chain + secure element attestation** (`skill/hardware-supply-chain.md`)
Each device gets a unique cryptographic identity via an embedded secure element (ATECC608A or SE050). Private key never leaves the chip. Counterfeit hardware cannot register because it cannot produce a valid SE signature. Includes manufacturing attestation flow, OTA firmware update security, and export controls checklist.

**2. RF regulatory compliance** (`skill/regulatory-rf-compliance.md`)
FCC Part 15 certification process (8–15 weeks, $9K–38K) with exact steps. EU RED/CE marking checklist. 8-jurisdiction frequency band matrix (US/EU/UK/AU/JP/BR/IN/KR). The 915 MHz vs 868 MHz incompatibility trap that kills cross-border DePIN rollouts. CLI tool that validates hardware frequency/power against regional limits and blocks non-compliant node registration on-chain.

**3. Death-spiral early warning system** (`skill/depin-tokenomics.md`)
Typed `assessSpiralRisk()` function monitors burn/emit ratio, weekly node churn, payback period, and price drawdown simultaneously. When 2+ thresholds breach simultaneously → SPIRAL state → automatic escalation to treasury intervention. Based on the actual failure pattern seen in sub-scale DePINs.

**4. Wallet-grade security across the entire skill** (`skill/depin-wallet-security.md`)
A1–A8 threat model (RPC attacker, clipboard hijacker, address poisoner, supply chain attacker, and 4 more). Argon2id for password derivation. HD gap limit discovery to prevent fund loss on seed phrase restoration. Transaction intent verification that hard-blocks unauthorized `SetAuthority` instructions before signing.

**5. Cross-skill ecosystem coordination** (`ecosystem-signals.md`)
Five canonical signals (`DEPIN_NODE_OFFLINE`, `DEPIN_ORACLE_FAILURE`, `DEPIN_COVERAGE_DROP`, `DEPIN_ROGUE_NODE`, `WALLET_KEY_COMPROMISED`) that route automatically to Observability, Incident Response, and Token Launch skills. Your DePIN monitoring feeds directly into the alerting and response infrastructure without manual wiring.

---

## Who Uses Which File

| You want to... | Load this |
|---|---|
| Design a new DePIN from scratch | `agents/depin-architect.md` |
| Model operator ROI before building | `commands/node-economics.md` |
| Build a Proof of Coverage system | `skill/coverage-verification.md` |
| Handle 100K+ device accounts cheaply | `skill/zk-compression.md` |
| Design token economics | `skill/depin-tokenomics.md` |
| Integrate Switchboard or Pyth | `skill/oracle-integration.md` |
| Set up hardware identity / anti-Sybil | `skill/hardware-supply-chain.md` |
| Navigate FCC/CE compliance | `skill/regulatory-rf-compliance.md` |
| Audit an existing DePIN protocol | `commands/depin-audit.md` |
| Respond to a rogue node cluster | `runbooks/rogue-node-detected.md` |
| Write operator documentation | `agents/tech-docs-writer.md` |

---

## Quick Prompts (Copy → Paste into Claude Code)

```
"Load agents/depin-architect.md — I'm building a LoRa sensor network for air quality"

"Load skill/zk-compression.md — I need to handle 100K device accounts without paying $40K/year in rent"

"Load skill/proof-mechanisms.md — design a Helium-style challenge-response for my WiFi DePIN"

"Run /depin-audit on my DePIN — program ID is [ADDRESS], token mint is [ADDRESS]"

"Run /node-economics — 250M supply, 55% to operators, hardware cost $400, target 10K nodes"

"Load skill/depin-tokenomics.md — check if my emission schedule will hit a death spiral"
```

---

## Cross-Skill Integration

This skill is one of five coordinated skills in a complete Solana wallet and protocol engineering framework:

```
solana-depin-builder-skill  ←──── YOU ARE HERE
        │
        ├──→  Solana-observabilty-skill      (node health → Grafana dashboard)
        ├──→  solana-incident-response-skill (rogue node → P0 incident protocol)
        ├──→  solana-token-launch-skill      (TGE readiness gate for DePIN tokens)
        └──→  solana-ux-skill               (operator dashboard UX patterns)
```

All five skills share `ecosystem-signals.md` event schemas — cross-skill handoffs are automatic.

---

## Install

```bash
# One-line install (interactive: project / global / custom path)
bash <(curl -fsSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh)

# Or clone directly
git clone --depth=1 https://github.com/Stan-lee13/solana-depin-builder-skill .claude/skills/solana-depin-builder-skill
```

---

<div align="center">

MIT License · Built for the [Superteam Earn Solana AI Kit Bounty](https://earn.superteam.fun)

*72 files · 529KB · 14 skill docs · 5 agents · 6 commands · 9 runbooks · 2 runnable examples*

</div>
