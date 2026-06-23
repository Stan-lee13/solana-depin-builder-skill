# DePIN Skill Hub

Progressive loader — read only the sub-skill the task requires.

## Sub-skills

| File | Covers |
|---|---|
| `network-architecture.md` | DePIN categories, architecture patterns (Helium/Hivemapper/io.net), Solana program design, oracle trust levels, tech stack decisions |
| `node-registry.md` | Device keypair identity, two-keypair model, Anchor registration program, node metadata standard, stake economics, de-registration, anti-Sybil limits |
| `oracle-integration.md` | Switchboard v3 custom feeds, custom Ed25519 oracle service, TEE attestation (Marlin Oyster), multi-source aggregation, proof submission crank |
| `coverage-verification.md` | H3 hexagonal grid, resolution guide, beacon/witness protocol (Helium pattern), sensor data cross-validation, anti-gaming rules |
| `reward-system.md` | Emission schedules (halving + decay), work unit scoring, epoch lifecycle (Anchor), delegated staking, slashing conditions, ROI calculator |
| `data-marketplace.md` | On-chain marketplace program, subscription model, encrypted data delivery, spot pricing, SLA subscriptions, consumer SDK |
| `network-growth.md` | Bootstrap sequence, Genesis NFT program, hardware partner strategy, coverage incentive multipliers, demand generation, anti-churn mechanics |

## Load combinations by task

| Task | Load these |
|---|---|
| "Design my DePIN from scratch" | `network-architecture.md` → ask questions → load others progressively |
| "How do I register nodes?" | `node-registry.md` |
| "How do I get device data on-chain?" | `oracle-integration.md` |
| "How do I verify physical coverage?" | `coverage-verification.md` |
| "How do I design node rewards?" | `reward-system.md` |
| "How do I monetize my network data?" | `data-marketplace.md` |
| "How do I bootstrap 1000 nodes?" | `network-growth.md` |
| "Full network architecture review" | All files — load progressively |
