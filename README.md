<p align="center">
  <strong>solana-depin-builder-skill</strong><br/>
  Production AI skill for designing and building Decentralized Physical Infrastructure Networks on Solana
</p>

[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Solana AI Kit](https://img.shields.io/badge/Solana%20AI%20Kit-compatible-green)](https://github.com/solanabr/solana-ai-kit)

---

# solana-depin-builder-skill

A production-grade AI skill for the Solana AI Kit that guides founders and engineers through every phase of building a Decentralized Physical Infrastructure Network — from architecture and proof mechanism design through oracle integration, geographic verification, token economics, data marketplace, and network growth.

**The problem it solves:** DePIN is Solana's fastest-growing vertical. Helium, Hivemapper, io.net, Grass, GEODNET — these protocols are collectively worth billions and prove the model works. But every new DePIN team starts from scratch, re-inventing the same architecture decisions with no structured guidance. This skill changes that.

**No other skill in the Solana AI Kit covers DePIN.** This fills a complete category gap.

---

## What No Other Skill Covers

| Capability | This Skill |
|-----------|-----------|
| 5 DePIN architecture patterns with Solana implementations | ✅ |
| Oracle trust level framework (5 levels: centralized → ZK) | ✅ |
| H3 hexagonal geographic indexing with anti-gaming rules | ✅ |
| Beacon/witness proof-of-coverage (Helium-style) | ✅ |
| TEE-based compute verification (Marlin Oyster / Intel TDX) | ✅ |
| Node economics model with operator ROI calculator | ✅ |
| Anti-Sybil stake economics with game theory analysis | ✅ |
| On-chain data marketplace for consumer subscriptions | ✅ |
| Network bootstrap strategy with phased growth model | ✅ |
| 12-week mainnet build sequence | ✅ |

---

## What's Included

```
solana-depin-builder-skill/
├── SKILL.md                          # Router — progressive loading hub
├── README.md                         # This file
├── CLAUDE.md                         # Claude Code configuration with cross-domain map
├── install.sh                        # One-command installer
├── LICENSE                           # MIT
│
├── skill/
│   ├── SKILL.md                      # Sub-skill routing table
│   ├── network-architecture.md       # 5 DePIN patterns, oracle trust levels, Anchor account design
│   ├── node-registry.md              # Device keypair identity, Anchor registration, stake economics
│   ├── oracle-integration.md         # Switchboard v3, custom Ed25519, TEE (Marlin Oyster)
│   ├── coverage-verification.md      # H3 hexagons, beacon/witness protocol, anti-gaming rules
│   ├── reward-system.md              # Emission curves, work scoring, epoch lifecycle, slashing
│   ├── data-marketplace.md           # Consumer subscriptions, encrypted data delivery, pricing
│   └── network-growth.md             # Bootstrap strategy, genesis NFTs, hardware partners, B2B
│
├── agents/
│   ├── depin-architect.md            # Network design with 10-point intake + full architecture output
│   └── reward-engineer.md            # Token economics with ROI modeling + anti-Sybil design
│
├── commands/
│   ├── depin-audit.md                # /depin-audit — 8-domain protocol audit with severity ratings
│   └── node-economics.md             # /node-economics — emission design + operator ROI modeling
│
└── rules/
    └── depin-safety.md               # Always-on safety rules, hardware compliance, anti-patterns
```

---

## Installation

```bash
# One-line install
curl -sSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh | bash

# Into .agents/ for non-Claude tools
curl -sSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh | bash -s -- --agents
```

---

## Usage

### Design a DePIN from scratch
```
Load agents/depin-architect.md — I want to build a decentralized WiFi hotspot network
```

### Design the reward system
```
Load agents/reward-engineer.md — 10B token supply, 40% to node rewards, target 5,000 nodes in year 1
```

### Specific implementation help
```
Load skill/oracle-integration.md — building a weather sensor network, need Switchboard v3 integration

Load skill/coverage-verification.md — designing beacon/witness proof-of-coverage for LoRa hotspots

Load skill/node-registry.md — need on-chain node registration with staking and anti-Sybil

Run /depin-audit — my DePIN protocol is ready for mainnet review
```

---

## Architecture Patterns Covered

| Pattern | Inspiration Protocol | Proof Mechanism | Use Case |
|---------|---------------------|-----------------|---------|
| Beacon/Witness | Helium | RF detection (unforgeable) | WiFi, 5G, LoRa |
| Challenge/Response | GEODNET, WeatherXM | Sensor cross-validation | Weather, GPS, Air quality |
| Compute Verification | io.net | ZK / TEE attestation | GPU compute, AI inference |
| Contribution/Mapping | Hivemapper | ML quality scoring | Dashcam, LiDAR, imagery |
| Bandwidth/Proxy | Grass | Request/response log | CDN, proxy, residential bandwidth |

---

## The Core DePIN Question

Every architecture decision in this skill flows from the same foundation:

> **How do you verify that a physical node actually did the work, without trusting the node?**

This question — proof-of-physical-work — is what separates a real DePIN from an airdrop farm with hardware. This skill provides complete, production-tested answers for all 5 DePIN categories.

---

## Cross-Domain Coverage

This skill bridges:
- **Solana on-chain engineering** — Anchor, PDAs, CU optimization, LiteSVM testing
- **Cryptography & hardware** — TEE, ZK proofs, Ed25519 device signing
- **Geographic systems** — H3 hexagonal indexing, GPS verification, coverage modeling
- **Token economics** — Emission design, anti-Sybil game theory, ROI modeling
- **IoT/hardware** — Device identity, firmware signing, field deployment constraints
- **Growth & GTM** — Hardware partnerships, operator acquisition, demand-side development

---

## 2026 Solana Stack

| Layer | Tools |
|-------|-------|
| On-chain program | Anchor v0.30+, Pinocchio (CU optimization) |
| Testing | LiteSVM, Mollusk |
| Oracle | Switchboard v3, Custom Ed25519, Marlin Oyster (TEE) |
| Geographic indexing | H3-js (TypeScript), H3-rs (Rust) |
| Node metadata | Arweave via Irys |
| Multisig | Squads v4 |
| Vesting (earned rewards) | Streamflow Finance |
| RPC | Helius dedicated (for high-volume proof submissions) |
| Transaction batching | Jito bundles (epoch finalization) |

---

## License

MIT — free to use, submodule, or extend.

## Author

Built by Victor Stanley ([@Stan-lee13](https://github.com/Stan-lee13)) for the Superteam Earn Solana AI Kit bounty.
