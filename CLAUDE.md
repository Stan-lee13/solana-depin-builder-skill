# Solana DePIN Builder Skill

> Production-grade AI skill for designing and building Decentralized Physical Infrastructure Networks on Solana.

## Purpose

You are operating with the `solana-depin-builder-skill` loaded. This skill activates specialized DePIN engineering knowledge across architecture, oracle design, proof mechanisms, token economics, and network growth.

## What This Skill Enables

| Capability | How to Access |
|-----------|---------------|
| Full network design from scratch | `agents/depin-architect.md` |
| Token economics and ROI modeling | `agents/reward-engineer.md` |
| Oracle integration (Switchboard, TEE, ZK) | `skill/oracle-integration.md` |
| H3 geographic proof-of-coverage | `skill/coverage-verification.md` |
| On-chain node registration program | `skill/node-registry.md` |
| Data marketplace for consumers | `skill/data-marketplace.md` |
| Network bootstrapping strategy | `skill/network-growth.md` |
| Full network audit | `commands/depin-audit.md` |
| Operator ROI modeling | `commands/node-economics.md` |

## DePIN Pattern Quick Reference

```
CONNECTIVITY  (WiFi, 5G, LoRa)    → Beacon/witness proof → H3 hexagons → Pattern A
SENSOR        (weather, GPS, air)  → Challenge/response   → H3 hexagons → Pattern B
COMPUTE       (GPU, CPU, AI)       → Compute verification → No geo unit → Pattern C
MAPPING       (dashcam, lidar)     → Contribution scoring → H3 hexagons → Pattern D
BANDWIDTH     (proxy, CDN)         → Bandwidth serving     → IP-based    → Pattern E
```

## Oracle Trust Level Quick Reference

```
Level 1 — Centralized (team-operated)    → Pre-mainnet, <1K nodes
Level 2 — Switchboard v3                  → Mainnet, sensor/data networks
Level 3 — Custom Ed25519 multi-party      → Unique proof types
Level 4 — TEE (Marlin Oyster)             → Compute verification
Level 5 — ZK Proof                        → Highest trust, highest cost
```

## Cross-Domain Integration

This skill bridges:
- **Solana on-chain engineering** — Anchor programs, PDAs, CU optimization
- **Cryptography & hardware** — TEE attestation, ZK proofs, Ed25519 device signing
- **Geographic systems** — H3 hexagonal indexing, GPS verification, coverage modeling
- **Token economics** — Emission design, game theory, anti-Sybil economics
- **IoT/hardware** — Device identity, firmware signing, field deployment
- **Growth & GTM** — Hardware partnerships, node operator acquisition, demand-side strategy

When a user asks a DePIN question that touches multiple domains (e.g., "how do I prevent fake nodes while keeping economics attractive?"), respond across all relevant domains without needing to be prompted.

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
| Hardware compliance | FCC Part 15, CE RED | Jurisdiction-specific |
| Testing | LiteSVM + Mollusk | Both — LiteSVM for unit, Mollusk for CU profiling |

## Behavior Rules

- **Proof mechanism is the first question** — if the proof mechanism isn't credible, nothing else matters
- **Always ask the 10 intake questions before designing** — every question changes the architecture
- **Name the Sybil risk explicitly** — if a design has no real anti-Sybil, say so directly
- **Give oracle trust level recommendation, not a menu** — based on funding stage and proof type
- **Call existential risks before moving forward** — don't build on a broken foundation
- **Compare to real protocols** — ground recommendations in what actually shipped

## Token Efficiency

Progressive loading. The SKILL.md router is ~28 lines. Each sub-skill is 250-380 lines. Load only what the current task requires.

**Never load all 7 skill files at once.** A question about oracle integration needs `oracle-integration.md` — not the reward system or growth files.

## Quick Start

```
"I want to build a decentralized WiFi network on Solana — Load agents/depin-architect.md"

"Design my reward system for a weather sensor DePIN — Load agents/reward-engineer.md"

"Implement H3 proof-of-coverage for my hotspot network — Load skill/coverage-verification.md"

"Audit my DePIN protocol before mainnet — Run /depin-audit"

"Model operator ROI for my GPU compute network — Run /node-economics"
```

## Repository

https://github.com/Stan-lee13/solana-depin-builder-skill

Built for the Superteam Earn Solana AI Kit bounty.
