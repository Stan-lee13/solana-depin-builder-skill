# Coverage Drift / Node Churn Spike — Runbook

> **Configuration required before use:** Replace all `<PLACEHOLDER>` values with your
> protocol-specific values.

**Severity:** P2 (P1 if > 20% of network offline)
**Time to mitigate (target):** 24–48 hours
**Who runs this:** Protocol Lead, Growth team

---

## Trigger conditions

- Node count drops > 10% in 24 hours
- Geographic coverage map shows new large uncovered areas
- Proof submission rate drops > 20% epoch-over-epoch
- Monitoring alert: `active_node_pct < 0.80`
- Operator churn rate > 5% per week

---

## Step 1 — Quantify the drift (15 min)

```bash
# Query your indexer for node status changes in the last 24h
SELECT
  DATE_TRUNC('hour', last_heartbeat) as hour,
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
  COUNT(*) as total
FROM node_accounts
WHERE last_heartbeat > NOW() - INTERVAL '48 hours'
GROUP BY hour
ORDER BY hour;

# Identify affected geographic regions
SELECT 
  h3_to_string(geo_h3_index) as hex,
  COUNT(*) as nodes_went_offline
FROM node_accounts
WHERE status = 'inactive'
  AND updated_at > NOW() - INTERVAL '24 hours'
GROUP BY geo_h3_index
ORDER BY nodes_went_offline DESC
LIMIT 20;
```

---

## Step 2 — Diagnose root cause

| Root cause | Signal | Response |
|---|---|---|
| **Reward rate too low** | Node ROI < breakeven, forum complaints | Step 3a |
| **Hardware failure** | Cluster of nodes in same region offline | Step 3b |
| **RPC provider outage** | All nodes using same RPC going offline | Step 3b |
| **Firmware bug** | Nodes on same firmware version failing | Step 3c |
| **Competitor launch** | Operators announcing migration | Step 3d |
| **Token price crash** | Rewards denominated in falling token | → `runbooks/token-price-crash.md` |

---

## Step 3 — Respond by root cause

### Step 3a — Reward rate: boost coverage incentives

```typescript
// Temporary: increase reward multiplier for affected H3 hexes
// Via governance proposal or admin action (if within admin parameters):

const underservedHexes = await getUnderservedHexes(targetCoverageThreshold);

for (const hex of underservedHexes) {
  await program.methods
    .setHexMultiplier(hex.h3Index, 2.5 /* 2.5× multiplier */)
    .accounts({ networkConfig, authority })
    .rpc();
}
// This is temporary — remove multiplier after coverage recovers
```

### Step 3b — Infrastructure: communicate + wait

```
1. Post status update to Discord/Twitter within 1 hour of detection
2. Identify affected RPC provider and contact their support
3. Document affected node count and estimated recovery time
4. If RPC issue: provide operators with backup RPC URL to update configs
```

### Step 3c — Firmware bug: coordinate rollback

```bash
# Push firmware rollback to affected node fleet
# This depends on your OTA update mechanism:
# Signal the update channel for affected nodes to rollback to <LAST_STABLE_VERSION>

# Communicate in operator Discord with exact steps:
# 1. Download firmware v<LAST_STABLE_VERSION> from: <FIRMWARE_DOWNLOAD_URL>
# 2. Flash using: <FLASH_COMMAND>
# 3. Restart device: <RESTART_COMMAND>
```

### Step 3d — Competition: retain operators

```
Short term:
- Reach out to top 20 operators personally via DM
- Offer coverage bonus for staying (requires governance approval)
- Highlight product roadmap differentiators

Medium term:
- Review tokenomics — are operators genuinely profitable?
- Run operator ROI analysis: skill/depin-tokenomics.md → Death Spiral section
- If ROI is negative: this is a Week-2 Death situation → escalate to Protocol Lead
```

---

## Step 4 — Monitor recovery

```bash
# Set up hourly checks while drift is active
watch -n 3600 '
  ACTIVE=$(psql <DB_URL> -t -c "SELECT COUNT(*) FROM node_accounts WHERE status = '"'"'active'"'"'")
  TOTAL=$(psql <DB_URL> -t -c "SELECT COUNT(*) FROM node_accounts")
  echo "Active nodes: $ACTIVE / $TOTAL ($(echo "$ACTIVE * 100 / $TOTAL" | bc)%)"
'
```

---

## Step 5 — Post-incident

- [ ] Root cause identified and documented
- [ ] Operator communication sent
- [ ] Coverage recovery timeline set and tracked
- [ ] Tokenomics reviewed if reward-rate was root cause
- [ ] Anti-churn alert thresholds reviewed
