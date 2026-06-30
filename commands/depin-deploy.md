# /depin-deploy — Deployment Checklist

Generates a comprehensive deployment checklist for launching a DePIN network on Solana.

## Usage

```
/depin-deploy [environment]
```

## Environments

- `devnet` — free SOL, no real value, frequent resets
- `testnet` — simulated mainnet conditions, stable
- `mainnet` — real SOL at stake, permanent state, security-critical

---

## Phase 0 — Wallet Security Gates (HARD BLOCKERS — nothing deploys without these)

These come from `skill/depin-wallet-security.md`. Every item is a hard gate.
**Do not proceed to Phase 1 if any of these are incomplete.**

### Authority Architecture

- [ ] Network config authority is a **Squads v4 multisig** — never a single keypair
  ```bash
  # Create Squads multisig (3-of-5 recommended for mainnet)
  squads-cli multisig create \
    --threshold 3 \
    --members <KEY1>,<KEY2>,<KEY3>,<KEY4>,<KEY5> \
    --name "DePIN Network Authority"
  # Save the multisig PDA — this becomes your program upgrade authority
  ```
- [ ] Upgrade authority transferred to Squads multisig before mainnet deploy
  ```bash
  solana program set-upgrade-authority <PROGRAM_ID> \
    --new-upgrade-authority <SQUADS_MULTISIG_PDA> \
    --keypair ~/.config/solana/deploy-keypair.json
  ```
- [ ] Mint authority (if applicable) set to Squads multisig
- [ ] Treasury keypair is Squads multisig — not a hot wallet

### Crank / Oracle Key Security

- [ ] **Crank keypair is in AWS KMS / GCP KMS / HashiCorp Vault** — not in `.env`
  ```bash
  # Create KMS key for crank
  aws kms create-key \
    --key-spec ECC_NIST_P256 \
    --key-usage SIGN_VERIFY \
    --description "DePIN crank key - $(date +%Y-%m-%d)"
  # Export public key and register on-chain
  aws kms get-public-key --key-id <KEY_ID> \
    --query 'PublicKey' --output text | base64 -d | tail -c 32 | xxd -p
  ```
- [ ] Oracle keypair is in KMS (separate key from crank)
- [ ] Key rotation runbook documented (`runbooks/oracle-key-compromise.md` loaded)
- [ ] No keypairs in `.env` files, git history, or Slack — run gitleaks scan:
  ```bash
  gitleaks detect --source . --report-format json --report-path /tmp/secrets-scan.json
  cat /tmp/secrets-scan.json | python3 -c "import json,sys; r=json.load(sys.stdin); print(f'{len(r)} findings')"
  ```

### Session Key Setup (for high-frequency proof submission)

- [ ] Session keys scoped to `submit_proof` instruction only
- [ ] Session keys expire each epoch (not long-lived)
- [ ] Session key rotation automated in crank service

### Pre-Deploy Wallet Checklist Confirmation

```bash
# Run before ANY mainnet deployment — this command does not exist yet:
# implement it in your deploy scripts
echo "Authority multisig:" && solana account <SQUADS_PDA> | grep -i threshold
echo "Upgrade authority:" && solana program show <PROGRAM_ID> | grep -i authority
echo "Crank key in KMS:" && aws kms describe-key --key-id <KMS_KEY_ID> | jq .KeyMetadata.KeyState
echo "Gitleaks clean:" && gitleaks detect --source . --exit-code 1 && echo "✅ CLEAN"
```

---

## Phase 1 — Pre-Deployment

### Smart Contract

- [ ] Security audit completed (Ottersec / Neodyme / OShield for Solana-native)
- [ ] All critical/high audit findings resolved and re-audited
- [ ] Code review by 2+ engineers not on the original PR
- [ ] Emergency pause mechanism implemented AND tested on devnet
- [ ] All instructions simulate correctly with `anchor test`
- [ ] CU budget profiled with Mollusk — no instruction exceeds 400K CUs
  ```bash
  # Mollusk CU profiling
  cargo test -- --nocapture 2>&1 | grep "Compute units consumed"
  ```
- [ ] Program binary matches verified source (reproducible build)
  ```bash
  anchor build --verifiable
  anchor verify <PROGRAM_ID> --provider.cluster mainnet
  ```

### Infrastructure

- [ ] Helius dedicated RPC endpoint provisioned (not shared public endpoint)
- [ ] Backup RPC endpoint configured (QuickNode or Triton)
- [ ] Grafana + Prometheus deployed and scraping (see observability-skill)
- [ ] PagerDuty / OpsGenie alert routing configured
- [ ] On-call rotation set (minimum 2 people, 24/7 coverage)
- [ ] Loki log aggregation running
- [ ] Sentry error tracking wired to oracle service and crank

### Oracle / Crank

- [ ] Oracle service deployed and verified on devnet for ≥7 days
- [ ] Oracle KMS key registered on-chain (`update_oracle_authority` called)
- [ ] Proof submission latency <500ms p95 on devnet
- [ ] Crank failure alert configured (PagerDuty if crank misses >2 epochs)
- [ ] Failover crank service deployed in separate region/cloud
- [ ] Rate limits configured on RPC calls (prevents runaway CU spend)

### Documentation

- [ ] Operator quick-start guide published (`runbooks/operator-onboarding.md`)
- [ ] Hardware setup guide published per device type
- [ ] Public API documentation published
- [ ] All incident response runbooks loaded and reviewed by on-call team
- [ ] Security disclosure policy published (`SECURITY.md` in repo)

---

## Phase 2 — Deployment

### Smart Contract Deployment

```bash
# 1. Build verified binary
anchor build --verifiable

# 2. Deploy to mainnet
solana program deploy \
  --program-id <PROGRAM_KEYPAIR> \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY \
  target/deploy/your_program.so

# 3. Verify on Solscan
echo "Verify at: https://solscan.io/account/<PROGRAM_ID>"

# 4. Initialize NetworkConfig via Squads multisig (not direct)
# Create Squads transaction → team approves → executes initialize_network_config
squads-cli transaction create \
  --multisig <SQUADS_PDA> \
  --program <PROGRAM_ID> \
  --instruction initialize_network_config \
  --args "epoch_length=86400,min_stake=1000000,oracle_authority=<ORACLE_PUBKEY>"

# 5. Confirm pause is ACTIVE until operator onboarding begins
anchor invoke --instruction emergency_pause ...
```

- [ ] Program deployed and verified on Solscan
- [ ] `initialize_network_config` executed via Squads multisig
- [ ] Upgrade authority confirmed as Squads multisig (not deploy keypair)
- [ ] Emergency pause confirmed active
- [ ] First epoch NOT started until monitoring is confirmed operational

### Infrastructure Deployment

- [ ] Monitoring stack deployed — verify `solana_slot_height` metric flowing
- [ ] Alert thresholds set:
  - Slot lag >100: warning
  - Slot lag >500: critical (page on-call)
  - Crank missed epoch: critical
  - Oracle key signing from unexpected IP: critical
- [ ] Log aggregation confirmed — oracle logs visible in Loki
- [ ] Backup/restore tested with actual program state snapshot

---

## Phase 3 — Verification (Do Not Open to Operators Until Complete)

### Smart Contract Verification

```bash
# Run full instruction suite against mainnet with devnet-funded test wallet
anchor test --provider.cluster mainnet

# Verify emergency pause works
anchor invoke --instruction emergency_pause ...
anchor invoke --instruction submit_proof ... # should fail with ProgramPaused
anchor invoke --instruction emergency_unpause ...
anchor invoke --instruction submit_proof ... # should succeed

# Verify Squads multisig controls upgrade authority
solana program show <PROGRAM_ID> | grep "Upgrade authority"
# Must show Squads PDA, not deploy keypair
```

- [ ] All instructions tested against mainnet (test wallet, real fees)
- [ ] Emergency pause blocks proof submission ✓
- [ ] Emergency unpause restores proof submission ✓
- [ ] Squads multisig required for all config changes ✓
- [ ] First test epoch run with 3 internal nodes — rewards distributed correctly ✓

### Security Verification

- [ ] `gitleaks` scan clean — no secrets in history
- [ ] KMS key access logs reviewed — no unexpected reads
- [ ] Grafana security dashboard live — `solana_set_authority_instruction_total` baseline set
- [ ] Bug bounty program live (Immunefi recommended for Solana programs)

---

## Phase 4 — Operator Onboarding

- [ ] Emergency unpause executed (after Phase 3 complete)
- [ ] Operator quick-start guide linked from README
- [ ] Discord #node-operators channel opened with support staff present
- [ ] First 10 operators are internal/partner — validate onboarding flow before public launch
- [ ] `runbooks/operator-onboarding.md` reviewed by support team
- [ ] Early operator incentive multiplier active (genesis period rewards)
- [ ] Operator dashboard live (load `agents/operator-ux-engineer.md`)

---

## Phase 5 — Post-Deployment (Ongoing)

### Monitoring

- [ ] 24/7 on-call rotation confirmed
- [ ] Weekly Grafana review scheduled
- [ ] Monthly security review scheduled (KMS key audit, access log review)

### Key Rotation Schedule

- [ ] Oracle key rotation: every 90 days (automated via KMS rotation policy)
- [ ] Crank key rotation: every 180 days
- [ ] Squads member rotation: annual or on team change
- [ ] Document rotation schedule in `runbooks/oracle-key-compromise.md`

### Governance

- [ ] Squads governance configured for program upgrades
- [ ] Proposal process documented (minimum 48h voting window)
- [ ] Treasury management policy defined
- [ ] Emergency override procedure tested

---

## Mainnet Hard Requirements (Summary)

| Requirement | Tool | Gate |
|-------------|------|------|
| Network authority | Squads v4 (3-of-5 min) | Phase 0 — hard blocker |
| Crank / oracle keys | AWS KMS / GCP KMS | Phase 0 — hard blocker |
| No secrets in code | gitleaks | Phase 0 — hard blocker |
| Program audit | Ottersec / Neodyme | Phase 1 — hard blocker |
| Reproducible build | `anchor build --verifiable` | Phase 2 |
| Emergency pause | Anchor instruction | Phase 1 |
| Dedicated RPC | Helius dedicated | Phase 1 |
| Monitoring | Grafana + Prometheus | Phase 1 |
| Bug bounty | Immunefi | Phase 3 |

---

## Follow-up Commands

After deployment:
- `/depin-audit` — audit the live network
- Load `skill/incident-response-integration.md` — incident response ready
- Load `runbooks/operator-onboarding.md` — first operator setup guide
