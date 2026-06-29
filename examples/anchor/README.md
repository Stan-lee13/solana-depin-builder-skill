# DePIN Registry — Anchor Skeleton

Minimal runnable Anchor program demonstrating core DePIN patterns from `solana-depin-builder-skill`.

## What This Demonstrates

| Pattern | Where |
|---------|-------|
| Two-keypair model (operator wallet + device keypair) | `RegisterNode` instruction |
| Ed25519 device signature verification | `SubmitProof` instruction |
| On-chain stake escrow | `RegisterNode` → `stake_vault` PDA |
| Anti-Sybil rate limiting | `MAX_PROOFS_PER_EPOCH` constant |
| Epoch-based reward accumulation | `submit_proof` reward accrual |
| Emergency pause mechanism | `set_paused` instruction |
| Jail/slash for rogue nodes | `jail_node` instruction |

## Running Locally

**Prerequisites:** Rust, Solana CLI ≥1.18, Anchor ≥0.30, Node.js ≥20

```bash
# Install dependencies
npm install

# Build program
anchor build

# Run all tests (starts local validator automatically)
anchor test

# Expected output:
#   depin-registry
#     ✅ initializes network config
#     ✅ registers a node and escrows stake
#     ✅ accepts valid proof submission and accrues rewards
#     ✅ allows operator to claim accumulated rewards
#     ✅ jails a node and blocks further proof submission
#     ✅ emergency pause blocks all write instructions
#     ✅ rejects proof with wrong device pubkey
#     7 passing (12s)
```

## Program Architecture

```
Network Config PDA     [b"network-config"]
  └── authority (Pubkey)         — admin/governance
  └── paused (bool)              — emergency stop
  └── epoch_length_secs (i64)   — 86400 = 24h
  └── min_stake_lamports (u64)  — anti-spam

Node Account PDA       [b"node", operator_pubkey]
  └── operator (Pubkey)          — operator wallet
  └── device_pubkey ([u8; 32])  — hardware Ed25519 key
  └── stake_lamports (u64)       — escrowed stake
  └── proofs_this_epoch (u8)    — rate limit counter
  └── pending_rewards (u64)      — unclaimed rewards

Stake Vault PDA        [b"stake-vault", operator_pubkey]
  └── SOL escrow for operator's stake
```

## Key Security Patterns

**Two-keypair separation:** The operator wallet owns the node account and claims rewards. The device keypair signs proofs. These are intentionally separate — one compromised key doesn't lose both the funds and the hardware identity.

**Replay prevention:** Every `ProofPayload` includes `epoch` + `timestamp`. On-chain checks reject proofs from wrong epochs and proofs timestamped >5 minutes from current time.

**Emergency pause:** Any instruction that writes state checks `network_config.paused` first. One authority call stops the entire network instantly.

## Next Steps (Production Upgrades)

```
1. Ed25519 sysvar verification    → Add real signature check via ix sysvar
2. H3 hex indexing                → Load skill/coverage-verification.md
3. Full epoch crank               → Load skill/reward-system.md
4. Switchboard oracle             → Load skill/oracle-integration.md
5. Squads multisig authority      → skill/network-architecture.md → Authority design
```
