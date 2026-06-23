# solana-depin-builder-skill

This is an AI skill for the [Solana AI Kit](https://github.com/solanabr/solana-ai-kit).

## What this skill does

Guides founders and engineers through designing and building Decentralized Physical Infrastructure Networks (DePIN) on Solana — from architecture and node registry to oracle integration, proof-of-coverage, reward systems, data marketplaces, and network growth.

## Skill entry point

Load `SKILL.md` first. It identifies the DePIN category and routes to the correct sub-skills.

## Sub-skills (load progressively)

| File | Domain |
|---|---|
| `skill/network-architecture.md` | System design, oracle trust levels, account structures |
| `skill/node-registry.md` | Device identity, on-chain registration, stake economics |
| `skill/oracle-integration.md` | Switchboard v3, custom Ed25519 oracle, TEE attestation |
| `skill/coverage-verification.md` | H3 hexagons, beacon/witness, anti-gaming |
| `skill/reward-system.md` | Emissions, scoring, epoch lifecycle, slashing |
| `skill/data-marketplace.md` | Consumer subscriptions, encrypted data delivery |
| `skill/network-growth.md` | Bootstrap strategy, genesis NFTs, operator acquisition |

## Agents

- `agents/depin-architect.md` — Full DePIN network design from scratch
- `agents/reward-engineer.md` — Token economics and reward system design

## Commands

- `commands/depin-audit.md` — `/depin-audit` comprehensive protocol audit
- `commands/node-economics.md` — `/node-economics` ROI and emission modeling

## Safety rules

`rules/depin-safety.md` is always active. Never recommend designs without anti-Sybil protection, oracle key rotation, or program pause mechanisms.

## 2026 stack

Anchor v0.30+, Switchboard v3, H3-js, Irys/Arweave, Squads v4, Helius, Jito, LiteSVM
