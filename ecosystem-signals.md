# DePIN Ecosystem Signals

> This file defines the cross-skill communication protocol for the DePIN Builder skill.
> It standardizes how DePIN events propagate to Observability, Incident Response,
> Token Launch, and UX skills — and how those skills feed back into DePIN operations.

---

## Signal Taxonomy

```
OUTBOUND (DePIN → other skills)
  ├── DePIN → Observability     : node health metrics, oracle anomalies, coverage drift
  ├── DePIN → Incident Response : rogue node detection, oracle manipulation, drain events
  ├── DePIN → Token Launch      : TGE readiness checklist, network maturity signals
  └── DePIN → UX               : operator dashboard events, slash notifications

INBOUND (other skills → DePIN)
  ├── Incident Response → DePIN : confirmed exploit → pause reward distribution
  ├── Observability → DePIN     : anomaly detected → trigger rogue-node runbook
  └── Token Launch → DePIN      : post-TGE unlock schedule → adjust emission parameters
```

---

## Signal Schemas

### 1. Node Health Signal → Observability

Emitted every epoch by the reward crank when distributing rewards.

```typescript
// src/signals/node-health-signal.ts
export interface NodeHealthSignal {
  signal: "DEPIN_NODE_HEALTH";
  source_skill: "solana-depin-builder-skill";
  network_id: string;            // your protocol name slug
  epoch: number;
  node_address: string;          // device registration account pubkey
  operator_address: string;
  status: "active" | "warning" | "offline" | "jailed";
  uptime_pct_7d: number;
  proof_submissions_epoch: number;
  reward_earned_epoch: number;   // in token base units
  slash_count_30d: number;
  h3_index?: string;             // geographic location (if applicable)
  timestamp_utc: string;
}

// Emit to observability skill's Prometheus metric:
// solana_depin_node_active{node_address, node_type}
// solana_depin_node_stake_lamports{node_address}
// solana_depin_epoch_reward_tokens{node_address}
```

### 2. Oracle Anomaly Signal → Incident Response

Fired when oracle deviation exceeds threshold or validation fails.

```typescript
export interface OracleAnomalySignal {
  signal: "DEPIN_ORACLE_ANOMALY";
  source_skill: "solana-depin-builder-skill";
  severity: "P0" | "P1" | "P2";
  network_id: string;
  oracle_feed: string;           // Switchboard feed pubkey or custom oracle ID
  anomaly_type:
    | "DEVIATION_EXCEEDED"       // value deviated > threshold vs peer oracles
    | "SUBMISSION_STALE"         // no new value submitted in expected window
    | "SYBIL_CLUSTER_DETECTED"   // multiple proofs from same geographic origin
    | "REPLAY_ATTACK"            // duplicate proof hash detected
    | "SIGNATURE_INVALID";       // device signature fails verification
  affected_nodes: string[];
  current_value?: number;
  expected_range?: [number, number];
  evidence_signature?: string;   // tx signature proving the anomaly
  recommended_action: string;
  timestamp_utc: string;
}
```

### 3. Coverage Drift Signal → Observability + Incident Response

Fired when network coverage KPIs drop below SLO thresholds.

```typescript
export interface CoverageDriftSignal {
  signal: "DEPIN_COVERAGE_DRIFT";
  source_skill: "solana-depin-builder-skill";
  severity: "P1" | "P2";
  network_id: string;
  drift_type:
    | "HEXAGON_VACANCY"          // H3 cells previously covered now empty
    | "UPTIME_SLO_BREACH"        // overall network uptime below SLO
    | "GEOGRAPHIC_CONCENTRATION" // >30% of nodes in single metro area
    | "OPERATOR_CHURN_SPIKE";    // unusual node deregistration rate
  affected_hexagons?: string[];
  churn_rate_pct?: number;
  current_coverage_pct?: number;
  slo_target_pct?: number;
  timestamp_utc: string;
}
```

### 4. TGE Readiness Signal → Token Launch Skill

Emitted when DePIN network crosses readiness thresholds for token generation event.

```typescript
export interface TGEReadinessSignal {
  signal: "DEPIN_TGE_READY";
  source_skill: "solana-depin-builder-skill";
  network_id: string;
  readiness_score: number;       // 0-100
  gates: {
    min_nodes_met: boolean;       // e.g., ≥1,000 active nodes
    geographic_distribution_met: boolean; // nodes in ≥3 regions
    oracle_stability_met: boolean;        // 30-day oracle uptime ≥99%
    demand_side_revenue_met: boolean;     // ≥$10K/month protocol revenue
    security_audit_complete: boolean;     // program audit passed
    emission_schedule_locked: boolean;    // cannot be changed post-TGE
  };
  blocking_items: string[];      // items that must be resolved before TGE
  recommended_launch_window: string;
  handoff_to: "solana-token-launch-skill";
  timestamp_utc: string;
}
```

### 5. Rogue Node Signal → Incident Response

Most critical signal — fired when Sybil or exploit pattern detected.

```typescript
export interface RogueNodeSignal {
  signal: "DEPIN_ROGUE_NODE";
  source_skill: "solana-depin-builder-skill";
  severity: "P0" | "P1";
  network_id: string;
  rogue_type:
    | "SYBIL_CLUSTER"            // multiple nodes from same physical location
    | "REWARD_DRAIN"             // unusual reward claiming rate
    | "FAKE_COVERAGE"            // claimed H3 hex is physically impossible
    | "ORACLE_POISONING"         // submitting falsified oracle data
    | "COORDINATED_ATTACK";      // multiple accounts coordinating exploit
  suspected_nodes: string[];
  operator_address?: string;
  evidence: {
    tx_signatures: string[];
    h3_indices?: string[];
    proof_hashes?: string[];
  };
  recommended_action:
    | "SLASH_AND_JAIL"
    | "PAUSE_REWARDS_FOR_OPERATOR"
    | "EMERGENCY_PAUSE_PROGRAM"
    | "ALERT_AND_MONITOR";
  timestamp_utc: string;
}
```

---

## Signal Routing Rules

| Signal | Primary Target | Secondary Target | Response Time |
|--------|---------------|-----------------|---------------|
| `DEPIN_NODE_HEALTH` | Observability (metrics) | UX (operator dashboard) | Async / epoch |
| `DEPIN_ORACLE_ANOMALY` | Incident Response | Observability (alert) | P0: Immediate, P1: 15min |
| `DEPIN_COVERAGE_DRIFT` | Observability | Internal (growth team) | 1 hour |
| `DEPIN_TGE_READY` | Token Launch | Internal (founders) | Next planning cycle |
| `DEPIN_ROGUE_NODE` | Incident Response | Network authority (multisig) | P0: Immediate |

---

## Inbound Signal Handlers

### From Incident Response → DePIN (pause rewards)

```typescript
// When incident-response-skill confirms an active exploit:
export interface IncidentPauseSignal {
  signal: "OBS_ANOMALY_TO_INCIDENT";      // from incident-response-skill
  action_required: "PAUSE_DEPIN_REWARDS";
  program_id: string;
  incident_id: string;
}

// DePIN response: call pause() on your Anchor reward-distribution program
// This must be wired to your network_authority multisig
// Load skill/incident-response-integration.md for full procedure
```

### From Observability → DePIN (anomaly trigger)

```typescript
// When observability-skill detects oracle deviation:
export interface ObsAnomalyInbound {
  signal: "OBS_ANOMALY_TO_INCIDENT";
  source_skill: "Solana-observabilty-skill";
  alert_type: "DEPIN_ORACLE_ANOMALY" | "DEPIN_NODE_OFFLINE";
  // → Load skill/incident-response-integration.md → rogue-node runbook
}
```

---

## Emission of Signals — Implementation Pattern

```typescript
// src/signals/emit.ts
// Standardized signal emission — add to your epoch crank or webhook handler

export async function emitDePINSignal(
  signal: NodeHealthSignal | OracleAnomalySignal | CoverageDriftSignal | TGEReadinessSignal | RogueNodeSignal,
  config: {
    observabilityWebhook?: string;
    incidentWebhook?: string;
    discordOpsChannel?: string;
  }
): Promise<void> {
  const payload = JSON.stringify(signal);

  // Route by signal type
  if (signal.signal === "DEPIN_ROGUE_NODE" || signal.signal === "DEPIN_ORACLE_ANOMALY") {
    if (config.incidentWebhook) {
      await fetch(config.incidentWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch((err) => console.error("[signals] Incident webhook failed:", err));
    }
    // Always alert Discord ops for P0/P1
    if (config.discordOpsChannel && (signal.severity === "P0" || signal.severity === "P1")) {
      await fetch(config.discordOpsChannel, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🚨 **${signal.signal}** — Severity: **${signal.severity}**\n\`${signal.network_id}\`\n${JSON.stringify(signal, null, 2).slice(0, 1000)}`,
        }),
      }).catch(() => {});
    }
  }

  if (signal.signal === "DEPIN_NODE_HEALTH" || signal.signal === "DEPIN_COVERAGE_DRIFT") {
    if (config.observabilityWebhook) {
      await fetch(config.observabilityWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch((err) => console.error("[signals] Observability webhook failed:", err));
    }
  }

  if (signal.signal === "DEPIN_TGE_READY") {
    // Log to console — manual handoff to Token Launch skill
    console.log("[signals] TGE READINESS GATE PASSED:");
    console.log(payload);
    // Send to Discord for founder review
    if (config.discordOpsChannel) {
      await fetch(config.discordOpsChannel, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🚀 **TGE READINESS GATE** — Score: **${(signal as TGEReadinessSignal).readiness_score}/100**\nLoad \`solana-token-launch-skill\` to proceed.\n${payload.slice(0, 800)}`,
        }),
      }).catch(() => {});
    }
  }
}
```
