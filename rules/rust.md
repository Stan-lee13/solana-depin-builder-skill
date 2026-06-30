# Rust Rules for DePIN Programs

## Formatting and Linting

```bash
# Run before every commit
cargo fmt --all
cargo clippy --all-targets -- -D warnings

# Clippy lints relevant to Solana DePIN:
# - clippy::integer_arithmetic  (flag unchecked math)
# - clippy::cast_possible_truncation (flag u128 -> u64 casts)
# - clippy::unwrap_used (flag .unwrap() — use ? or ok_or())
```

## Memory and Ownership

```rust
// Prefer stack allocation for fixed-size data in programs
// Use [u8; N] not Vec<u8> for fixed-size buffers (avoids heap allocation)
pub struct DeviceAccount {
    pub device_id:     [u8; 32],   // ✅ fixed-size, stack allocated
    pub location_hash: [u8; 32],   // ✅
    pub owner:         Pubkey,
    // pub tags: Vec<String>,       // ❌ avoid in on-chain accounts (heap)
}

// InitSpace macro — always derive to auto-calculate account size
#[account]
#[derive(InitSpace)]
pub struct DeviceAccount {
    pub device_id:     [u8; 32],
    pub owner:         Pubkey,
    pub registered_at: i64,
    pub bump:          u8,
}
```

## No Panics in Production Programs

```rust
// NEVER .unwrap() or .expect() in on-chain code — use Result propagation
// ❌ let val = some_option.unwrap();
// ✅ let val = some_option.ok_or(DePINError::MissingValue)?;

// NEVER index arrays without bounds check
// ❌ let byte = data[offset];
// ✅ let byte = data.get(offset).ok_or(DePINError::BufferOverflow)?;
```

## Borsh Serialization

```rust
// All on-chain data must derive AnchorSerialize + AnchorDeserialize (or BorshSerialize + BorshDeserialize)
// Use try_to_vec() — never to_vec() (panics on failure)
let bytes = payload.try_to_vec().map_err(|_| DePINError::SerializationError)?;

// For cross-program data, always specify exact byte layouts with comments
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ProofPayload {
    pub device_id:    [u8; 32],  // bytes 0–31
    pub timestamp:    i64,       // bytes 32–39 (little-endian)
    pub location:     [u8; 32],  // bytes 40–71 (H3 cell + GPS hash)
    pub signature:    [u8; 64],  // bytes 72–135 (SE ECDSA signature)
}
```
