# Runbook: Rogue Node / Sybil Cluster Detected

## Severity

P0 if cluster ≥5 nodes, active drain, or treasury drain suspected.
P1 if cluster 2-4 nodes, or drain unconfirmed.
P2 for single isolated node.

## Symptoms

- Anti-Sybil detector fires `LOCATION_CLUSTER` or `TIMING_CORRELATION`
- Proof acceptance rate from a single operator spikes >3× normal
- Geographic cluster: >50 nodes from same operator in one H3 res-8 hex
- Proof submissions arriving within 100ms of each other from same operator
- Reward claiming rate for one operator wallet exceeds 5% of total epoch rewards

## First 5 Minutes

1. Classify: isolated node (P2) or cluster (P0/P1)?
2. Run: `scripts/detect-sybil.ts --operator <WALLET>` to gather evidence
3. For P0: call `emergency_pause()` on reward program via Squads multisig
4. For P2: call `jailNode()` for the specific node address
5. Emit `DEPIN_ROGUE_NODE` signal to Incident Response skill

## Evidence Collection

```bash
# Identify all nodes from the same operator
solana account <OPERATOR_WALLET> --url mainnet-beta

# Get all proof submissions from operator in last 24 hours
# (from your indexer or Helius webhooks)
curl https://api.helius.xyz/v0/addresses/<OPERATOR_WALLET>/transactions?api-key=KEY

# Get H3 distribution of claimed locations
# Run detect-sybil.ts with --export-h3 flag
```

## Slash Procedure

```
P2 — Single node:
  1. Squads multisig → sign jailNode(nodeAddress, JailReason::FakeProof)
  2. Slash amount: 50% of stake (configurable per protocol)
  3. Slashed amount → protocol penalty vault (not burned — used for victim compensation)

P0/P1 — Cluster:
  1. Pause rewards immediately
  2. Jail all nodes in cluster
  3. Full stake slash (100%) for confirmed Sybil
  4. Governance proposal to blacklist operator address from re-registration
```

## Resolution Criteria

- All rogue nodes jailed and slashed
- No further anomalous proof submissions from operator
- Reward distribution resumed
- Post-incident: add detection rule for the specific Sybil pattern used
- Load `solana-incident-response-skill/commands/post-mortem-template.md`
