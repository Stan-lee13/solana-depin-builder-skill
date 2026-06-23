# Node Registry & Device Identity

Every DePIN network's foundation is answering: **who is this device, can I trust it, and is it doing real work?**

## Device identity architecture

### The two-keypair model (production standard)

```
OPERATOR WALLET (hot/cold wallet)
  → Owns the node account on-chain
  → Pays rent, claims rewards
  → Can be a Ledger or Squads multisig for large operators

DEVICE KEYPAIR (embedded in hardware)
  → Ed25519 keypair burned into device firmware or HSM
  → Signs every proof submission
  → Cannot be extracted without destroying device (ideal)
  → Links physical hardware to on-chain identity
```

**Why two keypairs?** If you use the operator wallet to sign proofs, one compromised key loses both the hardware and the funds. Separating them limits blast radius.

### Device keypair generation (firmware level)

```rust
// In device firmware (Rust embedded)
use ed25519_dalek::{SigningKey, VerifyingKey};
use rand_core::OsRng;

// Generate during first boot, store in secure element / flash
let signing_key = SigningKey::generate(&mut OsRng);
let device_pubkey = VerifyingKey::from(&signing_key);

// Store signing_key in protected flash (never expose via any API)
// Export device_pubkey for registration
```

For consumer hardware without HSMs, use:
```typescript
// TypeScript: Generate device identity during device setup
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";

// Derive from hardware serial + secret seed (not perfect but practical)
const hardwareSerial = getHardwareSerial(); // from firmware
const secretSeed = process.env.DEVICE_SECRET_SEED!;

const deterministicSeed = crypto.createHmac("sha256", secretSeed)
  .update(hardwareSerial)
  .digest();

const deviceKeypair = Keypair.fromSeed(deterministicSeed.slice(0, 32));
// Store keypair.secretKey encrypted on device
// Expose only keypair.publicKey for registration
```

## Node registration (Anchor program)

### Account structure

```rust
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct NodeAccount {
    pub owner: Pubkey,              // Operator wallet (pays, claims rewards)
    pub device_pubkey: Pubkey,      // Hardware identity keypair
    pub node_type: u8,              // 0=connectivity, 1=compute, 2=sensor, 3=mapping, 4=bandwidth
    pub metadata_uri: String,       // Arweave/IPFS: hardware specs, firmware version, location
    pub stake_amount: u64,          // Locked stake in lamports or token base units
    pub stake_mint: Pubkey,         // SOL = native_mint, else protocol token mint
    pub status: u8,                 // 0=pending, 1=active, 2=inactive, 3=slashed
    pub tier: u8,                   // 0=basic, 1=standard, 2=premium (based on hardware)
    pub geo_h3_index: u64,          // H3 resolution-8 hex index (0 for non-geographic nodes)
    pub registered_at: i64,
    pub last_heartbeat: i64,
    pub current_epoch_score: u64,   // Accumulated work units this epoch
    pub lifetime_rewards: u64,      // All-time rewards earned
    pub consecutive_missed_epochs: u8, // Penalty tracker
    pub bump: u8,
}

impl NodeAccount {
    pub const LEN: usize = 8 + // discriminator
        32 + 32 + 1 + (4 + 200) + 8 + 32 + 1 + 1 + 8 +
        8 + 8 + 8 + 8 + 1 + 1;
}
```

### Registration instruction

```rust
#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = operator,
        space = NodeAccount::LEN,
        seeds = [b"node", operator.key().as_ref(), device_pubkey.as_ref()],
        bump
    )]
    pub node_account: Account<'info, NodeAccount>,

    #[account(mut)]
    pub operator: Signer<'info>,  // Must sign — proves wallet ownership

    /// CHECK: Validated by device_pubkey in instruction data
    pub device_pubkey: UncheckedAccount<'info>,

    // Stake vault — node's stake locked here until de-registration
    #[account(
        init,
        payer = operator,
        token::mint = stake_mint,
        token::authority = node_account,
        seeds = [b"stake_vault", node_account.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub stake_mint: Account<'info, Mint>,

    #[account(mut)]
    pub operator_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn register_node(
    ctx: Context<RegisterNode>,
    device_pubkey: Pubkey,
    node_type: u8,
    metadata_uri: String,
    geo_h3_index: u64,
    stake_amount: u64,
    // Device must sign a message proving it controls the device_pubkey
    device_signature: [u8; 64],
    registration_message: Vec<u8>,
) -> Result<()> {
    // 1. Verify device keypair signature (proves physical device is present)
    let device_key = device_pubkey.to_bytes();
    let verifying_key = ed25519_dalek::VerifyingKey::from_bytes(&device_key)
        .map_err(|_| ErrorCode::InvalidDeviceSignature)?;

    let signature = ed25519_dalek::Signature::from_bytes(&device_signature);
    verifying_key
        .verify_strict(&registration_message, &signature)
        .map_err(|_| ErrorCode::InvalidDeviceSignature)?;

    // 2. Verify stake meets minimum requirement
    let min_stake = ctx.accounts.epoch_config.min_stake_per_node_type[node_type as usize];
    require!(stake_amount >= min_stake, ErrorCode::InsufficientStake);

    // 3. Transfer stake to vault
    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from: ctx.accounts.operator_token_account.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
                authority: ctx.accounts.operator.to_account_info(),
            },
        ),
        stake_amount,
    )?;

    // 4. Initialize node account
    let node = &mut ctx.accounts.node_account;
    node.owner = ctx.accounts.operator.key();
    node.device_pubkey = device_pubkey;
    node.node_type = node_type;
    node.metadata_uri = metadata_uri;
    node.stake_amount = stake_amount;
    node.stake_mint = ctx.accounts.stake_mint.key();
    node.status = 0; // pending — requires first heartbeat to become active
    node.geo_h3_index = geo_h3_index;
    node.registered_at = Clock::get()?.unix_timestamp;
    node.last_heartbeat = 0;
    node.bump = ctx.bumps.node_account;

    emit!(NodeRegistered {
        node: node.key(),
        owner: node.owner,
        device_pubkey,
        node_type,
        geo_h3_index,
        stake_amount,
    });

    Ok(())
}
```

## Node metadata standard

Store rich metadata on Arweave for long-term permanence:

```typescript
interface NodeMetadata {
  // Hardware
  hardware_model: string;        // "Bobcat 300", "Custom RPi4", "io.net GPU Node"
  firmware_version: string;      // "1.2.4"
  hardware_tier: "basic" | "standard" | "premium";

  // Location (for geographic networks)
  geo_attestation: {
    h3_index: string;            // "8928308280fffff" (H3 format)
    lat: number;                  // Self-reported; verified by proof-of-coverage
    lng: number;
    altitude_m?: number;
    attestation_method: "gps" | "cell_tower" | "ip_geolocation";
    attestation_timestamp: number;
  };

  // Capabilities
  capabilities: {
    // Connectivity nodes
    antenna_gain_dbi?: number;
    frequency_bands?: string[];   // ["868MHz", "915MHz"]
    indoor_outdoor?: "indoor" | "outdoor";

    // Compute nodes
    gpu_model?: string;
    vram_gb?: number;
    cuda_cores?: number;
    tflops?: number;

    // Sensor nodes
    sensor_types?: string[];      // ["temperature", "humidity", "PM2.5"]
    accuracy_class?: string;
    sample_rate_hz?: number;

    // Bandwidth nodes
    max_bandwidth_mbps?: number;
    connection_type?: "fiber" | "cable" | "dsl" | "cellular";
  };

  // Contact
  operator_handle?: string;      // Twitter/Discord handle (optional)
  setup_date: string;             // ISO date
}
```

```typescript
// Upload to Arweave via Irys
import Irys from "@irys/sdk";

const irys = new Irys({
  url: "https://node1.irys.xyz",
  token: "solana",
  key: operatorPrivateKey,
});

const metadata: NodeMetadata = {
  hardware_model: "Bobcat 300",
  firmware_version: "2.1.0",
  hardware_tier: "standard",
  geo_attestation: {
    h3_index: h3.latLngToCell(lat, lng, 8),
    lat, lng,
    attestation_method: "gps",
    attestation_timestamp: Date.now(),
  },
  capabilities: {
    antenna_gain_dbi: 4,
    frequency_bands: ["915MHz"],
    indoor_outdoor: "outdoor",
  },
  setup_date: new Date().toISOString(),
};

const receipt = await irys.upload(JSON.stringify(metadata), {
  tags: [
    { name: "Content-Type", value: "application/json" },
    { name: "App-Name", value: "YourDePINProtocol" },
    { name: "Device-Pubkey", value: devicePubkey.toString() },
  ],
});

const metadataUri = `https://arweave.net/${receipt.id}`;
```

## Stake economics

### Minimum stake calculation

```
Minimum stake = Expected daily reward × Slash deterrence multiplier × Days at risk

Example:
  Expected daily reward: 10 tokens
  Slash deterrence: 30× (losing 30 days of rewards deters faking)
  Minimum stake = 10 × 30 = 300 tokens

For SOL-denominated stake:
  Use USD value equivalent at target price to maintain deterrence
  Adjust via DAO governance as token price changes
```

### Stake tiers (recommend 3 tiers minimum)

```
Tier 0 — Basic:    1× minimum stake → 1× reward multiplier
Tier 1 — Standard: 3× minimum stake → 1.3× reward multiplier  
Tier 2 — Premium:  10× minimum stake → 1.6× reward multiplier
```

Higher stake = higher rewards = larger operators are incentivized = better network quality.

## De-registration and stake recovery

```rust
pub fn deregister_node(ctx: Context<DeregisterNode>) -> Result<()> {
    let node = &ctx.accounts.node_account;

    // Must be inactive for at least 7 epochs before can withdraw stake
    // Prevents: register → earn rewards → deregister → repeat
    let current_epoch = get_current_epoch(&ctx.accounts.epoch_config)?;
    let last_active_epoch = node.last_active_epoch;
    require!(
        current_epoch >= last_active_epoch + 7,
        ErrorCode::CooldownNotMet
    );

    // Return stake to operator
    let stake_amount = ctx.accounts.stake_vault.amount;
    // ... transfer back

    Ok(())
}
```

## Anti-Sybil node limits

```rust
// Per hex limit (connectivity networks)
pub fn check_hex_node_limit(
    h3_index: u64,
    node_type: u8,
    existing_nodes_in_hex: u32,
    config: &EpochConfig,
) -> Result<()> {
    let max_nodes = config.max_nodes_per_hex[node_type as usize];
    // Diminishing returns: first node earns 100%, each additional earns less
    // Hard cap at max_nodes
    require!(existing_nodes_in_hex < max_nodes, ErrorCode::HexAtCapacity);
    Ok(())
}
```
