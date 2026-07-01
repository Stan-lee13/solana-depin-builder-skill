# Incident Response Integration — Rogue Nodes, Oracle Attacks, Coverage Collapse

> This skill is the DePIN layer on top of `solana-incident-response-skill`.
> Load BOTH skills for any P0/P1 DePIN incident. This file contains
> DePIN-specific runbooks; the Incident Response skill contains the general
> emergency protocol (communications, legal, post-mortem).

---

## DePIN Incident Taxonomy

```
P0 — IMMEDIATE (reward distribution at risk, funds draining)
  ├── Active reward drain via Sybil cluster
  ├── Oracle poisoning causing mass incorrect reward distribution
  ├── Unauthorized program upgrade changing reward logic
  └── Treasury drain (governance attack on emission controller)

P1 — URGENT (network integrity compromised)
  ├── Rogue node cluster (≥5% of network submitting fake proofs)
  ├── Oracle manipulation without confirmed drain
  ├── Coverage collapse (≥20% of nodes go offline in <1 hour)
  └── Geographic monopoly forming (single operator controls ≥25% of rewards)

P2 — MONITOR (anomaly detected, no confirmed exploit)
  ├── Single rogue node detected (isolated — slash + jail)
  ├── Oracle deviation >5% but within tolerance
  ├── Coverage drift in single region
  └── Unusual operator claiming pattern (not yet confirmed Sybil)
```

---

## Runbook 1: Rogue Node / Sybil Cluster

### Detection Signals

```typescript
// src/anti-sybil/detector.ts
import * as h3 from "h3-js";

interface NodeProofHistory {
  node_address: string;
  operator_address: string;
  h3_indices: string[];          // last 100 claimed locations
  submission_timestamps: number[];
  proof_acceptance_rate: number;
}

export function detectSybilCluster(
  nodes: NodeProofHistory[]
): Array<{
  operator: string;
  suspected_nodes: string[];
  evidence_type: "LOCATION_CLUSTER" | "TIMING_CORRELATION" | "IDENTICAL_PROOFS";
  confidence: "HIGH" | "MEDIUM" | "LOW";
}> {
  const findings: ReturnType<typeof detectSybilCluster> = [];

  // 1. Location clustering: multiple nodes in same H3 hex at same resolution
  // Physical limit: a single H3 res-8 hex (~10km²) can't have >50 hotspots profitably
  const locationGroups = new Map<string, NodeProofHistory[]>();
  for (const node of nodes) {
    const primaryHex = node.h3_indices[0];
    if (!primaryHex) continue;
    const res8 = h3.cellToParent(primaryHex, 8); // group at res-8
    if (!locationGroups.has(res8)) locationGroups.set(res8, []);
    locationGroups.get(res8)!.push(node);
  }

  for (const [hex, grouped] of locationGroups) {
    if (grouped.length > 50) {
      // More than 50 nodes in one ~10km² area = physically suspicious
      const operatorGroups = new Map<string, string[]>();
      for (const node of grouped) {
        if (!operatorGroups.has(node.operator_address)) {
          operatorGroups.set(node.operator_address, []);
        }
        operatorGroups.get(node.operator_address)!.push(node.node_address);
      }
      for (const [operator, nodeList] of operatorGroups) {
        if (nodeList.length > 10) {
          findings.push({
            operator,
            suspected_nodes: nodeList,
            evidence_type: "LOCATION_CLUSTER",
            confidence: nodeList.length > 25 ? "HIGH" : "MEDIUM",
          });
        }
      }
    }
  }

  // 2. Timing correlation: proofs submitted within 100ms of each other
  // Real hardware has independent timing — coordinated submissions = software simulation
  const sortedByTime = [...nodes].sort(
    (a, b) => (a.submission_timestamps[0] ?? 0) - (b.submission_timestamps[0] ?? 0)
  );
  for (let i = 0; i < sortedByTime.length - 1; i++) {
    const timeDiffMs =
      (sortedByTime[i + 1].submission_timestamps[0] ?? 0) -
      (sortedByTime[i].submission_timestamps[0] ?? 0);
    if (
      timeDiffMs < 100 &&
      sortedByTime[i].operator_address === sortedByTime[i + 1].operator_address
    ) {
      findings.push({
        operator: sortedByTime[i].operator_address,
        suspected_nodes: [
          sortedByTime[i].node_address,
          sortedByTime[i + 1].node_address,
        ],
        evidence_type: "TIMING_CORRELATION",
        confidence: "MEDIUM",
      });
    }
  }

  return findings;
}
```

### Response Procedure

```
ROGUE NODE DETECTED — RESPONSE SEQUENCE

WITHIN 5 MINUTES:
□ Confirm: is this isolated (1-3 nodes) or a cluster (4+ nodes)?
  → Isolated: proceed with standard slash + jail (see below)
  → Cluster: escalate to P0 — load solana-incident-response-skill/agents/incident-commander.md

□ For ISOLATED rogue node:
  1. Call jailNode(nodeAddress) on your program — prevents further proof submission
  2. Slash stake (execute the slashing condition in your reward program)
  3. Emit DEPIN_ROGUE_NODE signal → Incident Response skill (P2 severity)
  4. Document: tx signature, evidence type, operator address

□ For CLUSTER (P0):
  1. PAUSE ENTIRE REWARD DISTRIBUTION — call pause() on reward program immediately
     (This loses some honest operator rewards but stops the drain)
  2. Load solana-incident-response-skill
  3. Execute incident-commander protocol
  4. Communicate to Discord: "Investigating anomaly — rewards paused temporarily"
  5. Do NOT specify exploit details publicly until containment confirmed
```

### Anchor Program: Jail + Slash

```rust
// programs/depin-network/src/instructions/jail_node.rs
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct JailNode<'info> {
    #[account(mut)]
    pub node_account: Account<'info, NodeAccount>,
    #[account(
        seeds = [b"network-config"],
        bump = network_config.bump,
        constraint = network_config.network_authority == *authority.key @ DepinError::UnauthorizedAuthority
    )]
    pub network_config: Account<'info, NetworkConfig>,
    pub authority: Signer<'info>,  // Must be Squads multisig in production
}

pub fn jail_node(ctx: Context<JailNode>, reason: JailReason) -> Result<()> {
    let node = &mut ctx.accounts.node_account;
    
    require!(
        node.status != NodeStatus::Jailed,
        DepinError::AlreadyJailed
    );
    
    node.status = NodeStatus::Jailed;
    node.jailed_at_epoch = get_current_epoch();
    node.jail_reason = reason;
    
    // Slash: transfer stake to penalty vault
    let slash_amount = match reason {
        JailReason::SybilCluster => node.stake_amount,      // 100% slash
        JailReason::FakeProof => node.stake_amount / 2,     // 50% slash
        JailReason::Downtime => node.stake_amount / 10,     // 10% slash
    };
    
    // Transfer slash_amount from node's stake account to penalty vault
    // (implementation: transfer lamports from stake_escrow to penalty_vault PDA)
    
    emit!(NodeJailedEvent {
        node: node.key(),
        operator: node.operator,
        reason,
        slash_amount,
        epoch: node.jailed_at_epoch,
    });
    
    Ok(())
}
```

---

## Runbook 2: Oracle Manipulation

### Detection

```typescript
// src/oracle/manipulation-detector.ts

export function detectOracleManipulation(
  submissions: Array<{
    oracle_id: string;
    value: number;
    timestamp: number;
    device_pubkey: string;
  }>,
  config: {
    max_deviation_from_median_pct: number;  // typically 15%
    min_valid_submissions: number;          // minimum before epoch reward
    max_submission_rate_per_hour: number;   // physics-based limit
  }
): Array<{
  oracle_id: string;
  manipulation_type: string;
  confidence: "HIGH" | "MEDIUM";
}> {
  const findings = [];
  const values = submissions.map((s) => s.value);
  const median = computeMedian(values);

  for (const sub of submissions) {
    const deviationPct = Math.abs(sub.value - median) / Math.abs(median) * 100;
    
    // Statistical outlier
    if (deviationPct > config.max_deviation_from_median_pct) {
      findings.push({
        oracle_id: sub.oracle_id,
        manipulation_type: `Value ${sub.value} deviates ${deviationPct.toFixed(1)}% from median ${median}`,
        confidence: deviationPct > config.max_deviation_from_median_pct * 2 ? "HIGH" : "MEDIUM",
      });
    }
  }

  // Burst submission rate (physics violation)
  const submissionsPerHour = new Map<string, number>();
  for (const sub of submissions) {
    submissionsPerHour.set(sub.oracle_id, (submissionsPerHour.get(sub.oracle_id) ?? 0) + 1);
  }
  for (const [oracle_id, count] of submissionsPerHour) {
    if (count > config.max_submission_rate_per_hour) {
      findings.push({
        oracle_id,
        manipulation_type: `Submission rate ${count}/hr exceeds physical limit ${config.max_submission_rate_per_hour}/hr`,
        confidence: "HIGH",
      });
    }
  }

  return findings;
}
```

### Response

```
ORACLE MANIPULATION DETECTED — RESPONSE SEQUENCE

P0 (confirmed poisoning causing wrong reward distribution):
□ Pause reward distribution IMMEDIATELY
□ Load solana-incident-response-skill → forensic-investigator.md
□ Identify all epochs where poisoned oracle data was used
□ Calculate correct reward delta for each affected operator
□ Prepare remediation tx: compensate under-rewarded, claw back over-rewarded (if governance approves)
□ Document evidence on-chain before any state changes

P1 (deviation detected, no confirmed drain):
□ Quarantine: stop accepting proofs from flagged oracle nodes
□ Continue rewards using only verified oracle submissions
□ Increase cross-validation requirements (from 3 to 5 confirmations)
□ Monitor for 24 hours — upgrade to P0 if deviation worsens
□ Communicate: "Investigating data quality issue — rewards may be delayed"
```

---

## Runbook 3: Coverage Collapse

```typescript
// src/monitoring/coverage-monitor.ts

export function detectCoverageCollapse(
  currentHexCoverage: Map<string, number>,  // hex → active node count
  previousHexCoverage: Map<string, number>,
  config: { collapse_threshold_pct: number }  // e.g., 20%
): {
  collapsed: boolean;
  vacated_hexes: string[];
  coverage_pct_change: number;
} {
  const prevTotal = [...previousHexCoverage.values()].reduce((a, b) => a + b, 0);
  const currTotal = [...currentHexCoverage.values()].reduce((a, b) => a + b, 0);
  const changePct = ((currTotal - prevTotal) / prevTotal) * 100;

  const vacated = [...previousHexCoverage.keys()].filter(
    (hex) => previousHexCoverage.get(hex)! > 0 && (currentHexCoverage.get(hex) ?? 0) === 0
  );

  return {
    collapsed: changePct < -config.collapse_threshold_pct,
    vacated_hexes: vacated,
    coverage_pct_change: changePct,
  };
}
```

### Response

```
COVERAGE COLLAPSE DETECTED — RESPONSE SEQUENCE

Immediate:
□ Identify: is this hardware failure, network outage, or economic (operators leaving)?
  → Hardware/outage: no action on rewards — wait for recovery
  → Economic (operators leaving): investigate reward economics immediately
  
□ If economic: load commands/node-economics.md → recalculate operator ROI
  Is the hardware cost breakeven still achievable at current token price?
  → If NO: emergency governance proposal to adjust rewards for collapsed regions
  
□ Coverage recovery incentive:
  Activate "coverage bonus" for hexes that were previously covered and are now empty
  Typically 2-5× base rewards for filling gaps
  
□ Communication: status page update — "Coverage reduced in [region]. Working on it."

Cross-skill:
→ Emit DEPIN_COVERAGE_DRIFT signal to Observability
→ If >30% collapse: load solana-incident-response-skill
```

---

## Emergency Pause Pattern (Must Be Built Pre-Launch)

```rust
// programs/depin-network/src/instructions/emergency_pause.rs
// This instruction MUST be tested before mainnet — never ship without it

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(mut, seeds = [b"network-config"], bump)]
    pub network_config: Account<'info, NetworkConfig>,
    // MUST require Squads multisig — not a single signer
    #[account(constraint = network_config.network_authority == *authority.key)]
    pub authority: Signer<'info>,
}

pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    ctx.accounts.network_config.rewards_paused = true;
    ctx.accounts.network_config.paused_at_epoch = get_current_epoch();
    ctx.accounts.network_config.paused_at_slot = Clock::get()?.slot;
    
    emit!(NetworkPausedEvent {
        paused_at_slot: ctx.accounts.network_config.paused_at_slot,
        authority: *ctx.accounts.authority.key,
    });
    
    Ok(())
}

pub fn resume_rewards(ctx: Context<EmergencyPause>) -> Result<()> {
    require!(
        ctx.accounts.network_config.rewards_paused,
        DepinError::NetworkNotPaused
    );
    ctx.accounts.network_config.rewards_paused = false;
    Ok(())
}
```

---

## Cross-Skill Escalation Matrix

| Incident | DePIN Action | Escalate To | Load |
|---|---|---|---|
| Isolated rogue node | Jail + slash | None (handle internally) | `skill/node-registry.md` |
| Sybil cluster (≥5 nodes) | Pause rewards | Incident Response (P1) | `solana-incident-response-skill` |
| Oracle poisoning (confirmed) | Pause + forensics | Incident Response (P0) | `runbooks/oracle-key-compromise.md` |
| Coverage collapse (economic) | Adjust rewards | Token Launch (governance) | `skill/network-growth.md` |
| Treasury governance attack | Emergency pause | Incident Response (P0) | `runbooks/governance-attack.md` |
| TGE exploit | Pause distribution | Incident Response (P0) | `runbooks/token-price-crash.md` |
