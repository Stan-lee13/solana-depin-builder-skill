# Oracle Feed Failure — Incident Response Runbook

> **Configuration required before use:** Replace all `<PLACEHOLDER>` values with your
> protocol-specific values. These are marked inline with comments explaining where to find each value.

**Severity:** P1 (escalates to P0 if oracle is down > 2 hours)
**Time to mitigate (target):** < 30 minutes
**Who runs this:** On-call engineer (primary), Protocol Lead (escalation)

---

## Trigger conditions

Run this runbook when any of the following occur:

- Oracle heartbeat missing for > 15 minutes
- On-chain proof submissions drop by > 50% in 15 minutes
- `OracleFeedStale` errors appearing in program logs
- Monitoring alert: `oracle_feed_age_seconds > 900`
- Switchboard queue showing 0 active oracles

---

## Step 1 — Diagnose (5 min)

### 1a. Check on-chain oracle state

```bash
# Check when the oracle last updated the feed
solana account <ORACLE_FEED_PUBKEY> --url <RPC_URL>
# Look for: last_updated_slot — compare to current slot

# Check current slot
solana slot --url <RPC_URL>
# If (current_slot - last_updated_slot) > 900: oracle is stale
```

### 1b. Check oracle service health

```bash
# If using Switchboard v3
curl -s https://api.switchboard.xyz/v2/oracle/<ORACLE_PUBKEY>/health | jq .

# If using custom oracle — SSH into oracle server
ssh <ORACLE_SERVER_USER>@<ORACLE_SERVER_IP>
systemctl status depin-oracle
journalctl -u depin-oracle -n 100 --no-pager
```

### 1c. Identify failure class

| Symptom | Failure Class | Next step |
|---|---|---|
| Oracle process crashed / stopped | **Service failure** | Step 2a |
| Oracle running but not submitting | **RPC failure** | Step 2b |
| Oracle submitting but feed not updating | **Program rejection** | Step 2c |
| Oracle signing key rejected | **Key compromise** | → Run `runbooks/oracle-key-compromise.md` |
| All oracles failing simultaneously | **Network issue / attack** | Step 2d |

---

## Step 2 — Mitigate

### Step 2a — Service failure: restart oracle

```bash
# On oracle server
systemctl restart depin-oracle
sleep 10
systemctl status depin-oracle

# Verify recovery — check feed age drops below 300s
watch -n 5 'solana account <ORACLE_FEED_PUBKEY> --url <RPC_URL> | grep last_updated'
```

### Step 2b — RPC failure: switch to backup RPC

```bash
# In oracle config file (path: <ORACLE_CONFIG_PATH>)
# Change: rpc_url = "<PRIMARY_RPC>"
# To:     rpc_url = "<BACKUP_RPC_URL>"

systemctl restart depin-oracle

# Test backup RPC connectivity
curl -s -X POST <BACKUP_RPC_URL>   -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}' | jq .result
```

### Step 2c — Program rejection: check oracle authority

```bash
# Oracle may be submitting with wrong keypair or to wrong feed
# Verify oracle keypair matches what is registered on-chain:
solana-keygen pubkey <ORACLE_KEYPAIR_PATH>
# Compare output to: <EXPECTED_ORACLE_PUBKEY>

# If mismatch: update oracle config to use correct keypair
# Do NOT generate a new keypair — use the registered one from KMS/Vault
# KMS path: <KMS_KEY_PATH>
```

### Step 2d — Multi-oracle failure: pause program

```bash
# If all oracles are failing and you cannot restore within 30 min,
# pause the program to prevent stale-data reward exploits:

# This requires Squads multisig approval
# 1. Open Squads: https://v3.squads.so/
# 2. Create transaction: call set_paused(true) on <PROGRAM_ID>
# 3. Collect 3-of-5 signatures
# 4. Execute

# Post-pause: no new proofs accepted — nodes cannot earn but also cannot exploit stale oracle
```

---

## Step 3 — Verify recovery (5 min)

```bash
# Confirm oracle is submitting fresh data
CURRENT_SLOT=$(solana slot --url <RPC_URL>)
LAST_UPDATE=$(solana account <ORACLE_FEED_PUBKEY> --url <RPC_URL> | grep last_updated_slot | awk '{print $2}')
AGE=$((CURRENT_SLOT - LAST_UPDATE))
echo "Oracle feed age: ${AGE} slots (target < 300)"

# Confirm proof submissions resuming
# Check your monitoring dashboard: proof_submissions_per_15min should return to baseline
```

---

## Step 4 — Unpause (if paused in Step 2d)

```bash
# Via Squads multisig (same process as pause)
# Call set_paused(false) on <PROGRAM_ID>
# Collect 3-of-5 signatures → execute
```

---

## Step 5 — Post-incident

- [ ] Write incident summary: when it started, root cause, how long oracle was down
- [ ] Check if any nodes submitted fraudulent proofs during the window (query: proofs with `oracle_slot` during outage)
- [ ] If fraudulent proofs found: run `runbooks/rogue-node-detected.md`
- [ ] Add monitoring: alert if `oracle_feed_age_seconds > 600` (lower threshold)
- [ ] Document in incident log: `<INCIDENT_LOG_PATH>`

---

## Escalation

| Condition | Action |
|---|---|
| Oracle down > 30 min | Page Protocol Lead |
| Oracle down > 2 hours | Pause program, page all team members |
| Oracle key compromised | → `runbooks/oracle-key-compromise.md` immediately |
| Evidence of exploit during outage | → `skill/incident-response-integration.md` |
