# Oracle Key Compromise — Incident Response Runbook

> **Configuration required before use:** Replace all `<PLACEHOLDER>` values with your
> protocol-specific values. These are marked inline with comments explaining where to find each value.
> Bookmark this runbook — you will run it under pressure.
**Severity:** P0
**Response SLA:** Acknowledge in 5 min, key rotated in 30 min
**Owner:** Protocol security lead + DevOps

## Trigger Conditions

- Private key found in git history, Slack, or public pastebin
- Oracle service logs showing signing from unexpected IP/region
- Proof submissions arriving at unexpected frequency or from wrong sender
- AWS/GCP secret access logs show unauthorized read of oracle key secret
- `git-secrets` or `gitleaks` CI scan flagged a credential commit

---

## Immediate Actions (T+0 to T+15 min)

### Step 1 — Pause oracle submissions on-chain immediately

```bash
# Call emergency_pause on your Anchor program
# This prevents the compromised key from submitting any more proofs

anchor invoke \
  --program-id <YOUR_PROGRAM_ID> \     # Get from: anchor keys list — or view on Solscan
  --instruction-name emergency_pause \
  --accounts "network_config=<CONFIG_PDA>,pause_authority=<PAUSE_AUTHORITY_PUBKEY>" \
  --keypair ~/.config/solana/pause-authority.json \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY

# Confirm pause is active
solana account <CONFIG_PDA> --output json | jq '.data | @base64d' | \
  python3 -c "import sys,struct; d=sys.stdin.buffer.read(); print('paused:', bool(d[49]))"
```

### Step 2 — Determine scope — what did the compromised key sign?

```bash
# Get all transactions signed by the compromised oracle key in the last 7 days
ORACLE_PUBKEY="<COMPROMISED_ORACLE_PUBKEY>"

curl "https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\", \"id\": 1,
    \"method\": \"getSignaturesForAddress\",
    \"params\": [\"$ORACLE_PUBKEY\", {\"limit\": 1000, \"before\": null}]
  }" | jq -r '.result[] | [.signature, .slot, .blockTime] | @csv' > /tmp/oracle-tx-history.csv

wc -l /tmp/oracle-tx-history.csv
echo "First suspicious tx: $(head -5 /tmp/oracle-tx-history.csv)"

# Parse: look for transactions at unusual times (off-hours for your timezone)
python3 << 'PYEOF'
import csv, datetime
with open('/tmp/oracle-tx-history.csv') as f:
    rows = list(csv.reader(f))
suspicious = []
for sig, slot, ts in rows:
    if ts:
        dt = datetime.datetime.utcfromtimestamp(int(ts))
        hour = dt.hour
        if hour < 6 or hour > 22:  # off-hours UTC
            suspicious.append((sig, dt.isoformat()))
print(f"Off-hours transactions: {len(suspicious)}")
for s in suspicious[:10]:
    print(s)
PYEOF
```

### Step 3 — Revoke the compromised key from all systems

```bash
# If key is stored in AWS KMS — schedule immediate deletion (7-day minimum)
aws kms schedule-key-deletion \
  --key-id <COMPROMISED_KEY_ARN> \
  --pending-window-in-days 7

# If key is in environment variable — rotate the secret immediately
aws secretsmanager rotate-secret \
  --secret-id "depin-oracle-signing-key" \
  --rotation-lambda-arn <YOUR_ROTATION_LAMBDA_ARN>  # from AWS Lambda console or CDK output

# If key was in a .env file committed to git — invalidate immediately:
# 1. The key is permanently burned — treat all work signed with it as suspect
# 2. Rotate as below, then scrub git history (BFG Repo Cleaner)
bfg --delete-files .env --no-blob-protection
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

---

## Short-Term Actions (T+15 to T+60 min)

### Step 4 — Generate new oracle key in KMS

```bash
# Create new Ed25519 / ECDSA P-256 key in AWS KMS
NEW_KEY_ARN=$(aws kms create-key \
  --key-spec ECC_NIST_P256 \
  --key-usage SIGN_VERIFY \
  --description "DePIN oracle key - rotated $(date +%Y-%m-%d)" \
  --query 'KeyMetadata.Arn' --output text)
echo "New key ARN: $NEW_KEY_ARN"

# Tag for audit trail
aws kms create-alias \
  --alias-name "alias/depin-oracle-$(date +%Y%m%d)" \
  --target-key-id $NEW_KEY_ARN

# Export public key for on-chain registration
aws kms get-public-key --key-id $NEW_KEY_ARN \
  --query 'PublicKey' --output text | base64 -d | \
  python3 -c "import sys; data=sys.stdin.buffer.read(); print(data[-32:].hex())"
# Last 32 bytes = Ed25519 public key
```

### Step 5 — Register new oracle key on-chain

```typescript
// src/oracle/rotate-key.ts
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

async function rotateOracleKey(
  program: Program,
  networkAuthority: Keypair,
  newOraclePubkey: PublicKey
): Promise<string> {
  // Your Anchor program must implement an update_oracle_authority instruction
  const tx = await program.methods
    .updateOracleAuthority(newOraclePubkey)
    .accounts({
      networkConfig: networkConfigPDA,
      authority: networkAuthority.publicKey,
    })
    .signers([networkAuthority])
    .rpc();

  console.log("Oracle key rotated. Tx:", tx);
  return tx;
}

// IMPORTANT: networkAuthority must be the Squads multisig
// — get all required signers to approve this tx before submitting
```

### Step 6 — Audit all proofs submitted during compromise window

```bash
# For each suspicious tx from Step 2:
# Verify the proof data was legitimate (cross-check with device logs)

for TX in $(cat /tmp/oracle-tx-history.csv | grep "SUSPICIOUS_WINDOW" | cut -d',' -f1); do
  echo "Auditing $TX..."
  solana confirm -v $TX --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY
done

# If fraudulent proofs detected — calculate excess rewards distributed
# These may need to be clawed back via governance proposal
```

### Step 7 — Resume oracle service with new key + unpause program

```bash
# Deploy updated oracle service pointing to new KMS key
kubectl set env deployment/oracle-service ORACLE_KMS_KEY_ID=$NEW_KEY_ARN
kubectl rollout status deployment/oracle-service

# Verify new key is submitting successfully (wait 1 epoch)
# Then unpause:
anchor invoke \
  --program-id <YOUR_PROGRAM_ID> \     # Get from: anchor keys list — or view on Solscan
  --instruction-name emergency_unpause \
  --accounts "network_config=<CONFIG_PDA>,pause_authority=<PAUSE_AUTHORITY>" \
  --keypair ~/.config/solana/pause-authority.json
```

---

## CLI Quick-Reference Card

```bash
# PASTE INTO #incident-oracle-compromise

COMPROMISED KEY:  <ORACLE_PUBKEY>
DETECTED AT:      <DATETIME UTC>
PAUSED AT:        <TX_SIGNATURE>

# Check pause status:
solana account <CONFIG_PDA> --output json

# New KMS key ARN (after Step 4):
NEW_KEY_ARN=

# Rotation tx (after Step 5):
ROTATION_TX=

# Unpause tx (after Step 7):
UNPAUSE_TX=
```

---

## Recovery Indicators

- [ ] Program paused within 5 min of detection
- [ ] Compromised key revoked from all systems (KMS deletion scheduled)
- [ ] New key generated in KMS (never as raw bytes)
- [ ] New key registered on-chain via Squads multisig
- [ ] All suspicious-window proofs audited
- [ ] Excess rewards quantified; governance proposal to claw back if significant
- [ ] Oracle service redeployed with new key
- [ ] Program unpaused; epoch rewards resuming normally
- [ ] Post-mortem published within 48h; rotation cadence updated

## Cross-Skill Signals

Fire `WALLET_KEY_COMPROMISED` (P0, key_type: `"fee_payer"` or custom oracle key type).
Load `solana-incident-response-skill/skill/active-exploit-response.md` for parallel key audit.
