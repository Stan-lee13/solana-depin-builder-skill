# DePIN Token Launch — Handoff to Token Launch Skill

> This skill is the structured handoff from DePIN Builder to Token Launch skill.
> A DePIN TGE is NOT a standard token launch. The sequence, timing, and mechanics
> are tightly coupled to network maturity — launch too early and nodes sell immediately,
> destroying the network before it has real users.

---

## Why DePIN TGE Is Different

```
STANDARD TOKEN LAUNCH                  DEPIN TOKEN LAUNCH
    │                                       │
    ├── Community hype                      ├── Network utility matters — users pay
    ├── Whitelist + KYC                     ├── Operators exist pre-TGE (hardware deployed)
    ├── Liquidity bootstrapping             ├── Emission schedule locked pre-TGE
    ├── Exchange listings                   ├── Node rewards start ON token creation
    └── Vesting for team/investors          └── Hardware investors expect ROI from day 1
                                            │
                                            └── MISSING ANY OF THESE = IMMEDIATE DEATH SPIRAL
```

---

## TGE Readiness Gate — 6 Hard Requirements

Do NOT proceed to Token Launch skill until ALL 6 pass:

```typescript
// src/tge/readiness-check.ts
export interface TGEReadinessGate {
  // Gate 1: Network size threshold
  // Rationale: <500 nodes = no organic usage signal, pure speculation
  min_active_nodes: {
    required: 500;      // absolute minimum
    recommended: 2000;  // for credible launch
    current: number;
  };

  // Gate 2: Geographic distribution
  // Rationale: single-city network = local cartel risk, not global infra
  geographic_distribution: {
    min_distinct_regions: 3;   // e.g., Americas, Europe, Asia
    min_distinct_countries: 5;
    current_countries: number;
  };

  // Gate 3: Oracle stability
  // Rationale: reward system must be proven stable — post-TGE oracle failure = catastrophic
  oracle_stability: {
    min_uptime_30d_pct: 99.0;
    min_proof_acceptance_rate_pct: 95.0;
    current_uptime_pct: number;
    current_acceptance_pct: number;
  };

  // Gate 4: Demand-side revenue (most founders skip this — it's the most important)
  // Rationale: pure emissions-based economy collapses without real demand
  demand_side_revenue: {
    min_monthly_usd: 10_000;   // $10K/month before TGE
    current_monthly_usd: number;
    revenue_growth_mom_pct: number;
  };

  // Gate 5: Security audit
  // Rationale: no credible exchange or investor will proceed without it
  security_audit: {
    program_audit_passed: boolean;
    auditor: string;             // e.g., "OtterSec", "Neodyme", "Sec3"
    critical_findings_resolved: boolean;
    audit_report_url: string;
  };

  // Gate 6: Emission schedule locked
  // Rationale: changing emission post-TGE destroys operator trust immediately
  emission_schedule: {
    locked_in_program: boolean;   // hardcoded in Anchor program — not changeable
    total_supply: bigint;
    node_reward_allocation_pct: number;
    emission_years: number;
    schedule_type: "halving" | "linear_decay" | "constant";
  };
}

export function evaluateTGEReadiness(gate: TGEReadinessGate): {
  ready: boolean;
  score: number;  // 0-100
  blocking_items: string[];
  warnings: string[];
} {
  const blocking: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Gate 1: Node count
  if (gate.min_active_nodes.current < gate.min_active_nodes.required) {
    blocking.push(`Node count: ${gate.min_active_nodes.current} / ${gate.min_active_nodes.required} minimum`);
  } else {
    score += 20;
    if (gate.min_active_nodes.current < gate.min_active_nodes.recommended) {
      warnings.push(`Node count ${gate.min_active_nodes.current} below recommended ${gate.min_active_nodes.recommended} for credible launch`);
    }
  }

  // Gate 2: Distribution
  if (gate.geographic_distribution.current_countries < gate.geographic_distribution.min_distinct_countries) {
    blocking.push(`Geographic distribution: ${gate.geographic_distribution.current_countries} countries — need ${gate.geographic_distribution.min_distinct_countries}`);
  } else score += 15;

  // Gate 3: Oracle
  if (gate.oracle_stability.current_uptime_pct < gate.oracle_stability.min_uptime_30d_pct) {
    blocking.push(`Oracle uptime: ${gate.oracle_stability.current_uptime_pct}% < required 99%`);
  } else score += 20;

  // Gate 4: Revenue
  if (gate.demand_side_revenue.current_monthly_usd < gate.demand_side_revenue.min_monthly_usd) {
    blocking.push(`Monthly revenue: $${gate.demand_side_revenue.current_monthly_usd} < required $${gate.demand_side_revenue.min_monthly_usd}`);
  } else {
    score += 25;
    if (gate.demand_side_revenue.revenue_growth_mom_pct < 10) {
      warnings.push("Revenue growth <10% MoM — market appetite concern");
    }
  }

  // Gate 5: Audit
  if (!gate.security_audit.program_audit_passed) {
    blocking.push("Security audit not passed — no credible exchange will list without it");
  } else if (!gate.security_audit.critical_findings_resolved) {
    blocking.push("Critical audit findings unresolved — pause TGE");
  } else score += 10;

  // Gate 6: Emission locked
  if (!gate.emission_schedule.locked_in_program) {
    blocking.push("Emission schedule not locked in program — operators cannot trust ROI projections");
  } else score += 10;

  return {
    ready: blocking.length === 0,
    score,
    blocking_items: blocking,
    warnings,
  };
}
```

---

## DePIN-Specific Token Distribution Model

```typescript
// src/tge/distribution-model.ts
export interface DePINTokenDistribution {
  total_supply: bigint;
  allocations: {
    node_rewards: {
      pct: number;              // Typically 40-60% for pure DePIN
      vesting: "emission_schedule";  // No cliff — rewards start immediately
      note: "Must match emission_schedule.locked_in_program";
    };
    team_and_advisors: {
      pct: number;              // Typically 15-20%
      cliff_months: 12;         // 1-year cliff minimum — operators watch this
      vesting_months: 48;
    };
    investors: {
      pct: number;              // Typically 15-25%
      cliff_months: 6;          // 6-month minimum
      vesting_months: 24;
    };
    ecosystem_and_grants: {
      pct: number;              // 10-15% — hardware subsidies, grants
      unlock: "governance";     // Community-controlled
    };
    liquidity_and_exchange: {
      pct: number;              // 5-8%
      unlock: "immediate";      // Required for market-making
    };
    community_airdrop: {
      pct: number;              // 2-5% — early node operators
      snapshot_date: string;
      vesting_months: 12;
    };
  };
}

// Anti-patterns to avoid in DePIN token distribution:
export const DEPIN_TGE_ANTI_PATTERNS = [
  "Team cliff < 12 months — operators see team as a dump risk",
  "Node rewards < 40% of supply — network is not operator-aligned",
  "Emission schedule changeable post-launch — destroys operator ROI certainty",
  "No community airdrop for genesis operators — they built your network, reward them",
  "Unlock schedule faster than network growth — creates sell pressure before utility",
  "No buy-back mechanism — pure emissions without demand = indefinite inflation",
];
```

---

## DePIN-Specific Launch Sequence

```
PRE-TGE (T-90 days to T-30 days)
  □ Snapshot: all node operators who participated before snapshot date
  □ Lock emission schedule in Anchor program — verify on-chain
  □ Deploy vesting contracts (Streamflow) for team + investors
  □ Audit report published — no critical or high findings unresolved
  □ Prepare genesis operator airdrop Merkle tree
  □ Exchange negotiations — DEX liquidity + CEX application
  □ Hardware operator communication: "TGE in 30 days, here's what changes"

T-14 DAYS
  □ Announce TGE date publicly — operators need lead time
  □ Publish full token allocation breakdown — operators verify node reward %
  □ Demo the claim interface on devnet — must work before mainnet
  □ Liquidity provisioning briefed to market makers

T-7 DAYS
  □ Final audit re-check (no new program upgrades after this point)
  □ Reward distribution tested on mainnet with 10 operator test accounts
  □ Multisig transfer: upgrade authority → Squads DAO (no single key control)
  □ Emergency pause mechanism tested — verify it works

T-0: TGE DAY
  □ Mint token
  □ Distribute genesis operator airdrop
  □ Activate node reward distribution program
  □ Open DEX liquidity
  □ Monitoring: watch reward distribution for first epoch VERY closely
  □ Load solana-observability-skill if not already active

T+1: FIRST EPOCH
  □ Verify reward distribution correct for top-10 operators
  □ Verify no double-distribution
  □ Verify emission matches locked schedule (not 1 token over/under)
  □ Monitor sell pressure — operators will sell first rewards to cover HW cost

T+30: STABILITY CHECK
  □ Network node count: growing or stable (not declining)?
  □ Token price vs expected operator ROI — still profitable to operate?
  □ Revenue growth vs emissions — converging or diverging?
```

---

## Handoff to Token Launch Skill

When all 6 TGE Readiness Gates pass, fire this signal and load the Token Launch skill:

```typescript
// src/tge/handoff.ts
import { emitDePINSignal } from "../signals/emit";

export async function triggerTGEHandoff(
  networkId: string,
  readinessResult: ReturnType<typeof evaluateTGEReadiness>
): Promise<void> {
  if (!readinessResult.ready) {
    throw new Error(
      `TGE not ready. Blocking items: ${readinessResult.blocking_items.join(", ")}`
    );
  }

  await emitDePINSignal({
    signal: "DEPIN_TGE_READY",
    source_skill: "solana-depin-builder-skill",
    network_id: networkId,
    readiness_score: readinessResult.score,
    gates: {
      min_nodes_met: true,
      geographic_distribution_met: true,
      oracle_stability_met: true,
      demand_side_revenue_met: true,
      security_audit_complete: true,
      emission_schedule_locked: true,
    },
    blocking_items: [],
    recommended_launch_window: getRecommendedLaunchWindow(),
    handoff_to: "solana-token-launch-skill",
    timestamp_utc: new Date().toISOString(),
  }, {
    discordOpsChannel: process.env.DISCORD_OPS_WEBHOOK,
  });

  console.log(`
  ═══════════════════════════════════════════════════
  TGE HANDOFF TRIGGERED — ${networkId}
  ═══════════════════════════════════════════════════
  Next: Load solana-token-launch-skill
  Run: /tge-orchestrator with your network parameters
  Reference: skill/listing-strategy.md for exchange approach
  Reference: skill/legal-compliance.md for jurisdiction review
  ═══════════════════════════════════════════════════
  `);
}

function getRecommendedLaunchWindow(): string {
  // Avoid: December (holiday low volume), major market events, competing launches
  const now = new Date();
  const month = now.getMonth();
  // Preferred: Jan-Feb, Apr-May, Sep-Oct
  return month === 11 || month === 0
    ? "Delay to February — holiday market conditions unfavorable"
    : "Current window is suitable — proceed with T-90 checklist";
}
```
