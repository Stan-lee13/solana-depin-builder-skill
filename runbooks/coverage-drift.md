# Runbook: Coverage Drift / Network Collapse

## Severity

P1 if ≥20% of nodes go offline within 1 hour.
P2 if coverage in a specific region drops below SLO (e.g., <50% of target hexes covered).

## Symptoms

- `DEPIN_COVERAGE_DRIFT` signal fires with `HEXAGON_VACANCY` or `UPTIME_SLO_BREACH`
- Node count dashboard shows declining active nodes over multiple epochs
- Coverage map shows geographic holes in previously covered regions
- Operator Discord reports hardware failure, power outage, ISP issue
- Token price decline → operators no longer profitable → voluntary exit

## First 5 Minutes

1. Classify: is this hardware/outage (temporary) or economic (permanent)?
   - Hardware/outage: affected nodes show `offline` status, others unchanged
   - Economic: nodes actively de-registering, not just going offline
2. Check: operator communication channels (Discord, Telegram) for self-reporting
3. Check: correlation with recent token price move or reward change

## Response by Type

```
HARDWARE/OUTAGE (P1 — temporary):
  1. No reward changes needed — operators will return when hardware recovers
  2. Alert status page: "Coverage reduced in [region]. Expected recovery: [time]"
  3. Monitor: if outage > 48 hours, activate coverage recovery bonus for region
  4. Document: add to coverage SLA monitoring

ECONOMIC EXIT (P1 — operators leaving):
  1. URGENT: run /node-economics for affected region
     → Is the hardware cost breakeven still achievable at current token price?
  2. If NOT profitable: governance proposal required immediately
     Options: (a) increase regional reward multiplier, (b) decrease hardware requirements,
              (c) subsidize hardware cost for underserved regions
  3. Activate coverage bonus: 2-5× rewards for filling vacated hexes
  4. Communicate to remaining operators: "Coverage bonus active in [region]"
```

## Coverage Recovery Activation

```typescript
// Governance proposal: activate coverage bonus for vacated hexes
const vacatedHexes = detectCoverageCollapse(current, previous, { collapse_threshold_pct: 20 });

// Proposal: increase reward multiplier in vacated hexes for 30 days
const proposal = {
  action: "ACTIVATE_COVERAGE_BONUS",
  hexes: vacatedHexes.vacated_hexes,
  multiplier: 3,         // 3× base reward
  duration_epochs: 30,   // 30 days
  funded_from: "ecosystem_grants_allocation",
};
```

## Resolution Criteria

- Coverage returns to >90% of SLO target for 7 consecutive days
- Root cause documented: hardware, economic, or external event
- Post-incident: update coverage SLO monitoring thresholds if gap was discovered
