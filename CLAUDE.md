# Solana DePIN Builder Skill

> Production-grade AI skill for designing and building Decentralized Physical Infrastructure Networks on Solana.

## Purpose

You are operating with the `solana-depin-builder-skill` loaded. This skill activates specialized DePIN engineering knowledge across architecture, oracle design, proof mechanisms, token economics, hardware integration, and network growth.

## What This Skill Enables

### Core capabilities

| Capability | How to Access |
|-----------|---------------|
| Full network design from scratch | `agents/depin-architect.md` |
| Token economics and ROI modeling | `agents/reward-engineer.md` |
| Hardware firmware pipeline | `agents/hardware-engineer.md` |
| Operator dashboard and UX | `agents/operator-ux-engineer.md` |
| Technical documentation | `agents/tech-docs-writer.md` |
| Oracle integration (Switchboard, TEE, ZK) | `skill/oracle-integration.md` |
| H3 geographic proof-of-coverage | `skill/coverage-verification.md` |
| On-chain node registration program | `skill/node-registry.md` |
| Data marketplace for consumers | `skill/data-marketplace.md` |
| Network bootstrapping strategy | `skill/network-growth.md` |
| Full network audit | `commands/depin-audit.md` |
| Operator ROI modeling | `commands/node-economics.md` |
| Pre-mainnet deployment checklist | `commands/depin-deploy.md` |
| Architecture diagram generation | `commands/depin-diagram.md` |

### Advanced capabilities

| Capability | How to Access |
|-----------|---------------|
| 100K–1M device accounts at 1/1000th rent | `skill/zk-compression.md` |
| Death-spiral early warning | `skill/depin-tokenomics.md` |
| Secure element attestation + firmware signing | `skill/hardware-supply-chain.md` |
| FCC/CE RF compliance, 8 jurisdictions | `skill/regulatory-rf-compliance.md` |
| Crank key KMS, A1–A8 threat model | `skill/depin-wallet-security.md` |
| Distributed file storage (proof-of-storage) | `skill/storage.md` |

### Innovation capabilities (novel — not found elsewhere)

| Capability | How to Access |
|-----------|---------------|
| Auto-switch proof strategy by node density | `skill/adaptive-proof-engine.md` |
| On-chain parametric SLA insurance pool | `skill/coverage-insurance.md` |
| Bayesian node reputation + tiered multipliers | `skill/node-reputation-system.md` |
| Dynamic data pricing via bonding curve | `skill/data-pricing-oracle.md` |

---

## DePIN Pattern Quick Reference

```
CONNECTIVITY  (WiFi, 5G, LoRa)    → Beacon/witness proof  → H3 hexagons  → Pattern A
SENSOR        (weather, GPS, air)  → Challenge/response    → H3 hexagons  → Pattern B
COMPUTE       (GPU, CPU, AI)       → Compute verification  → No geo unit  → Pattern C
MAPPING       (dashcam, lidar)     → Contribution scoring  → H3 hexagons  → Pattern D
BANDWIDTH     (proxy, CDN)         → Bandwidth serving     → IP-based     → Pattern E
STORAGE       (distributed files)  → Proof-of-storage      → Capacity     → Pattern F
ENERGY        (solar, grid, demand)→ Meter attestation     → Grid zones   → Pattern G
```

---

## Oracle Trust Level Quick Reference

```
Level 1 — Centralized (team-operated)    → Pre-mainnet only, <1K nodes
Level 2 — Switchboard v3                  → Mainnet, sensor/data networks
Level 3 — Custom Ed25519 multi-party      → Unique proof types with hardware sigs
Level 4 — TEE (Marlin Oyster / Intel TDX) → Compute verification networks
Level 5 — ZK Proof (Groth16 / PLONK)     → Highest trust, highest cost
```

---

## Cross-Domain Integration

This skill bridges:
- **Solana on-chain engineering** — Anchor programs, PDAs, CU optimization, ZK compression
- **Cryptography & hardware** — TEE attestation, ZK proofs, Ed25519 device signing, SE attestation
- **Geographic systems** — H3 hexagonal indexing, GPS verification, coverage modeling
- **Token economics** — Emission design, game theory, anti-Sybil economics, death-spiral detection
- **IoT/hardware** — Device identity, secure element, firmware signing, field deployment, RF compliance
- **Growth & GTM** — Hardware partnerships, node operator acquisition, demand-side strategy
- **Data markets** — Dynamic pricing, SLA contracts, reputation-weighted data quality
- **Security** — A1–A8 threat model, key rotation, supply chain attestation

---

## Stack Defaults (2026)

| Layer | Tool | Override condition |
|-------|------|--------------------|
| On-chain program | Anchor v0.30+ | Pinocchio for CU optimization in hot paths |
| Oracle | Switchboard v3 | Custom Ed25519 for unique proof types |
| Geographic indexing | H3-js (TypeScript) + H3-rs (Rust) | Always use H3 — no exceptions |
| Node metadata | Arweave via Irys | IPFS as fallback (less permanent) |
| Multisig | Squads v4 | Required for network-config authority |
| Vesting | Streamflow Finance | Armada for complex curves |
| RPC | Helius dedicated | Especially for high-volume proof submissions |
| Transaction batching | Jito bundles | For epoch finalization cranks |
| Hardware compliance | FCC Part 15, CE RED | Jurisdiction-specific — always verify |
| Testing | LiteSVM + Mollusk | Both — LiteSVM for unit, Mollusk for CU profiling |
| Secure element | ATECC608A (Microchip) | SE050 (NXP) as alternative |

---

## Behavior Rules

- **Proof mechanism is the first question** — if the proof is not credible, nothing else matters
- **Always run the intake questions before designing** — every answer changes the architecture
- **Name the Sybil risk explicitly** — if a design has no real anti-Sybil, say so directly
- **Give oracle trust level recommendation, not a menu** — based on funding stage and proof type
- **Call existential risks before moving forward** — never build on a broken foundation
- **Compare to real protocols** — ground recommendations in what actually shipped
- **Load only what the task requires** — never load all skill files at once

---

## Token Efficiency

Progressive loading. The SKILL.md router is ~70 lines. Each sub-skill is 200–500 lines.

**Loading order by task:**
1. Quick question → `skill/overview.md` (context) → direct answer
2. Architecture design → `agents/depin-architect.md` → load skill files on demand
3. Specific implementation → load one skill file directly
4. Audit → `commands/depin-audit.md` → load referenced skills as needed

---

## Quick Start

```
"I want to build a decentralized WiFi network on Solana"
→ Load agents/depin-architect.md

"Design my reward system for a weather sensor DePIN"
→ Load agents/reward-engineer.md

"Implement H3 proof-of-coverage for my hotspot network"
→ Load skill/coverage-verification.md

"Audit my DePIN protocol before mainnet"
→ Run /depin-audit

"Model operator ROI for my GPU compute network"
→ Run /node-economics

"I need to handle 500K device accounts without paying $500K/year in rent"
→ Load skill/zk-compression.md

"Is my tokenomics going to hit a death spiral?"
→ Load skill/depin-tokenomics.md
```

---

## Repository

https://github.com/Stan-lee13/solana-depin-builder-skill

Built for the Superteam Earn Solana AI Kit bounty — MIT licensed.
