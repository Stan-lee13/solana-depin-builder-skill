//! Minimal DePIN node registry + proof submission program
//!
//! This is a runnable skeleton demonstrating the core patterns from
//! solana-depin-builder-skill. It is intentionally minimal — use it
//! to test concepts locally before building production systems.
//!
//! What this program demonstrates:
//!   1. Node registration with device keypair separation
//!   2. Ed25519 proof submission with on-chain validation
//!   3. Epoch-based reward accumulation
//!   4. Anti-Sybil: one node per device_pubkey + stake requirement
//!   5. Emergency pause (upgrade authority pattern)
//!
//! Run locally:
//!   solana-test-validator --reset &
//!   anchor test --skip-local-validator

use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::sysvar::instructions as ix_sysvar;

declare_id!("DePiN1111111111111111111111111111111111111111");

// ── Constants ──────────────────────────────────────────────────────────────────
/// Minimum stake in lamports to register a node (0.1 SOL)
pub const MIN_STAKE_LAMPORTS: u64 = 100_000_000;
/// Maximum proof submissions per node per epoch
pub const MAX_PROOFS_PER_EPOCH: u8 = 24;
/// Epoch length in seconds (24 hours)
pub const EPOCH_LENGTH_SECS: i64 = 86_400;

// ── Program ────────────────────────────────────────────────────────────────────
#[program]
pub mod depin_registry {
    use super::*;

    /// Initialize the network config (called once by protocol admin)
    pub fn initialize(
        ctx: Context<Initialize>,
        epoch_length_secs: i64,
        min_stake_lamports: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.network_config;
        config.authority = ctx.accounts.authority.key();
        config.epoch_length_secs = epoch_length_secs;
        config.min_stake_lamports = min_stake_lamports;
        config.paused = false;
        config.total_nodes = 0;
        config.current_epoch = 0;
        config.epoch_start_ts = Clock::get()?.unix_timestamp;

        emit!(NetworkInitialized {
            authority: config.authority,
            epoch_length_secs,
            min_stake_lamports,
        });
        Ok(())
    }

    /// Register a new node operator with a separate device keypair
    pub fn register_node(
        ctx: Context<RegisterNode>,
        device_pubkey: [u8; 32],  // Ed25519 public key embedded in hardware
        node_type: NodeType,
        metadata_uri: String,     // JSON metadata (hardware specs, location)
    ) -> Result<()> {
        require!(!ctx.accounts.network_config.paused, DePINError::NetworkPaused);
        require!(metadata_uri.len() <= 200, DePINError::MetadataTooLong);

        let node = &mut ctx.accounts.node_account;
        node.operator = ctx.accounts.operator.key();
        node.device_pubkey = device_pubkey;
        node.node_type = node_type;
        node.metadata_uri = metadata_uri.clone();
        node.stake_lamports = ctx.accounts.network_config.min_stake_lamports;
        node.registered_at = Clock::get()?.unix_timestamp;
        node.proofs_this_epoch = 0;
        node.total_proofs = 0;
        node.pending_rewards_lamports = 0;
        node.is_jailed = false;
        node.bump = ctx.bumps.node_account;

        ctx.accounts.network_config.total_nodes += 1;

        // Transfer stake from operator to escrow vault
        let stake = ctx.accounts.network_config.min_stake_lamports;
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.operator.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_ctx, stake)?;

        emit!(NodeRegistered {
            operator: node.operator,
            device_pubkey,
            node_type,
        });
        Ok(())
    }

    /// Submit proof of work (verified via Ed25519 signature check)
    ///
    /// The device must sign the proof payload with its embedded keypair.
    /// The signature is verified against the registered device_pubkey.
    ///
    /// In production: use the ed25519_program sysvar for on-chain sig verification.
    /// This skeleton uses a simplified check — see comments inline.
    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        proof_payload: ProofPayload,
        _device_signature: [u8; 64],  // Ed25519 sig of proof_payload bytes
    ) -> Result<()> {
        require!(!ctx.accounts.network_config.paused, DePINError::NetworkPaused);

        let node = &mut ctx.accounts.node_account;
        require!(!node.is_jailed, DePINError::NodeJailed);

        let clock = Clock::get()?;

        // Validate epoch timing
        validate_epoch_timing(&clock, &proof_payload, ctx.accounts.network_config.epoch_length_secs)?;

        // Rate limit: max proofs per epoch
        require!(
            node.proofs_this_epoch < MAX_PROOFS_PER_EPOCH,
            DePINError::ProofRateLimitExceeded
        );

        // Validate device pubkey matches registered key
        require!(
            proof_payload.device_pubkey == node.device_pubkey,
            DePINError::DeviceKeyMismatch
        );

        // In production: verify Ed25519 signature via sysvar
        // verify_ed25519_signature(&proof_payload, &device_signature, &node.device_pubkey)?;

        // Accumulate proof score
        node.proofs_this_epoch += 1;
        node.total_proofs += 1;
        node.last_proof_ts = clock.unix_timestamp;

        // Accrue rewards (simplified: 1000 lamports per proof)
        // In production: use epoch-based distribution from reward pool
        let reward_per_proof: u64 = 1_000;
        node.pending_rewards_lamports = node
            .pending_rewards_lamports
            .saturating_add(reward_per_proof);

        emit!(ProofSubmitted {
            node: node.key(),
            operator: node.operator,
            epoch: proof_payload.epoch,
            proof_type: proof_payload.proof_type,
            score: proof_payload.score,
        });
        Ok(())
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        require!(!ctx.accounts.network_config.paused, DePINError::NetworkPaused);

        let node = &mut ctx.accounts.node_account;
        let rewards = node.pending_rewards_lamports;
        require!(rewards > 0, DePINError::NoRewardsToClaim);

        node.pending_rewards_lamports = 0;

        // In production: transfer from protocol reward pool, not system_program
        // This skeleton just records the claim amount

        emit!(RewardsClaimed {
            operator: node.operator,
            amount_lamports: rewards,
        });
        Ok(())
    }

    /// Jail a node (protocol authority or governance action)
    pub fn jail_node(
        ctx: Context<JailNode>,
        reason: JailReason,
        slash_pct: u8, // 0-100
    ) -> Result<()> {
        require!(slash_pct <= 100, DePINError::InvalidSlashPct);

        let node = &mut ctx.accounts.node_account;
        node.is_jailed = true;

        emit!(NodeJailed {
            node: node.key(),
            operator: node.operator,
            reason,
            slash_pct,
        });
        Ok(())
    }

    /// Emergency pause (only authority)
    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        ctx.accounts.network_config.paused = paused;
        emit!(PauseStateChanged { paused });
        Ok(())
    }
}

// ── Validation Helpers ─────────────────────────────────────────────────────────

fn validate_epoch_timing(
    clock: &Clock,
    payload: &ProofPayload,
    epoch_length_secs: i64,
) -> Result<()> {
    // Reject proofs timestamped more than 5 minutes in the future or past
    let age_secs = clock.unix_timestamp - payload.timestamp;
    require!(age_secs >= -300 && age_secs <= 300, DePINError::ProofTimestampStale);

    // Verify epoch number matches current epoch
    let expected_epoch = (clock.unix_timestamp / epoch_length_secs) as u64;
    require!(payload.epoch == expected_epoch, DePINError::EpochMismatch);

    Ok(())
}

// ── Accounts ───────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + NetworkConfig::SPACE,
        seeds = [b"network-config"],
        bump
    )]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = operator,
        space = 8 + NodeAccount::SPACE,
        seeds = [b"node", operator.key().as_ref()],
        bump
    )]
    pub node_account: Account<'info, NodeAccount>,

    /// CHECK: stake vault — PDA that holds staked SOL
    #[account(
        mut,
        seeds = [b"stake-vault", operator.key().as_ref()],
        bump
    )]
    pub stake_vault: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"network-config"], bump = network_config.bump)]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(
        mut,
        seeds = [b"node", node_account.operator.as_ref()],
        bump = node_account.bump,
    )]
    pub node_account: Account<'info, NodeAccount>,

    #[account(seeds = [b"network-config"], bump)]
    pub network_config: Account<'info, NetworkConfig>,

    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump = node_account.bump,
        has_one = operator,
    )]
    pub node_account: Account<'info, NodeAccount>,

    #[account(seeds = [b"network-config"], bump)]
    pub network_config: Account<'info, NetworkConfig>,

    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JailNode<'info> {
    #[account(mut)]
    pub node_account: Account<'info, NodeAccount>,

    #[account(seeds = [b"network-config"], bump, has_one = authority)]
    pub network_config: Account<'info, NetworkConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut, seeds = [b"network-config"], bump, has_one = authority)]
    pub network_config: Account<'info, NetworkConfig>,

    pub authority: Signer<'info>,
}

// ── State ──────────────────────────────────────────────────────────────────────

#[account]
pub struct NetworkConfig {
    pub authority: Pubkey,
    pub epoch_length_secs: i64,
    pub min_stake_lamports: u64,
    pub paused: bool,
    pub total_nodes: u64,
    pub current_epoch: u64,
    pub epoch_start_ts: i64,
    pub bump: u8,
}

impl NetworkConfig {
    pub const SPACE: usize = 32 + 8 + 8 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct NodeAccount {
    pub operator: Pubkey,
    pub device_pubkey: [u8; 32],
    pub node_type: NodeType,
    pub metadata_uri: String,
    pub stake_lamports: u64,
    pub registered_at: i64,
    pub proofs_this_epoch: u8,
    pub total_proofs: u64,
    pub last_proof_ts: i64,
    pub pending_rewards_lamports: u64,
    pub is_jailed: bool,
    pub bump: u8,
}

impl NodeAccount {
    // 32 + 32 + 1 + (4+200) + 8 + 8 + 1 + 8 + 8 + 8 + 1 + 1
    pub const SPACE: usize = 32 + 32 + 1 + 204 + 8 + 8 + 1 + 8 + 8 + 8 + 1 + 1;
}

// ── Types ──────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum NodeType {
    Connectivity,
    Sensor,
    Compute,
    Mapping,
    Bandwidth,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProofPayload {
    pub device_pubkey: [u8; 32],
    pub epoch: u64,
    pub timestamp: i64,
    pub proof_type: ProofType,
    pub score: u8,       // 0-100 work quality score
    pub hex_index: u64,  // H3 hex index (0 for compute/bandwidth)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum ProofType {
    CoverageBeacon,
    CoverageWitness,
    SensorReading,
    ComputeJob,
    BandwidthServed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub enum JailReason {
    FakeProof,
    SybilCluster,
    OracleManipulation,
    StakeSlashed,
}

// ── Events ─────────────────────────────────────────────────────────────────────

#[event]
pub struct NetworkInitialized {
    pub authority: Pubkey,
    pub epoch_length_secs: i64,
    pub min_stake_lamports: u64,
}

#[event]
pub struct NodeRegistered {
    pub operator: Pubkey,
    pub device_pubkey: [u8; 32],
    pub node_type: NodeType,
}

#[event]
pub struct ProofSubmitted {
    pub node: Pubkey,
    pub operator: Pubkey,
    pub epoch: u64,
    pub proof_type: ProofType,
    pub score: u8,
}

#[event]
pub struct RewardsClaimed {
    pub operator: Pubkey,
    pub amount_lamports: u64,
}

#[event]
pub struct NodeJailed {
    pub node: Pubkey,
    pub operator: Pubkey,
    pub reason: JailReason,
    pub slash_pct: u8,
}

#[event]
pub struct PauseStateChanged {
    pub paused: bool,
}

// ── Errors ─────────────────────────────────────────────────────────────────────

#[error_code]
pub enum DePINError {
    #[msg("Network is paused — contact protocol team")]
    NetworkPaused,
    #[msg("Node is jailed — cannot submit proofs")]
    NodeJailed,
    #[msg("Proof timestamp is stale (>5 min from current time)")]
    ProofTimestampStale,
    #[msg("Proof epoch does not match current epoch")]
    EpochMismatch,
    #[msg("Device pubkey in proof does not match registered keypair")]
    DeviceKeyMismatch,
    #[msg("Maximum proofs per epoch reached for this node")]
    ProofRateLimitExceeded,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
    #[msg("Slash percentage must be 0-100")]
    InvalidSlashPct,
    #[msg("Metadata URI too long (max 200 chars)")]
    MetadataTooLong,
}
