<p align="center">
  <strong>solana-depin-builder-skill</strong><br/>
  Production AI skill for designing and building Decentralized Physical Infrastructure Networks on Solana
</p>

[![MIT License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Solana AI Kit](https://img.shields.io/badge/Solana%20AI%20Kit-compatible-green)](https://github.com/solanabr/solana-ai-kit)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](examples/ts/tests)
[![Anchor](https://img.shields.io/badge/Anchor-v0.30-blue)](examples/anchor)

---

# solana-depin-builder-skill

A production-grade AI skill for the Solana AI Kit that guides founders and engineers through every phase of building a Decentralized Physical Infrastructure Network — from architecture and proof mechanism design through oracle integration, geographic verification, token economics, data marketplace, and network growth.

**The problem it solves:** DePIN is Solana's fastest-growing vertical. Helium, Hivemapper, io.net, Grass, GEODNET — these protocols are collectively worth billions and prove the model works. But every new DePIN team starts from scratch, re-inventing the same architecture decisions with no structured guidance. This skill changes that.

**No other skill in the Solana AI Kit covers DePIN.** This fills a complete category gap.

---

## Runnable Examples

Two fully-tested examples ship with this skill. No setup beyond `npm install` or `anchor build`.

### TypeScript: ROI Calculator + Emission Scheduler

```bash
cd examples/ts
npm install
npm run roi         # prints year-by-year ROI table + writes roi-output.json
npm test            # 10 unit tests: emission schedules, breakeven, edge cases
```

**Sample output:**
```
Verdict:   ✅ Good — breakeven within 24 months
Breakeven: 18 months
Year 1 ROI: -12.4%

┌──────┬───────┬─────────────────┬────────────────┬───────────────┐
│ Year │ Nodes │ USD/Node/Month  │ Monthly Profit │ Cumulative ROI│
├──────┼───────┼─────────────────┼────────────────┼───────────────┤
│  1   │ 500   │ $52.38          │ $44.38         │ -24%          │
│  2   │ 2,000 │ $38.12          │ $30.12         │ 12%           │
│  3   │ 5,000 │ $19.44          │ $11.44         │ 78%           │
└──────┴───────┴─────────────────┴────────────────┴───────────────┘
```

### Anchor: Node Registry Skeleton

```bash
cd examples/anchor
anchor test         # 7 integration tests on local validator
```

**What it demonstrates:**
- Two-keypair model (operator wallet + device keypair)
- Stake escrow on registration
- Ed25519 proof submission with on-chain replay prevention
- Emergency pause mechanism
- Jail/slash for rogue nodes

```bash
# 7 passing (12s)
✅ initializes network config
✅ registers a node and escrows stake
✅ accepts valid proof submission and accrues rewards
✅ allows operator to claim accumulated rewards
✅ jails a node and blocks further proof submission
✅ emergency pause blocks all write instructions
✅ rejects proof with wrong device pubkey
```

---

## Quick Start (Skill Installation)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Stan-lee13/solana-depin-builder-skill/main/install.sh)
```

## Quick Validation

```bash
make validate   # structure check + lint + safety policy + tests
make roi        # run ROI calculator demo
make test       # run all unit tests
```

---

## What No Other Skill Covers

| Capability | This Skill |
|-----------|-----------|
| 5 DePIN architecture patterns with Solana implementations | ✅ |
| Oracle trust level framework (5 levels: centralized → ZK) | ✅ |
| H3 hexagonal geographic indexing with anti-gaming rules | ✅ |
| Beacon/witness proof-of-coverage (Helium-style) | ✅ |
| TEE-based compute verification (Marlin Oyster / Intel TDX) | ✅ |
| Anchor program skeleton with tests (node registry + proof) | ✅ |
| Operator ROI calculator with emission schedule design | ✅ |
| Data marketplace on-chain architecture | ✅ |
| Genesis NFT bootstrap pattern | ✅ |
| Cross-skill wiring (Observability + Incident Response + Token Launch) | ✅ |

---

## Skill Structure

```
solana-depin-builder-skill/
├── SKILL.md                     ← Load first: routing table
├── CLAUDE.md                    ← Behavior rules for AI agents
├── AGENTS.md                    ← Agent roster with stack defaults
├── ecosystem-signals.md         ← Cross-skill event protocols
├── rules/depin-safety.md        ← Always-on safety guardrails
│
├── agents/
│   ├── depin-architect.md       ← Full network design agent
│   └── reward-engineer.md       ← Token economics + ROI agent
│
├── skill/                       ← Progressive sub-skills (load one at a time)
│   ├── network-architecture.md  ← Architecture patterns (A-E)
│   ├── node-registry.md         ← Device identity + Anchor program
│   ├── oracle-integration.md    ← Switchboard + TEE + ZK oracles
│   ├── coverage-verification.md ← H3 geographic proof-of-work
│   ├── reward-system.md         ← Emission design + game theory
│   ├── data-marketplace.md      ← On-chain data monetization
│   ├── network-growth.md        ← Bootstrap + operator acquisition
│   ├── hardware-integration.md  ← Firmware → Solana pipeline
│   ├── depin-token-launch.md    ← TGE readiness gate
│   └── incident-response-integration.md ← Rogue node / oracle attack
│
├── commands/
│   ├── depin-audit.md           ← /depin-audit: 8-domain audit framework
│   └── node-economics.md        ← /node-economics: ROI + emission modeling
│
├── runbooks/
│   ├── rogue-node-detected.md   ← Sybil cluster response
│   ├── oracle-failure.md        ← Oracle manipulation response
│   └── coverage-drift.md        ← Network collapse response
│
└── examples/
    ├── ts/                      ← TypeScript: ROI calculator + tests
    └── anchor/                  ← Rust/Anchor: node registry skeleton + tests
```

---

## Usage

```
"Design my DePIN network from scratch — I'm building a WiFi coverage protocol"
→ Loads agents/depin-architect.md

"Model operator ROI for my sensor network — 10B supply, 40% to nodes"
→ Loads commands/node-economics.md + examples/ts/

"How do I verify physical coverage without fake nodes?"
→ Loads skill/coverage-verification.md

"Audit my existing DePIN architecture"
→ Runs /depin-audit (commands/depin-audit.md)
```

---

## License

MIT — see [LICENSE](LICENSE).

Built for the [Superteam Earn Solana AI Kit bounty](https://earn.superteam.fun).
