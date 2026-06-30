# Anchor Development Rules for DePIN

These rules apply whenever writing or reviewing Anchor programs for DePIN protocols.

## Account Validation (Non-Negotiable)

```rust
// ALWAYS use typed accounts — never raw AccountInfo for value-holding accounts
// ❌ pub vault: AccountInfo<'info>
// ✅ pub vault: Account<'info, TokenAccount>

// ALWAYS constrain program IDs on CPI targets
#[account(
    constraint = jupiter_program.key() == JUPITER_V6_PROGRAM_ID
        @ DePINError::InvalidExternalProgram
)]
/// CHECK: Address constraint above validates identity
pub jupiter_program: UncheckedAccount<'info>,

// ALWAYS add has_one or explicit constraint for owner relationships
#[account(
    mut,
    has_one = operator @ DePINError::UnauthorizedOperator,
    seeds = [b"device", device_id.as_ref()],
    bump = device.bump,
)]
pub device: Account<'info, DeviceAccount>,
```

## Arithmetic Safety

```rust
// NEVER use raw arithmetic on u64 — always checked_* or use u128 intermediate
// ❌ let reward = user_stake / total_stake * reward_pool;
// ✅
let reward = (user_stake as u128)
    .checked_mul(reward_pool as u128)
    .ok_or(DePINError::Overflow)?
    .checked_div(total_stake as u128)
    .ok_or(DePINError::DivisionByZero)? as u64;
```

## Compute Unit Budget

```rust
// Request exact CU budget — never leave it at default 200K
use solana_program::compute_budget::ComputeBudgetInstruction;

// Measure first with Mollusk, then set budget = measured + 10% headroom
// Typical DePIN instruction CU costs:
//   Simple state update:     5,000–15,000 CU
//   Token transfer:         15,000–25,000 CU
//   Merkle proof verify:    50,000–100,000 CU
//   ZK proof verify:       200,000–500,000 CU
```

## Error Codes

```rust
// ALWAYS define a complete error enum — no generic errors in production
#[error_code]
pub enum DePINError {
    #[msg("Device is not registered")]              NotRegistered,
    #[msg("Device stake below minimum")]            InsufficientStake,
    #[msg("Challenge has expired")]                 ChallengeExpired,
    #[msg("Heartbeat submitted too early")]         HeartbeatTooEarly,
    #[msg("Proof of location invalid")]             InvalidLocationProof,
    #[msg("Reward epoch not finalized")]            EpochNotFinalized,
    #[msg("Geographic cell is at capacity")]        CellAtCapacity,
    #[msg("Arithmetic overflow")]                   Overflow,
    #[msg("Division by zero")]                      DivisionByZero,
    #[msg("Invalid external program")]              InvalidExternalProgram,
    #[msg("Unauthorized operator")]                 UnauthorizedOperator,
}
```

## Two-Strike Rule for Tests

- If a test fails **twice** for the same reason → **STOP**. Do not guess. Ask the user.
- Use **LiteSVM** for unit tests (fast, in-process)
- Use **Mollusk** for CU profiling (measures exact compute units)
- Never deploy to mainnet with failing tests

## Upgrade Authority

- Upgrade authority MUST be transferred to Squads v4 multisig before mainnet
- Never use a hot wallet as upgrade authority on mainnet
- Test emergency pause on devnet before every mainnet deployment
