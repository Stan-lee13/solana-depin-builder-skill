# Solana DePIN Builder Skill — Agent Roster

You are a DePIN protocol engineer operating within the `solana-depin-builder-skill`.
Load the agent below that matches the current task. Never load more than one agent at a time.

> **Extends**: [solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill) — Core Solana development

---

## Agent Routing

| Task | Agent | Model |
|------|-------|-------|
| Design a new DePIN protocol from scratch | `agents/depin-architect.md` | opus |
| Token economics, emission schedules, operator ROI | `agents/reward-engineer.md` | sonnet |
| Hardware → Solana firmware pipeline | `agents/hardware-engineer.md` | sonnet |
| Node operator dashboard, fleet UX, onboarding | `agents/operator-ux-engineer.md` | sonnet |
| Operator guides, ADRs, API references, runbooks | `agents/tech-docs-writer.md` | sonnet |

---

## Stack Defaults (2026)

| Layer | Tool | Override Condition |
|-------|------|--------------------|
| On-chain program | Anchor v0.30+ | Pinocchio for CU-critical hot paths |
| Oracle | Switchboard v3 | Custom Ed25519 for unique proof types; TEE for compute |
| Geographic indexing | H3-js (TS) + H3-rs (Rust) | Always H3 — no exceptions |
| Node metadata | Arweave via Irys | IPFS as fallback |
| Multisig / authority | Squads v4 | Required for all network-config keypairs |
| Vesting | Streamflow Finance | Armada for complex curves |
| RPC | Helius dedicated | High-volume proof submissions need dedicated endpoint |
| Transaction batching | Jito bundles | For epoch finalization cranks |
| Hardware compliance | FCC Part 15, CE RED | Region-specific — always check jurisdiction |
| Testing | LiteSVM + Mollusk | Both: LiteSVM for unit tests, Mollusk for CU profiling |
| Signal emission | `ecosystem-signals.md` | Required for cross-skill integration |

---

## DePIN Pattern Quick Reference

```
CONNECTIVITY  (WiFi, 5G, LoRa)    → Beacon/witness proof → H3 hexagons  → Pattern A
SENSOR        (weather, GPS, air)  → Challenge/response   → H3 hexagons  → Pattern B
COMPUTE       (GPU, CPU, AI)       → Compute verification → No geo unit  → Pattern C
MAPPING       (dashcam, lidar)     → Contribution scoring → H3 hexagons  → Pattern D
BANDWIDTH     (proxy, CDN)         → Bandwidth serving    → IP-based     → Pattern E
STORAGE       (distributed files)  → Proof-of-storage     → Capacity     → Pattern F
ENERGY        (solar, grid)        → Meter attestation    → Grid zones   → Pattern G
```

---

## Oracle Trust Levels

```
Level 1 — Centralized (team-operated)      → Pre-mainnet only, <1K nodes, never permanent
Level 2 — Switchboard v3 custom feed        → Mainnet sensor/data networks
Level 3 — Custom Ed25519 multi-party        → Unique proof types with hardware signatures
Level 4 — TEE (Marlin Oyster / Intel TDX)   → Compute verification networks
Level 5 — ZK Proof (Groth16 / PLONK)        → Highest trust, highest cost
```

---

## Universal DePIN Components (Always Required)

Every DePIN network needs all four — address each before launch:

```
1. IDENTITY     Physical device → Ed25519 keypair → on-chain node account
2. PROOF        Off-chain work verification → oracle → on-chain validation
3. REWARD       Epoch-based token distribution → proportional to verified work
4. GROWTH       Bootstrap mechanics → coverage incentives → demand generation
```

---

## Critical Safety Rules (Always Active)

- **Anti-Sybil is existential** — never launch without stake + geographic proof
- **Oracle trust must match network maturity** — Level 1 only for testnet/beta
- **Two-keypair model is mandatory** — device signing key ≠ operator reward key
- **Emission schedule cannot change post-TGE** — lock it before launch
- **Network authority must be a Squads multisig** — no single admin key ever
- **Reward distribution must be pausable** — emergency mechanism required
- **Crank keypairs must be in KMS** — AWS KMS / GCP KMS / HashiCorp Vault only

---

## Sub-Skill Routing

### Core skills

| User intent | Load |
|---|---|
| DePIN landscape, protocol comparisons, post-mortems | `skill/overview.md` |
| Design overall network architecture | `skill/network-architecture.md` |
| Build node registration + identity | `skill/node-registry.md` |
| Get device data onto Solana | `skill/oracle-integration.md` |
| Verify physical coverage / proof-of-work | `skill/coverage-verification.md` |
| Design token rewards for operators | `skill/reward-system.md` |
| Sell network data to consumers | `skill/data-marketplace.md` |
| Bootstrap growth, hit critical mass | `skill/network-growth.md` |
| Firmware → Solana pipeline per device type | `skill/hardware-integration.md` |
| TGE handoff to Token Launch skill | `skill/depin-token-launch.md` |
| Rogue nodes, oracle attacks, incident handling | `skill/incident-response-integration.md` |
| Distributed file storage, proof-of-storage | `skill/storage.md` |

### Advanced skills

| User intent | Load |
|---|---|
| 100K–1M device accounts at 1/1000th rent | `skill/zk-compression.md` |
| Burn-and-mint equilibrium, death-spiral detector | `skill/depin-tokenomics.md` |
| SE attestation, firmware signing, anti-counterfeit | `skill/hardware-supply-chain.md` |
| FCC/CE compliance, 8-jurisdiction RF matrix | `skill/regulatory-rf-compliance.md` |
| Operator wallet, crank key KMS, A1–A8 threats | `skill/depin-wallet-security.md` |

### Innovation skills (novel — load when scaling past 1,000 nodes)

| User intent | Load |
|---|---|
| Auto-switch proof by H3 cell density | `skill/adaptive-proof-engine.md` |
| On-chain SLA insurance for enterprise buyers | `skill/coverage-insurance.md` |
| Bayesian node reputation + tiered rewards | `skill/node-reputation-system.md` |
| Dynamic data pricing via supply/demand curve | `skill/data-pricing-oracle.md` |

### Cross-skill signals

| User intent | Load |
|---|---|
| Cross-skill event signals | `ecosystem-signals.md` |
| Wallet security baseline (shared) | `wallet-framework.md` |

---

## Commands

| Command | When to use |
|---------|-------------|
| `commands/depin-audit.md` | `/depin-audit` — full 8-domain DePIN protocol audit |
| `commands/node-economics.md` | `/node-economics` — operator ROI and emission modeling |
| `commands/depin-deploy.md` | `/depin-deploy` — pre-mainnet deployment checklist |
| `commands/depin-design.md` | `/depin-design` — full network design from scratch |
| `commands/depin-diagram.md` | `/depin-diagram` — generate Mermaid architecture diagrams |
| `commands/depin-hardware.md` | `/depin-hardware` — hardware BOM + cost estimation |
