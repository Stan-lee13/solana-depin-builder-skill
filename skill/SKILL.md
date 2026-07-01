# DePIN Skill Hub

Progressive loader — read only the sub-skill the task requires.

## Core sub-skills

| File | Covers |
|---|---|
| `overview.md` | DePIN landscape, 7 protocol categories, real post-mortems (Helium/WeatherXM/DIMO) |
| `network-architecture.md` | Architecture patterns A–G, Solana program design, oracle trust levels, stack decisions |
| `node-registry.md` | Device keypair identity, two-keypair model, Anchor registration program, stake economics, anti-Sybil limits |
| `oracle-integration.md` | Switchboard v3 custom feeds, custom Ed25519 oracle service, TEE attestation (Marlin Oyster), 5-tier trust framework |
| `coverage-verification.md` | H3 hexagonal grid, resolution guide, beacon/witness protocol (Helium pattern), sensor cross-validation, anti-gaming rules |
| `reward-system.md` | Emission schedules (halving + decay), work unit scoring, epoch lifecycle (Anchor), delegated staking, slashing conditions |
| `data-marketplace.md` | On-chain marketplace program, subscription model, encrypted data delivery, spot pricing, SLA subscriptions |
| `network-growth.md` | Bootstrap sequence, Genesis NFT program, hardware partner strategy, coverage incentive multipliers, anti-churn mechanics |
| `hardware-integration.md` | Firmware → Solana pipeline per device type (ESP32, RPi, nRF52), secure boot, OTA updates, hardware attestation |
| `depin-token-launch.md` | TGE readiness gates, emission schedule lock, Squads multisig setup, handoff to token-launch-skill |
| `incident-response-integration.md` | Rogue node runbooks, oracle attack response, Sybil detection code, reward pause procedure |
| `storage.md` | Proof-of-storage architecture, challenge-response protocol, sharding, CDN integration, storage tier economics |

## Advanced sub-skills

| File | Covers |
|---|---|
| `zk-compression.md` | Compressed device accounts for 100K–1M nodes; Light Protocol / ZK compression patterns; 1/1000th rent cost |
| `depin-tokenomics.md` | Burn-and-mint equilibrium, coverage-weighted H3 emissions, death-spiral early warning, emission simulation |
| `hardware-supply-chain.md` | Secure element attestation (ATECC608A/SE050), firmware signing, anti-counterfeit, OTA security, export controls |
| `regulatory-rf-compliance.md` | FCC Part 15, CE/RED, 8-jurisdiction frequency matrix, on-chain compliance enforcement |

## Innovation sub-skills

| File | Covers |
|---|---|
| `adaptive-proof-engine.md` | Auto-switches proof strategy (SimpleHeartbeat / WitnessConsensus / VrfChallenge) by H3 cell node density |
| `coverage-insurance.md` | On-chain parametric SLA insurance pool — automatic payouts when uptime < threshold; enterprise SLA contracts |
| `node-reputation-system.md` | Bayesian reputation score 0–10K; 5 reward tiers (0.5×–3×); decay detects degrading nodes before they Sybil |
| `data-pricing-oracle.md` | On-chain bonding curve adjusts data price every epoch by supply/demand; quality-weighted supply; multi-tier pricing |

## Security & wallet sub-skills

| File | Covers |
|---|---|
| `depin-wallet-security.md` | Authority architecture, crank key KMS, session keys for proof submission, A1–A8 threat model, address poisoning defense |

## Load combinations by task

| Task | Load these |
|---|---|
| "Design my DePIN from scratch" | `network-architecture.md` → ask intake questions → load others progressively |
| "How do I register nodes?" | `node-registry.md` |
| "How do I get device data on-chain?" | `oracle-integration.md` |
| "How do I verify physical coverage?" | `coverage-verification.md` |
| "How do I design node rewards?" | `reward-system.md` |
| "How do I monetize my network data?" | `data-marketplace.md` + `data-pricing-oracle.md` |
| "How do I bootstrap 1,000 nodes?" | `network-growth.md` |
| "How do I build firmware for my device?" | `hardware-integration.md` |
| "How do I build a storage DePIN?" | `storage.md` + `oracle-integration.md` + `reward-system.md` |
| "How do I handle 100K+ device accounts?" | `zk-compression.md` |
| "How do I prevent my DePIN from dying?" | `depin-tokenomics.md` → check death-spiral detector |
| "How do I source/certify hardware?" | `hardware-supply-chain.md` + `regulatory-rf-compliance.md` |
| "How do I secure my crank / oracle keys?" | `depin-wallet-security.md` |
| "Auto-switch proof as network scales?" | `adaptive-proof-engine.md` |
| "Enterprise SLA guarantees for data buyers?" | `coverage-insurance.md` |
| "Continuous node quality scoring?" | `node-reputation-system.md` |
| "Dynamic pricing for my data marketplace?" | `data-pricing-oracle.md` |
| "Full network architecture review" | Load all core files progressively |
