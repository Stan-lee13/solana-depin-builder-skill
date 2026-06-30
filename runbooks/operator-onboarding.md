# Operator Onboarding — First Node Setup

**Severity if blocked:** P2 (individual) · P1 (>5 operators failing in 24h)
**Owner:** Operator success lead
**Load when:** Operator reports inability to complete first node registration, or support team proactively guiding a new operator.

---

## Overview

This runbook walks a real operator through setting up their first DePIN node from scratch — from zero to first proof submission. It is the step-by-step guide the `agents/operator-ux-engineer.md` persona uses when working directly with operators.

**Time to first proof:** 30–60 minutes for a prepared operator
**Prerequisites:** Hardware device, Solana wallet (Phantom/Ledger), ~0.2 SOL for stake + rent

---

## Step 1 — Wallet Setup

### Option A: Phantom (recommended for <$10K stake)

```
1. Install Phantom from https://phantom.app (verify URL — phishing sites exist)
2. Create new wallet → save seed phrase offline (paper, not photo/cloud)
3. Switch to Solana Mainnet (Settings → Developer Settings → Mainnet)
4. Fund with ≥0.2 SOL (cover stake + ~0.01 SOL rent + tx fees)
```

### Option B: Ledger (required for >$10K stake)

```
1. Ledger device must be on latest firmware — check Ledger Live
2. Install Solana app in Ledger Live → Apps → Solana
3. Connect to Phantom: Phantom → Add / Connect Wallet → Hardware Wallet → Ledger
4. Enable blind signing for complex transactions:
   Ledger → Solana app → Settings → Blind Signing → Enable
   (Required for multi-instruction registration transactions)
```

### Wallet security check before proceeding

```bash
# Share ONLY your PUBLIC key with the protocol — never your seed phrase or private key
# Verify you are on the correct domain before connecting wallet:
# ✅ https://app.yourprotocol.io
# ❌ https://app-yourprotocol.io  ← common phishing variant
# ❌ https://yourprotocol.app     ← verify this matches official docs

# Check your SOL balance before starting:
solana balance <YOUR_WALLET_PUBKEY> --url mainnet-beta
```

---

## Step 2 — Device Setup

### Verify firmware version

```bash
# For ESP32-based devices:
# Connect device via USB, open serial monitor at 115200 baud
# Device should print firmware version on boot:
# [BOOT] DePIN firmware v1.x.x | Device pubkey: <PUBKEY>

# For Raspberry Pi-based devices:
ssh pi@<DEVICE_IP>
cat /etc/depin-firmware/version
# Expected: v1.x.x or higher

# For plug-and-play consumer devices:
# Check LED pattern: 3 slow blinks = waiting to register
# Solid red = hardware fault — contact support
```

### Extract device public key

```bash
# The device has a unique Ed25519 keypair generated at manufacturing / first boot
# This is NOT your wallet — it is the device's hardware identity

# ESP32 (via serial):
# Device prints: [IDENTITY] Device pubkey: <BASE58_PUBKEY>

# Raspberry Pi:
cat /etc/depin-firmware/device-pubkey.txt
# Output: <32-byte base58 pubkey>

# CLI tool (if your protocol provides one):
depin-cli device info --port /dev/ttyUSB0
# Output:
# Device pubkey: <PUBKEY>
# Firmware:      v1.x.x
# Status:        READY_TO_REGISTER
```

### Place device at correct location

```bash
# For geographic protocols (connectivity, mapping, sensor):
# 1. Install at intended permanent location BEFORE registering
# 2. H3 cell is locked at registration — moving device breaks proof submission
# 3. Outdoor connectivity devices: mount with clear sky view, avoid RF interference

# Verify GPS lock (for GPS-attesting devices):
depin-cli device gps-check --port /dev/ttyUSB0
# Expected: GPS_LOCKED | lat=X.XXXX, lon=Y.YYYY | accuracy=<5m
# If GPS_SEARCHING after 10 min → move device outdoors / away from metal enclosures
```

---

## Step 3 — Node Registration

### Pre-registration checklist

```
Before submitting the registration transaction:
[ ] Wallet connected to correct network (Mainnet)
[ ] SOL balance ≥ 0.2 SOL in wallet
[ ] Device is online and reporting (LED: 2 slow blinks = connected)
[ ] Device pubkey noted from Step 2
[ ] You are on the OFFICIAL app URL (bookmark it — do not search each time)
```

### Registration transaction — what you are approving

When you click Register Node, your wallet will ask you to approve a transaction.
**Before signing, verify every field:**

```
✅ Program ID:     <YOUR_PROTOCOL_PROGRAM_ID>  ← must match docs exactly
✅ Instruction:    register_node
✅ Stake amount:   <X> SOL  ← matches the minimum stake in the docs
✅ Device pubkey:  <MATCHES device pubkey from Step 2>
✅ No unexpected SetAuthority or TokenApprove instructions  ← RED FLAG if present
```

```bash
# If using CLI instead of UI:
depin-cli node register \
  --device-pubkey <DEVICE_PUBKEY> \
  --node-type <TYPE> \            # connectivity / sensor / storage / etc.
  --stake-sol 0.1 \
  --wallet ~/.config/solana/keypair.json \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY

# Expected output:
# ✅ Node registered: <NODE_ACCOUNT_PDA>
# Transaction: https://solscan.io/tx/<TXHASH>
# Stake vault: <STAKE_VAULT_PDA>
```

### Common registration failures and fixes

```
ERROR: "0x1 InsufficientFunds"
→ Add more SOL. Need: stake_min + ~0.01 SOL rent + ~0.001 SOL fee
→ Check: solana balance <WALLET> --url mainnet-beta

ERROR: "0x2 AccountAlreadyInitialized"
→ This wallet already has a registered node
→ Either manage the existing node, or close it first (runbooks/rogue-node-detected.md)
→ One node per operator wallet is a common protocol constraint

ERROR: "Transaction simulation failed: Error processing Instruction 0"
→ Usually means program ID is wrong or network is paused
→ Verify program ID against official docs
→ Check Discord #announcements for protocol status

ERROR: "Blockhash not found" (Ledger users)
→ Ledger review took >30s — blockhash expired
→ Click "Approve" on Ledger within 20 seconds of it appearing on screen

ERROR: Transaction confirms on-chain but node doesn't appear in dashboard
→ Wait 1–2 minutes (UI polling delay)
→ Search your wallet address directly: https://solscan.io/account/<WALLET>
→ Look for the NodeAccount PDA in the token accounts list
```

---

## Step 4 — Verify Registration

```bash
# Confirm node account exists on-chain
solana account <NODE_ACCOUNT_PDA> --url mainnet-beta --output json
# Expected: non-empty account with owner = <PROGRAM_ID>

# Via Solscan:
# https://solscan.io/account/<NODE_ACCOUNT_PDA>
# Look for: Owner = <PROGRAM_ID>, Data = ~200 bytes

# Via protocol CLI:
depin-cli node status --wallet <YOUR_WALLET>
# Expected output:
# Node PDA:      <PDA>
# Status:        ACTIVE
# Stake:         0.1 SOL
# Device pubkey: <MATCHES>
# Next epoch:    starts in Xh Xm
```

---

## Step 5 — First Proof Submission

```bash
# The device should begin submitting proofs automatically after registration
# It detects the on-chain NodeAccount and starts the proof loop

# Monitor device logs for first proof:
# ESP32 serial:
# [PROOF] Epoch 1 | score=85 | tx=<TXHASH> | status=CONFIRMED

# Raspberry Pi:
journalctl -u depin-node -f
# Expected:
# INFO  depin_node: Submitting proof for epoch 1
# INFO  depin_node: Proof confirmed: <TXHASH>
# INFO  depin_node: Epoch score: 85

# If no proof within 30 minutes:
depin-cli node troubleshoot --wallet <YOUR_WALLET>
# This runs the diagnostic from runbooks/operator-onboarding.md Step 3
```

### Verify first proof on-chain

```bash
# Check that epoch_score > 0 on your NodeAccount
solana account <NODE_ACCOUNT_PDA> --output json | python3 -c "
import sys,json; d=json.load(sys.stdin)
# Offset depends on your account layout — this is illustrative
print('Account data length:', len(d.get('account',{}).get('data',[''])[0]))
"

# Or via protocol explorer:
# https://explorer.yourprotocol.io/nodes/<NODE_ACCOUNT_PDA>
```

---

## Step 6 — First Epoch Reward

```
Rewards are distributed at the END of each epoch by the reward crank.
Standard epoch length: 24 hours.

After first full epoch with ≥1 proof:
- Token rewards appear in your wallet
- Dashboard shows: Win Rate, Epoch Score, Estimated Next Reward
- If no reward after 25 hours:
  → Check: was proof submitted BEFORE the epoch snapshot?
  → Check: did proof meet minimum score threshold?
  → Ask in #support with your NodeAccount PDA
```

---

## Operator Dashboard Quickstart

```
1. Connect wallet at https://app.yourprotocol.io/dashboard
2. Key metrics to track daily:
   - Uptime %: target ≥95% (below 80% risks slashing)
   - Epoch score: higher = more reward
   - Proof submissions: should match expected frequency
   - Total earned: cumulative token rewards

3. Alerts to configure (in dashboard settings):
   - Node offline >1 hour: enable email/Telegram alert
   - Epoch score below threshold: enable warning
   - Stake balance low: enable (if protocol has dynamic stake)

4. ROI tracking:
   - Breakeven calculator: https://app.yourprotocol.io/roi
   - Input: hardware cost, electricity (kWh/day × local rate), stake amount
   - Target: breakeven ≤18 months at current token price
```

---

## Troubleshooting Quick Reference

```
SYMPTOM                          LIKELY CAUSE              FIX
Device not connecting            Wrong WiFi / firewall      Check port 8899 outbound open
GPS not locking                  Indoor placement           Move outdoors / near window
Registration fails               Low SOL balance            Add ≥0.2 SOL
Proof not submitting             Device clock drift         sudo ntpdate -u pool.ntp.org
Proof rejected by oracle         Firmware outdated          OTA update (auto or manual)
No reward after epoch            Score below threshold      Improve placement / uptime
Dashboard shows offline          UI cache                   Hard refresh (Ctrl+Shift+R)
Ledger won't sign                Blind signing off          Enable in Ledger Solana app settings
```

---

## Getting Help

```
Discord: #node-operators (fastest — team monitors 24/7)
Email:   support@yourprotocol.io (24h response SLA)
Docs:    https://docs.yourprotocol.io/operators
CLI:     depin-cli --help

When asking for help, always include:
1. Your NodeAccount PDA (NOT your private key)
2. The exact error message
3. Which step failed
4. Device type and firmware version
```

---

## Cross-Skill Links

- Wallet security for operators: `skill/depin-wallet-security.md` → Operator Checklist
- Node offline during incident: `skill/incident-response-integration.md`
- Economics / ROI: `commands/node-economics.md`
- Dashboard UX design: `agents/operator-ux-engineer.md`
