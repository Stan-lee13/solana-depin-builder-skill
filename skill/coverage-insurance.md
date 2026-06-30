# Coverage Insurance Protocol

DePIN networks have a structural reliability problem: operators are independent, hardware fails, and coverage gaps appear unpredictably. Data consumers who pay for SLA-grade coverage have no recourse when nodes go offline. This erodes enterprise trust and kills B2B revenue.

Coverage Insurance is an on-chain parametric insurance pool that automatically pays out when measured coverage falls below SLA thresholds — no claims process, no adjuster, no delay.

## The Problem

```
TRADITIONAL DEPIN RELIABILITY:         COVERAGE INSURANCE:
  Node goes offline                      Node goes offline
  Coverage gap appears                   Coverage gap triggers H3 cell check
  Data consumer discovers bad data       Parametric payout fires automatically
  Files complaint with protocol          Data consumer receives partial refund
  Protocol "reviews" (weeks)             Within same epoch (hours)
  Consumer churns                        Consumer stays — risk is hedged
  Protocol loses B2B contract            Protocol closes B2B contracts
```

---

## Architecture

### Parametric Trigger Design

```rust
// programs/coverage_insurance/src/state.rs

use anchor_lang::prelude::*;

/// Insurance pool funded by operator staking premiums
#[account]
pub struct InsurancePool {
    pub authority:           Pubkey,
    pub pool_token_mint:     Pubkey,
    pub pool_vault:          Pubkey,
    pub total_reserves:      u64,    // Tokens held for payouts
    pub premium_rate_bps:    u16,    // bps of operator rewards taken as premium
    pub min_coverage_bps:    u16,    // 9500 = 95% uptime required to avoid claims
    pub payout_per_cell_gap: u64,    // Tokens paid per H3 cell below threshold per epoch
    pub epoch_duration_secs: i64,
    pub bump:                u8,
}

/// SLA agreement between protocol and a data consumer
#[account]
pub struct CoverageSla {
    pub consumer:            Pubkey,  // Data consumer wallet
    pub covered_h3_cells:    Vec<[u8; 8]>, // H3 cells covered by this SLA
    pub min_uptime_bps:      u16,    // 9500 = 95% uptime guaranteed
    pub premium_paid:        u64,    // Tokens paid for this SLA period
    pub period_start:        i64,
    pub period_end:          i64,
    pub total_payouts:       u64,    // Running total of payouts received
    pub active:              bool,
    pub bump:                u8,
}

/// Snapshot of cell coverage for a specific epoch
#[account]
pub struct CellEpochSnapshot {
    pub h3_cell:             [u8; 8],
    pub epoch:               u64,
    pub registered_nodes:    u16,    // Nodes registered at epoch start
    pub active_nodes:        u16,    // Nodes that submitted valid proof
    pub uptime_bps:          u16,    // active / registered in BPS
    pub payout_triggered:    bool,
    pub total_payout:        u64,
    pub bump:                u8,
}
```

### Payout Instruction

```rust
// programs/coverage_insurance/src/instructions/claim_coverage_payout.rs

use anchor_lang::prelude::*;
use crate::state::{InsurancePool, CoverageSla, CellEpochSnapshot};
use crate::error::InsuranceError;

#[derive(Accounts)]
pub struct ClaimCoveragePayout<'info> {
    #[account(mut)]
    pub insurance_pool: Account<'info, InsurancePool>,

    #[account(
        mut,
        constraint = sla.consumer == consumer.key() @ InsuranceError::UnauthorizedConsumer,
        constraint = sla.active @ InsuranceError::SlaExpired,
    )]
    pub sla: Account<'info, CoverageSla>,

    #[account(
        mut,
        constraint = snapshot.epoch == current_epoch @ InsuranceError::WrongEpoch,
        constraint = !snapshot.payout_triggered @ InsuranceError::AlreadyPaidOut,
    )]
    pub cell_snapshot: Account<'info, CellEpochSnapshot>,

    #[account(mut)]
    pub pool_vault: Account<'info, anchor_spl::token::TokenAccount>,

    #[account(mut)]
    pub consumer_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    pub consumer: Signer<'info>,
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

pub fn claim_coverage_payout(
    ctx: Context<ClaimCoveragePayout>,
    current_epoch: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.insurance_pool;
    let sla = &ctx.accounts.sla;
    let snapshot = &mut ctx.accounts.cell_snapshot;

    // Verify this H3 cell is covered by the consumer's SLA
    require!(
        sla.covered_h3_cells.contains(&snapshot.h3_cell),
        InsuranceError::CellNotCoveredBySla
    );

    // Parametric trigger: did uptime fall below the SLA threshold?
    let uptime_shortfall = sla.min_uptime_bps.saturating_sub(snapshot.uptime_bps);
    require!(uptime_shortfall > 0, InsuranceError::SlaNotBreached);

    // Payout scales with severity of shortfall:
    //   1% shortfall = 10% of payout_per_cell_gap
    //   10% shortfall = 100% of payout_per_cell_gap
    //   > 10% shortfall = 150% (capped) — severe outage premium
    let payout_multiplier_bps: u64 = std::cmp::min(
        (uptime_shortfall as u64) * 100, // 1 BPS shortfall = 100 BPS multiplier
        15_000,                          // Cap at 150%
    );

    let payout = (pool.payout_per_cell_gap as u128)
        .checked_mul(payout_multiplier_bps as u128)
        .unwrap_or(0)
        .checked_div(10_000)
        .unwrap_or(0) as u64;

    require!(payout > 0, InsuranceError::PayoutTooSmall);
    require!(pool.total_reserves >= payout, InsuranceError::InsufficientReserves);

    // Transfer payout to consumer
    let seeds = &[b"insurance-pool", &[pool.bump]];
    anchor_spl::token::transfer(
        anchor_cpi_context(pool, ctx.accounts.pool_vault.to_account_info(),
                           ctx.accounts.consumer_token_account.to_account_info(),
                           &ctx.accounts.token_program, seeds),
        payout,
    )?;

    pool.total_reserves = pool.total_reserves.saturating_sub(payout);
    snapshot.payout_triggered = true;
    snapshot.total_payout = payout;

    emit!(CoveragePayoutEvent {
        consumer: ctx.accounts.consumer.key(),
        h3_cell: snapshot.h3_cell,
        epoch: current_epoch,
        uptime_bps: snapshot.uptime_bps,
        sla_threshold_bps: sla.min_uptime_bps,
        shortfall_bps: uptime_shortfall,
        payout,
    });

    msg!("Coverage payout: {} tokens for cell {:?} ({}% uptime vs {}% SLA)",
         payout, snapshot.h3_cell,
         snapshot.uptime_bps / 100, sla.min_uptime_bps / 100);

    Ok(())
}
```

---

## Premium Collection (Funded by Operator Rewards)

```rust
// Operators pay premiums automatically — deducted from epoch rewards

pub fn distribute_rewards_with_premium(
    ctx: Context<DistributeRewards>,
    gross_reward: u64,
) -> Result<u64> {
    let pool = &mut ctx.accounts.insurance_pool;

    // Deduct insurance premium from operator reward
    let premium = (gross_reward as u128)
        .checked_mul(pool.premium_rate_bps as u128)
        .unwrap_or(0)
        .checked_div(10_000)
        .unwrap_or(0) as u64;

    let net_reward = gross_reward.saturating_sub(premium);

    // Transfer premium to insurance pool vault
    // ... (CPI to token transfer)
    pool.total_reserves = pool.total_reserves.saturating_add(premium);

    msg!("Reward distributed: {} gross, {} premium, {} net to operator",
         gross_reward, premium, net_reward);

    Ok(net_reward)
}
```

---

## TypeScript: SLA Management Dashboard

```typescript
// sdk/coverage-insurance-client.ts

export interface SlaStatus {
  consumer:        string;
  coveredCells:    string[];  // H3 cell IDs
  minUptimeBps:    number;    // e.g., 9500 = 95%
  periodEnd:       Date;
  currentUptime:   Record<string, number>; // cell → current uptime BPS
  pendingClaims:   number;    // cells currently below threshold
  totalPayouts:    bigint;    // tokens received so far
  reserveHealth:   "HEALTHY" | "LOW" | "CRITICAL";
}

export async function getSlaStatus(
  rpc: string,
  heliusApiKey: string,
  slaAddress: string,
): Promise<SlaStatus> {
  // Fetch on-chain SLA account + cell snapshots
  const connection = new Connection(rpc);
  // ... deserialize SLA account ...

  // Fetch current cell uptime from Helius DAS API
  const cellUptimes: Record<string, number> = {};
  // ... query compressed cell snapshots ...

  const pendingClaims = Object.values(cellUptimes)
    .filter(uptime => uptime < 9500).length; // Below 95%

  return {
    consumer: "...",
    coveredCells: [],
    minUptimeBps: 9500,
    periodEnd: new Date(),
    currentUptime: cellUptimes,
    pendingClaims,
    totalPayouts: 0n,
    reserveHealth: "HEALTHY",
  };
}
```

---

## Why This Changes DePIN's B2B Model

```
WITHOUT COVERAGE INSURANCE:
  Enterprise: "We need 99% uptime for our logistics system"
  Protocol:   "We target 95%"
  Enterprise: "What happens when you miss?"
  Protocol:   "We'll try harder next month"
  Enterprise: "Pass."

WITH COVERAGE INSURANCE:
  Enterprise: "We need 99% uptime for our logistics system"
  Protocol:   "Our SLA pool pays out automatically when we miss"
  Enterprise: "Show me the on-chain reserve"
  Protocol:   "Here's the pool address: [LINK]"
  Enterprise: "Contract signed."

THE REAL VALUE:
  Insurance transforms DePIN from "best effort" to "bankable SLA"
  Operators are incentivized to maintain uptime (missing = more claims = premium increases)
  Data consumers have on-chain recourse (no legal dispute, no waiting)
  Protocol can publish reserve ratio as a trust metric
```
