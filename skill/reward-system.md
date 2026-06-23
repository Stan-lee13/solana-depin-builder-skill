# Reward System Design

Designing DePIN token economics that attract real operators, sustain the network, and don't collapse under selling pressure. This is the game theory layer of your protocol.

## Reward architecture overview

```
SUPPLY SIDE (nodes earn)         DEMAND SIDE (users pay)
       │                                  │
       ▼                                  ▼
  Work Proof                       Service Payment
  Submitted                         Received
       │                                  │
       └────────────┬─────────────────────┘
                    │
                    ▼
           REWARD POOL
         ┌─────────────────────────────────┐
         │  Protocol Treasury    60%        │
         │  (token emissions)               │
         │                                  │
         │  Protocol Revenue     40%        │
         │  (from demand side)              │
         └─────────────────────────────────┘
                    │
                    ▼
           EPOCH DISTRIBUTION
         (proportional to verified work)
```

## Emission schedule design

### Halving model (Bitcoin-inspired, used by Helium)

```typescript
interface EmissionSchedule {
  initial_epoch_emission: bigint;   // Tokens per epoch at launch
  halving_interval_epochs: number;  // Epochs between halvings
  min_emission: bigint;             // Emission floor (never zero)
}

function calculateEpochEmission(
  current_epoch: number,
  schedule: EmissionSchedule
): bigint {
  const halvings = Math.floor(current_epoch / schedule.halving_interval_epochs);
  const emission = schedule.initial_epoch_emission / BigInt(2 ** halvings);
  return emission > schedule.min_emission ? emission : schedule.min_emission;
}

// Example: 1 year of daily epochs
const heliumStyle: EmissionSchedule = {
  initial_epoch_emission: BigInt(10_000_000) * BigInt(1e9), // 10M tokens/epoch
  halving_interval_epochs: 365,    // Halve every year
  min_emission: BigInt(100_000) * BigInt(1e9), // 100K minimum floor
};
```

### Decay model (smoother, used by many 2026 protocols)

```typescript
// Exponential decay: emission(epoch) = initial × (1 - decay_rate)^epoch
function decayEmission(epoch: number, initial: bigint, decayBPS: number): bigint {
  const decayFactor = (10_000 - decayBPS) / 10_000; // e.g., 50 BPS = 0.5%/epoch decay
  const emission = Number(initial) * Math.pow(decayFactor, epoch);
  return BigInt(Math.round(emission));
}

// With 50 BPS daily decay and 1B initial emission:
// Day 1:   1,000,000,000
// Day 30:  861,667,150
// Day 365: 161,111,234  (83% reduction in year 1)
// Day 730: 25,965,827   (further reduction in year 2)
```

### Anchor: On-chain emission calculation

```rust
pub fn calculate_epoch_emission(
    epoch: u64,
    initial_emission: u64,
    halving_interval: u64,
    min_emission: u64,
) -> u64 {
    let halvings = epoch / halving_interval;
    let emission = initial_emission
        .checked_shr(halvings as u32)
        .unwrap_or(0);
    
    emission.max(min_emission)
}
```

## Work unit scoring

### Single-tier scoring (simple)

```rust
// All verified work is equal — simplest to implement, easiest to understand
pub fn calculate_node_reward(
    node_epoch_score: u64,
    total_network_score: u128,
    epoch_emission: u64,
) -> u64 {
    if total_network_score == 0 {
        return 0;
    }

    // node_reward = (node_score / total_score) × epoch_emission
    let reward = (node_epoch_score as u128)
        .checked_mul(epoch_emission as u128)
        .unwrap_or(0)
        .checked_div(total_network_score)
        .unwrap_or(0);

    reward as u64
}
```

### Multi-tier scoring (recommended for production)

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct WorkScore {
    pub base_units: u64,       // Raw verified work units
    pub quality_multiplier: u16, // 500-1500 (500=0.5x, 1000=1x, 1500=1.5x)
    pub location_bonus: u16,   // 0-500 (bonus for underserved hexagons)
    pub uptime_multiplier: u16, // 500-1000 (proportional to uptime %)
    pub stake_multiplier: u16, // 1000-1600 (based on stake tier)
}

impl WorkScore {
    pub fn weighted_score(&self) -> u64 {
        let score = self.base_units as u128
            * self.quality_multiplier as u128
            * self.uptime_multiplier as u128
            * self.stake_multiplier as u128;
        
        // Normalize by 1000^3 (three 1000-base multipliers)
        (score / 1_000_000_000).min(u64::MAX as u128) as u64
    }
}

// Example scoring for connectivity network
pub fn score_coverage_proof(
    witness_count: u8,
    coverage_score: u16,
    h3_density: u8,       // How many nodes already cover this hex
    node_uptime_pct: u8,  // 0-100
    stake_tier: u8,        // 0-2
) -> WorkScore {
    // Base: witness count drives base score
    let base_units = (witness_count as u64) * 100;
    
    // Quality: based on coverage score from oracle
    let quality_multiplier = 500 + ((coverage_score as u16) / 2); // 500-1000
    
    // Location bonus: underserved hexagons earn more (incentivizes rural coverage)
    let location_bonus = match h3_density {
        0 => 500,   // No coverage → +50% bonus
        1 => 300,   // Sparse coverage → +30% bonus
        2 => 100,   // Some coverage → +10% bonus
        _ => 0,     // Dense coverage → no bonus
    };
    
    // Uptime
    let uptime_multiplier = 500 + (node_uptime_pct as u16 * 5); // 500-1000
    
    // Stake tier bonus
    let stake_multiplier = 1000 + (stake_tier as u16 * 200); // 1000, 1200, 1400
    
    WorkScore {
        base_units,
        quality_multiplier,
        location_bonus,
        uptime_multiplier,
        stake_multiplier,
    }
}
```

## Epoch lifecycle (on-chain)

```rust
// Epoch state machine
pub fn finalize_epoch(ctx: Context<FinalizeEpoch>, epoch: u64) -> Result<()> {
    let epoch_state = &mut ctx.accounts.epoch_state;
    let clock = Clock::get()?;
    
    // Validate epoch is complete
    require!(clock.slot > epoch_state.end_slot, ErrorCode::EpochNotComplete);
    require!(!epoch_state.is_finalized, ErrorCode::EpochAlreadyFinalized);
    
    // Calculate total emission for this epoch
    let emission = calculate_epoch_emission(
        epoch,
        ctx.accounts.reward_pool.initial_epoch_emission,
        ctx.accounts.reward_pool.halving_interval,
        ctx.accounts.reward_pool.min_emission,
    );
    
    // Mint epoch reward into distribution pool
    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.epoch_reward_vault.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
            &[&[b"mint_authority", &[ctx.bumps.mint_authority]]],
        ),
        emission,
    )?;
    
    epoch_state.reward_pool = emission;
    epoch_state.is_finalized = true;
    
    emit!(EpochFinalized {
        epoch,
        total_work_units: epoch_state.total_work_units,
        reward_pool: emission,
        participating_nodes: epoch_state.participating_nodes,
    });
    
    Ok(())
}

// Node claims reward after epoch finalization
pub fn claim_epoch_reward(ctx: Context<ClaimReward>, epoch: u64) -> Result<()> {
    let epoch_state = &ctx.accounts.epoch_state;
    let node = &mut ctx.accounts.node_account;
    
    require!(epoch_state.is_finalized, ErrorCode::EpochNotFinalized);
    
    // Prevent double claims
    let claim_record = &mut ctx.accounts.claim_record;
    require!(!claim_record.is_claimed, ErrorCode::AlreadyClaimed);
    
    // Calculate this node's reward
    let node_reward = calculate_node_reward(
        node.current_epoch_score,
        epoch_state.total_work_units,
        epoch_state.reward_pool,
    );
    
    require!(node_reward > 0, ErrorCode::NoRewardEarned);
    
    // Transfer reward to operator
    anchor_spl::token::transfer(
        CpiContext::new_with_signer(/* ... */),
        node_reward,
    )?;
    
    // Mark claimed and reset epoch score
    claim_record.is_claimed = true;
    node.lifetime_rewards += node_reward;
    node.current_epoch_score = 0;
    
    emit!(RewardClaimed {
        node: node.key(),
        epoch,
        amount: node_reward,
    });
    
    Ok(())
}
```

## Delegated staking (non-operator participation)

Allow token holders to back nodes without running hardware:

```rust
#[account]
pub struct DelegationAccount {
    pub delegator: Pubkey,      // Token holder
    pub node: Pubkey,           // Node they back
    pub staked_amount: u64,     // Tokens staked
    pub reward_share_bps: u16,  // Basis points of reward going to delegator
    pub epoch_joined: u64,
    pub bump: u8,
}

// Delegation economics
// Node operator sets reward_share_bps (e.g., 8000 = 80% to delegator, 20% to operator)
// Delegator earns proportional to stake / total_delegation_to_node
// Creates liquid staking market — nodes compete for delegations by offering better rates
```

## Slashing conditions

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum SlashReason {
    FakeLocationProof,        // Oracle detected location fraud
    DuplicateProofSubmission, // Submitted same proof twice
    OfflineConsecutiveEpochs, // Missed N epochs in a row
    InvalidDeviceSignature,   // Signed with wrong device key
    OracleCollusion,          // Oracle fraud with node
}

pub fn slash_node(
    ctx: Context<SlashNode>,
    reason: SlashReason,
) -> Result<()> {
    let node = &mut ctx.accounts.node_account;
    let slash_amount = match reason {
        SlashReason::FakeLocationProof => node.stake_amount,        // 100% slash
        SlashReason::DuplicateProofSubmission => node.stake_amount / 4, // 25% slash
        SlashReason::OfflineConsecutiveEpochs => node.stake_amount / 10, // 10% slash
        SlashReason::InvalidDeviceSignature => node.stake_amount / 4,
        SlashReason::OracleCollusion => node.stake_amount,          // 100% slash
    };
    
    // Slash amount goes to DAO treasury (not burned — creates treasury income)
    // ... transfer to treasury
    
    node.stake_amount -= slash_amount;
    node.status = if node.stake_amount < MIN_STAKE { 
        NodeStatus::Slashed as u8 
    } else { 
        NodeStatus::Active as u8 
    };
    
    Ok(())
}
```

## ROI calculator (for node operator onboarding)

```typescript
// Help operators understand their expected returns before buying hardware
interface NodeROIModel {
  hardware_cost_usd: number;
  operating_cost_monthly_usd: number;    // Electricity, internet
  token_price_usd: number;
  network_node_count: number;
  epoch_emission_tokens: number;
  estimated_coverage_score: number;      // 0-1000
  stake_tier: 0 | 1 | 2;
}

function calculateNodeROI(model: NodeROIModel): {
  daily_earnings_tokens: number;
  daily_earnings_usd: number;
  monthly_earnings_usd: number;
  breakeven_months: number;
  annual_roi_pct: number;
} {
  // Estimated market share (assumes equal distribution for simplicity)
  const market_share = 1 / model.network_node_count;
  
  // Score multiplier from tier
  const tier_multiplier = [1.0, 1.3, 1.6][model.stake_tier];
  
  // Coverage quality adjustment
  const quality_multiplier = model.estimated_coverage_score / 1000;
  
  // Daily earnings (1 epoch = 1 day standard)
  const daily_earnings_tokens = 
    model.epoch_emission_tokens * market_share * tier_multiplier * quality_multiplier;
  
  const daily_earnings_usd = daily_earnings_tokens * model.token_price_usd;
  const monthly_earnings_usd = daily_earnings_usd * 30 - model.operating_cost_monthly_usd;
  
  const breakeven_months = model.hardware_cost_usd / monthly_earnings_usd;
  const annual_roi_pct = (monthly_earnings_usd * 12) / model.hardware_cost_usd * 100;
  
  return {
    daily_earnings_tokens,
    daily_earnings_usd,
    monthly_earnings_usd,
    breakeven_months,
    annual_roi_pct,
  };
}
```
