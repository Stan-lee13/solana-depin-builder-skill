# solana-depin-builder-skill

> A production-grade AI skill for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit) that guides founders and engineers through every phase of building a Decentralized Physical Infrastructure Network (DePIN) on Solana.

---

## The problem this solves

DePIN is the fastest-growing vertical on Solana. Helium, Hivemapper, io.net, Grass, GEODNET — these protocols are worth billions and prove the model works. But every new DePIN team starts completely from scratch, reinventing the same architecture decisions with no guidance:

- **How do I verify that a physical device actually did the work?**
- **How do I prevent fake nodes from draining my reward pool?**
- **How do I design token rewards that keep operators profitable through a bear market?**
- **How do I represent geographic coverage on-chain?**
- **How do I bootstrap a network before I have any demand?**
- **What oracle trust model is right for my proof mechanism?**

Not a single skill in the Solana AI Kit addresses any of this. Every DePIN builder figures it out ad-hoc. This skill changes that.

---

## What's included

```
solana-depin-builder-skill/
├── SKILL.md                          # Entry point — DePIN category router
├── CLAUDE.md                         # Project context for Claude Code
├── README.md
├── install.sh
├── LICENSE                           # MIT
│
├── skill/
│   ├── SKILL.md                      # Sub-skill hub with pattern × skill matrix
│   ├── network-architecture.md       # 5 DePIN patterns, account design, oracle trust levels
│   ├── node-registry.md              # Device identity, Anchor registration program, stake economics
│   ├── oracle-integration.md         # Switchboard v3, custom Ed25519 oracle, TEE (Marlin Oyster)
│   ├── coverage-verification.md      # H3 hexagons, beacon/witness protocol, anti-gaming rules
│   ├── reward-system.md              # Emission curves, work scoring, epoch lifecycle, slashing
│   ├── data-marketplace.md           # Consumer subscriptions, encrypted data delivery, pricing
│   └── network-growth.md             # Bootstrap strategy, genesis NFTs, hardware partners, B2B
│
├── agents/
│   ├── depin-architect.md            # Full network design agent with intake + risk escalation
│   └── reward-engineer.md            # Token economics agent with ROI modeling
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
```

Or manually:

```bash
git clone https://github.com/Stan-lee13/solana-depin-builder-skill.git
cd solana-depin-builder-skill && bash install.sh
```

---

## Usage

### Design a new DePIN network from scratch

```
Load agents/depin-architect.md — I want to build a decentralized WiFi hotspot network
```

### Get help with a specific phase

```
I'm building a weather sensor network on Solana — load skill/oracle-integration.md

Help me design the beacon/witness proof-of-coverage — load skill/coverage-verification.md

I need to model operator ROI for my GPU compute network — run /node-economics

Audit my DePIN protocol before we go to mainnet — run /depin-audit
```

### DePIN categories fully supported

| Category | Inspiration Protocol | Key Skills |
|---|---|---|
| Connectivity (WiFi/LoRa/5G) | Helium | coverage-verification + reward-system |
| Compute (GPU/CPU) | io.net | oracle-integration + reward-system |
| Sensor (weather/GPS/air) | GEODNET | oracle-integration + data-marketplace |
| Mapping (dashcam/lidar) | Hivemapper | coverage-verification + data-marketplace |
| Bandwidth (proxy/CDN) | Grass | oracle-integration + reward-system |
| Storage | Filecoin on Solana | oracle-integration + data-marketplace |

---

## 2026 Solana stack

| Layer | Tools |
|---|---|
| On-chain program | Anchor v0.30+, Pinocchio (CU optimization) |
| Testing | LiteSVM, Mollusk |
| Oracle | Switchboard v3, Custom Ed25519, Marlin Oyster (TEE) |
| Geographic indexing | H3-js (TypeScript), H3-rs (Rust) |
| Node metadata | Arweave via Irys |
| Multisig | Squads v4 |
| Vesting (earned rewards) | Streamflow Finance |
| RPC | Helius (dedicated for high-volume proof submissions) |
| Transaction batching | Jito bundles (epoch finalization) |
| Hardware compliance | FCC Part 15, CE RED, ANATEL, NCC |

---

## Why DePIN on Solana?

- **Speed:** 400ms finality = real-time proof submission from field devices
- **Cost:** Sub-cent transactions = viable for high-frequency node heartbeats
- **Ecosystem:** Switchboard, Pyth, Helius, Squads all DePIN-ready
- **Community:** Superteam chapters worldwide = global node operator acquisition
- **Precedent:** Helium migrated here. Hivemapper built here. The infrastructure works.

---

## License

MIT — free to use, merge, or submodule into the Solana AI Kit.

---

## Author

Built by Victor Stanley ([@Stan-lee13](https://github.com/Stan-lee13)) for the Superteam Earn Solana AI Kit bounty.
