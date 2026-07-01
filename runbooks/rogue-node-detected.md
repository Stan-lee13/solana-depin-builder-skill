# Rogue Node / Sybil Cluster Detected — Incident Response Runbook

> **Configuration required before use:** Replace all `<PLACEHOLDER>` values with your
> protocol-specific values. These are marked inline with comments explaining where to find each value.

**Severity:** P1 (escalates to P0 if > 5% of rewards are being siphoned)
**Time to mitigate (target):** < 1 hour
**Who runs this:** On-call engineer (detection + containment), Protocol Lead (jail/slash approval)

---

## Trigger conditions

- Monitoring alert: single operator controls > 10% of network nodes
- Multiple node accounts sharing the same device_pubkey
- Proof submissions from geographically impossible locations (GPS spoofing)
- Cluster of nodes with identical proof timing patterns (< 1s apart)
- Abnormally high reward concentration: 1 wallet claiming > X% of epoch rewards
- Duplicate proof submissions within same epoch from same device

---

## Step 1 — Confirm detection (10 min)

### 1a. Identify suspicious node cluster

```typescript
// scripts/sybil-detect.ts — run against your node registry
import { Connection, PublicKey } from "@solana/web3.js";

async function detectSybilCluster(
  connection: Connection,
  programId: PublicKey
): Promise<SybilReport> {
  // Fetch all NodeAccount PDAs
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: NodeAccount.SPACE + 8 }],
  });

  const byOperator = new Map<string, string[]>(); // operator → node pubkeys
  const byDevice = new Map<string, string[]>();   // device_pubkey → node pubkeys

  for (const { pubkey, account } of accounts) {
    const node = NodeAccount.decode(account.data);
    const op = node.operator.toBase58();
    const dev = Buffer.from(node.device_pubkey).toString("hex");

    // Group by operator
    byOperator.set(op, [...(byOperator.get(op) ?? []), pubkey.toBase58()]);
    // Group by device pubkey (same device_pubkey on multiple nodes = Sybil)
    byDevice.set(dev, [...(byDevice.get(dev) ?? []), pubkey.toBase58()]);
  }

  const sybilByDevice = [...byDevice.entries()].filter(([, nodes]) => nodes.length > 1);
  const concentratedOperators = [...byOperator.entries()].filter(([, nodes]) => nodes.length > 10);

  return { sybilByDevice, concentratedOperators, totalNodes: accounts.length };
}
```

### 1b. GPS spoof detection

```typescript
// For geographic DePIN networks — check if node GPS coordinates are valid
async function detectGPSSpoofing(
  nodeAccounts: NodeAccount[]
): Promise<string[]> {  // returns list of suspected spoofed node pubkeys
  const suspicious: string[] = [];

  for (const node of nodeAccounts) {
    const lat = node.gps_lat_e6 / 1e6;
    const lon = node.gps_lon_e6 / 1e6;

    // Flag if: in ocean, in restricted zone, or matches known VPN datacenter IP range
    if (isInOcean(lat, lon) || isInRestrictedZone(lat, lon)) {
      suspicious.push(node.operator.toBase58());
    }
  }

  return suspicious;
}
```

### 1c. Proof timing analysis

```bash
# Query recent proof submissions — look for sub-second clustering
# On your indexer/monitoring stack:
SELECT 
  DATE_TRUNC('second', submitted_at) as second_bucket,
  COUNT(*) as proofs,
  ARRAY_AGG(operator) as operators
FROM proofs
WHERE submitted_at > NOW() - INTERVAL '1 hour'
GROUP BY second_bucket
HAVING COUNT(*) > 50
ORDER BY proofs DESC;
# Legitimate nodes don't perfectly synchronize submissions within 1 second
```

---

## Step 2 — Assess scale of damage

```bash
# Calculate how much reward the Sybil cluster captured this epoch
# Replace <EPOCH_NUMBER> with current epoch

# Using your indexer / data warehouse:
SELECT 
  operator,
  COUNT(*) as node_count,
  SUM(rewards_claimed) as total_rewards,
  SUM(rewards_claimed) / SUM(SUM(rewards_claimed)) OVER () * 100 as pct_of_epoch
FROM rewards
WHERE epoch = <EPOCH_NUMBER>
GROUP BY operator
ORDER BY total_rewards DESC
LIMIT 20;
```

**Decision threshold:**
- < 1% epoch rewards: Monitor, do not jail yet — gather more evidence
- 1–5% epoch rewards: Jail suspected nodes, notify community
- > 5% epoch rewards: Pause rewards distribution, emergency multisig call

---

## Step 3 — Contain (requires Protocol Lead approval)

### 3a. Jail individual rogue nodes

```bash
# Via your admin CLI or Squads multisig
# For each confirmed rogue node pubkey:
# Call: jail_node(node_account_pubkey) on <PROGRAM_ID>

# Example via Anchor CLI (requires authority keypair or Squads execution):
anchor run jail-node -- --node <NODE_PUBKEY_1>
anchor run jail-node -- --node <NODE_PUBKEY_2>
# Jailed nodes cannot submit proofs but stake is not yet slashed
```

### 3b. Slash stake (irreversible — requires 3-of-5 Squads approval)

```bash
# Only after: (a) evidence confirmed, (b) Protocol Lead approval, 
# (c) community notification posted
# Via Squads multisig → call slash_node() on <PROGRAM_ID>
# Slashed stake goes to: <SLASH_RECIPIENT_ADDRESS>
# (Treasury or insurance fund — set in NetworkConfig)
```

### 3c. If attack is ongoing — pause reward distribution

```bash
# Via Squads 3-of-5 → set_paused(true) on <PROGRAM_ID>
# This stops all proof submissions and reward accrual
# Buy time to fully audit the damage before distributing any more rewards
```

---

## Step 4 — Root cause & hardening

- [ ] Identify which anti-Sybil mechanism failed (stake too low? GPS verification absent? No device attestation?)
- [ ] Determine if this is a known attack vector for your DePIN pattern
- [ ] Propose governance fix: raise min stake, add device attestation, tighten GPS validation
- [ ] Write post-mortem and share with community (transparency builds trust)

---

## Step 5 — Post-incident

- [ ] All jailed node pubkeys documented in incident log
- [ ] Total rewards recovered / burned documented
- [ ] Community post published within 24 hours
- [ ] Hardening proposal submitted to governance within 72 hours
- [ ] Anti-Sybil monitoring thresholds tightened

---

## Escalation

| Condition | Action |
|---|---|
| > 5% epoch rewards siphoned | Page Protocol Lead immediately |
| Evidence of key compromise | → `runbooks/oracle-key-compromise.md` |
| Governance attack alongside Sybil | → `runbooks/governance-attack.md` |
| Need broader incident response | → `skill/incident-response-integration.md` |
