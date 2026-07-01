# DePIN Data Pricing Oracle

Every DePIN data marketplace has the same broken pricing model: a founder picks a fixed price per API call at launch and hopes it's right forever. It's never right. When the network is sparse, data is scarce and underpriced — buyers get a steal, the protocol undersells its own value. When the network is dense, data is abundant and overpriced — buyers route around it to cheaper alternatives. Fixed pricing kills DePIN data marketplaces quietly and consistently.

The DePIN Data Pricing Oracle is an on-chain dynamic pricing engine that adjusts data prices every epoch based on real supply (active nodes, data volume) and real demand (query volume, revenue), using a bonding curve that converges toward market-clearing price automatically.

---

## The Core Model

```
FIXED PRICING (how every DePIN launches):        DYNAMIC PRICING (what they need):

  Price = $0.001/call (founder's guess)            Price = f(supply, demand, coverage_density)
  Network grows → data abundant → price stale      Network sparse → price rises → attracts operators
  Buyers feel ripped off                           Network dense → price falls → attracts buyers
  Protocol can't capture value at peak             Protocol captures full market value at all times
  Manual governance vote to change price           Price adjusts automatically every epoch
  6-month delay → competitors undercut             Continuous equilibrium → no arbitrage window

THE EQUILIBRIUM MECHANISM:
  More supply  →  price decreases  →  more buyers  →  more demand signal  →  price stabilizes
  More demand  →  price increases  →  more revenue  →  more operators join  →  more supply
  Both forces converge on the market-clearing price without human intervention.
```

---

## On-Chain Price State

```rust
// programs/data_pricing_oracle/src/state.rs

use anchor_lang::prelude::*;

/// Global pricing configuration — one per data type per network
#[account]
pub struct PricingConfig {
    pub authority:              Pubkey,   // Network authority (Squads multisig)
    pub data_type:              [u8; 32], // e.g., b"weather_temp" or b"gps_correction"
    pub base_price_lamports:    u64,      // Floor price — price never goes below this
    pub max_price_lamports:     u64,      // Ceiling price — prevents runaway during demand spikes
    pub target_utilization_bps: u16,      // Target: 7500 = 75% of supply should be bought
    pub adjustment_rate_bps:    u16,      // Max price change per epoch (500 = 5%)
    pub epoch_duration_secs:    i64,      // How long each pricing epoch lasts
    pub bump:                   u8,
}

/// Live price state — updated every epoch by the pricing crank
#[account]
pub struct EpochPriceState {
    pub data_type:              [u8; 32],
    pub epoch:                  u64,
    pub current_price_lamports: u64,      // Price for THIS epoch
    pub next_price_lamports:    u64,      // Pre-computed price for NEXT epoch
    pub supply_units:           u64,      // Total data units available from active nodes
    pub demand_units:           u64,      // Total data units purchased this epoch
    pub utilization_bps:        u16,      // demand / supply in BPS
    pub price_direction:        i8,       // +1 = rising, -1 = falling, 0 = stable
    pub revenue_lamports:       u64,      // Total revenue collected this epoch
    pub bump:                   u8,
}

/// Per-node supply registration — nodes declare available data units each epoch
#[account]
pub struct NodeSupplyDeclaration {
    pub node:              Pubkey,
    pub data_type:         [u8; 32],
    pub epoch:             u64,
    pub declared_units:    u64,    // Units this node can serve this epoch
    pub served_units:      u64,    // Actually served (updated on query)
    pub quality_score_bps: u16,    // 0–10000 — feeds into weighted pricing
    pub bump:              u8,
}
```

---

## Pricing Engine: Bonding Curve Update

```rust
// programs/data_pricing_oracle/src/instructions/update_epoch_price.rs

use anchor_lang::prelude::*;
use crate::state::{PricingConfig, EpochPriceState};

pub fn update_epoch_price(
    ctx: Context<UpdateEpochPrice>,
    new_epoch: u64,
) -> Result<()> {
    let config  = &ctx.accounts.pricing_config;
    let state   = &mut ctx.accounts.epoch_price_state;

    // ── 1. Compute utilization from last epoch ─────────────────────────────
    let utilization_bps: u16 = if state.supply_units == 0 {
        0
    } else {
        ((state.demand_units as u128)
            .saturating_mul(10_000)
            .saturating_div(state.supply_units as u128)) as u16
    };

    // ── 2. Determine price adjustment direction and magnitude ──────────────
    //
    // Utilization above target → demand outpacing supply → raise price
    // Utilization below target → supply outpacing demand → lower price
    // Gap scales the adjustment: larger gap = faster correction
    //
    let utilization_gap_bps = utilization_bps as i32 - config.target_utilization_bps as i32;

    // Adjustment is proportional to gap, capped at config.adjustment_rate_bps per epoch
    // Gap of 2500 bps (25%) → full adjustment_rate_bps applied
    // Gap of 250 bps (2.5%) → 10% of adjustment_rate_bps applied
    let adjustment_fraction = (utilization_gap_bps.abs() as u64)
        .min(2_500)                               // Cap sensitivity at 25% gap
        .saturating_mul(config.adjustment_rate_bps as u64)
        .saturating_div(2_500);                   // Normalize

    let current = state.current_price_lamports;

    let new_price = if utilization_gap_bps > 50 {
        // Demand > supply + 0.5% buffer → price rises
        current
            .saturating_add(current.saturating_mul(adjustment_fraction).saturating_div(10_000))
            .min(config.max_price_lamports)
    } else if utilization_gap_bps < -50 {
        // Supply > demand + 0.5% buffer → price falls
        current
            .saturating_sub(current.saturating_mul(adjustment_fraction).saturating_div(10_000))
            .max(config.base_price_lamports)
    } else {
        // Within tolerance band → no change (prevents micro-oscillation)
        current
    };

    let price_direction: i8 = if new_price > current { 1 }
        else if new_price < current { -1 }
        else { 0 };

    // ── 3. Emit price update event ─────────────────────────────────────────
    emit!(PriceUpdatedEvent {
        data_type:         state.data_type,
        epoch:             new_epoch,
        old_price:         current,
        new_price,
        utilization_bps,
        supply_units:      state.supply_units,
        demand_units:      state.demand_units,
        price_direction,
        revenue_lamports:  state.revenue_lamports,
    });

    // ── 4. Roll state forward into new epoch ──────────────────────────────
    state.epoch                  = new_epoch;
    state.current_price_lamports = new_price;
    state.next_price_lamports    = new_price; // Pre-compute next after first demand arrives
    state.supply_units           = 0;         // Reset — nodes re-declare each epoch
    state.demand_units           = 0;
    state.utilization_bps        = utilization_bps;
    state.price_direction        = price_direction;
    state.revenue_lamports       = 0;

    msg!(
        "Epoch {} price: {} → {} lamports | utilization: {}% | direction: {}",
        new_epoch,
        current,
        new_price,
        utilization_bps / 100,
        if price_direction > 0 { "▲" } else if price_direction < 0 { "▼" } else { "─" }
    );

    Ok(())
}

#[event]
pub struct PriceUpdatedEvent {
    pub data_type:        [u8; 32],
    pub epoch:            u64,
    pub old_price:        u64,
    pub new_price:        u64,
    pub utilization_bps:  u16,
    pub supply_units:     u64,
    pub demand_units:     u64,
    pub price_direction:  i8,
    pub revenue_lamports: u64,
}
```

---

## Quality-Weighted Supply Aggregation

Raw node count is a bad proxy for supply — a degraded node contributing low-quality data inflates apparent supply without matching demand. The pricing oracle weights supply by node reputation score.

```rust
// programs/data_pricing_oracle/src/instructions/register_node_supply.rs

pub fn register_node_supply(
    ctx: Context<RegisterNodeSupply>,
    declared_units: u64,
    quality_score_bps: u16, // From node-reputation-system.md — 0–10000
) -> Result<()> {
    let decl = &mut ctx.accounts.node_supply_declaration;
    let state = &mut ctx.accounts.epoch_price_state;

    decl.declared_units    = declared_units;
    decl.quality_score_bps = quality_score_bps;

    // Quality-weighted contribution:
    // A node with score 5000/10000 contributes 50% of its declared units to supply
    // A node with score 10000/10000 contributes 100%
    // A node with score 2000/10000 contributes 20%
    // This prevents low-quality nodes from artificially depressing prices
    let weighted_units = (declared_units as u128)
        .saturating_mul(quality_score_bps as u128)
        .saturating_div(10_000) as u64;

    state.supply_units = state.supply_units.saturating_add(weighted_units);

    msg!(
        "Node supply registered: {} declared → {} quality-weighted (score: {}/10000)",
        declared_units, weighted_units, quality_score_bps
    );
    Ok(())
}
```

---

## TypeScript SDK — Full Client

```typescript
// sdk/data-pricing-oracle-client.ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";

export interface EpochPriceState {
  dataType:             string;
  epoch:                bigint;
  currentPriceLamports: bigint;
  nextPriceLamports:    bigint;
  supplyUnits:          bigint;
  demandUnits:          bigint;
  utilizationBps:       number;
  priceDirection:       "rising" | "falling" | "stable";
  revenueLamports:      bigint;
}

export interface PriceForecast {
  currentEpochPrice:  bigint;
  nextEpochEstimate:  bigint;
  confidence:         "HIGH" | "MEDIUM" | "LOW";
  utilizationTrend:   "INCREASING" | "DECREASING" | "STABLE";
  recommendation:     string;
}

export class DataPricingOracleClient {
  constructor(
    private connection: Connection,
    private programId:  PublicKey,
  ) {}

  /**
   * Get current price for a data type.
   * Buyers should call this before submitting a purchase instruction.
   */
  async getCurrentPrice(dataType: string): Promise<bigint> {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch-price"), Buffer.from(dataType.padEnd(32, "\0").slice(0, 32))],
      this.programId,
    );
    const info = await this.connection.getAccountInfo(pda);
    if (!info) throw new Error(`No price state for data type: ${dataType}`);
    // Offset 8 (discriminator) + 32 (data_type) + 8 (epoch) = 48
    return info.data.readBigUInt64LE(48);
  }

  /**
   * Forecast next epoch price based on current utilization trend.
   * Use this to advise buyers whether to buy now or wait.
   */
  async forecastNextPrice(dataType: string): Promise<PriceForecast> {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch-price"), Buffer.from(dataType.padEnd(32, "\0").slice(0, 32))],
      this.programId,
    );
    const info = await this.connection.getAccountInfo(pda);
    if (!info) throw new Error(`No price state for data type: ${dataType}`);

    const data = info.data;
    const currentPrice   = data.readBigUInt64LE(48);
    const nextPrice      = data.readBigUInt64LE(56);
    const supplyUnits    = data.readBigUInt64LE(64);
    const demandUnits    = data.readBigUInt64LE(72);
    const utilizationBps = data.readUInt16LE(80);
    const direction      = data.readInt8(82);

    const utilizationTrend: "INCREASING" | "DECREASING" | "STABLE" =
      direction > 0 ? "INCREASING" : direction < 0 ? "DECREASING" : "STABLE";

    // Confidence: HIGH if utilization is within 10% of 7500 target
    const gapFromTarget = Math.abs(utilizationBps - 7500);
    const confidence: "HIGH" | "MEDIUM" | "LOW" =
      gapFromTarget < 1000 ? "HIGH" : gapFromTarget < 2500 ? "MEDIUM" : "LOW";

    const recommendation =
      utilizationBps > 9000
        ? "Buy immediately — price rising fast, utilization at " + (utilizationBps/100).toFixed(0) + "%"
        : utilizationBps < 3000
        ? "Wait if possible — price falling, utilization only " + (utilizationBps/100).toFixed(0) + "%"
        : "Price stable — purchase at current price";

    return {
      currentEpochPrice:  currentPrice,
      nextEpochEstimate:  nextPrice,
      confidence,
      utilizationTrend,
      recommendation,
    };
  }

  /**
   * Get historical price series for a data type.
   * Uses Helius transaction history on the price state account.
   */
  async getPriceHistory(
    dataType:   string,
    epochCount: number = 30,
  ): Promise<Array<{ epoch: bigint; price: bigint; utilization: number }>> {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch-price"), Buffer.from(dataType.padEnd(32, "\0").slice(0, 32))],
      this.programId,
    );

    // Fetch PriceUpdatedEvent logs from transaction history
    const sigs = await this.connection.getSignaturesForAddress(pda, { limit: epochCount });
    const history: Array<{ epoch: bigint; price: bigint; utilization: number }> = [];

    for (const sig of sigs) {
      const tx = await this.connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });
      const logMessages = tx?.meta?.logMessages ?? [];
      for (const log of logMessages) {
        // Parse the msg!() output from update_epoch_price
        const match = log.match(/Epoch (\d+) price: (\d+) → (\d+) lamports \| utilization: (\d+)%/);
        if (match) {
          history.push({
            epoch:       BigInt(match[1]),
            price:       BigInt(match[3]),
            utilization: parseInt(match[4]),
          });
        }
      }
    }

    return history.sort((a, b) => Number(a.epoch) - Number(b.epoch));
  }
}
```

---

## Multi-Tier Pricing: Different Data Has Different Value

Not all data is equal. A single pricing config per data type lets you charge what each type is worth.

```typescript
// Example: three data types on a weather DePIN, each with its own price curve

const DATA_TYPES = {
  // Raw temperature readings — abundant, cheap
  "weather_temp": {
    basePriceLamports:   1_000,     // 0.000001 SOL floor
    maxPriceLamports:   50_000,     // 0.00005 SOL ceiling
    targetUtilizationBps: 8_000,    // 80% — high volume product
    adjustmentRateBps:    300,      // 3% max price change/epoch
  },
  // High-precision GPS corrections (RTCM) — scarce, premium
  "gps_rtcm_correction": {
    basePriceLamports:  10_000,     // 0.00001 SOL floor
    maxPriceLamports: 500_000,      // 0.0005 SOL ceiling
    targetUtilizationBps: 6_000,    // 60% — premium product, not commodity
    adjustmentRateBps:    700,      // 7% — faster price discovery for premium data
  },
  // Verified air quality index — regulatory grade, highest value
  "air_quality_aqi_certified": {
    basePriceLamports:  50_000,     // 0.00005 SOL floor
    maxPriceLamports: 2_000_000,    // 0.002 SOL ceiling
    targetUtilizationBps: 5_000,    // 50% — enterprise product, not commodity
    adjustmentRateBps:    500,      // 5% adjustment
  },
} as const;
```

---

## Integration with Node Reputation System

Price and quality are linked. Data from Institutional-tier nodes (score 9500+) commands a premium over data from Standard-tier nodes (score 2000–5999). Buyers can specify a minimum reputation tier, and the pricing oracle applies a quality premium automatically.

```typescript
export interface QualityPricedQuery {
  dataType:          string;
  minReputationTier: "Standard" | "Trusted" | "Elite" | "Institutional";
  units:             number;
}

export function computeQualityPremium(tier: string, basePrice: bigint): bigint {
  const premiumBps: Record<string, number> = {
    Standard:      0,      // No premium — base price
    Trusted:    1_000,     // +10% for Trusted nodes
    Elite:      2_500,     // +25% for Elite nodes
    Institutional: 5_000,  // +50% for Institutional nodes
  };
  const bps = BigInt(premiumBps[tier] ?? 0);
  return basePrice + (basePrice * bps / 10_000n);
}
```

---

## Why This Is the Missing Piece in Every DePIN Data Marketplace

```
WHAT DePIN DATA MARKETPLACES LOOK LIKE TODAY:
  ├── Fixed price set by founders at launch
  ├── Never updated (governance is slow)
  ├── Underpriced when demand spikes → protocol loses revenue
  ├── Overpriced when supply grows → buyers go elsewhere
  └── No quality differentiation → bad data priced same as good data

WHAT THIS ORACLE ENABLES:
  ├── Price self-adjusts every epoch toward market equilibrium
  ├── Supply-weighted by node reputation (quality nodes drive supply signal)
  ├── Per-data-type configs (GPS corrections priced differently than temperature)
  ├── Quality tiers command premiums (Institutional nodes earn 50% more per query)
  ├── Price forecast API (buyers know if price is rising → buy now vs wait)
  ├── Full price history via event logs (transparent, auditable)
  └── Protocol captures full value at all utilization levels — no arbitrage window

EMERGENT BEHAVIOR:
  When a region gets sparse (nodes go offline):
    → supply falls → price rises → operators in that region earn more → re-attracts operators

  When a region gets dense (many operators join):
    → supply rises → price falls → data becomes cheap → attracts more buyers → demand rises
    → price stabilizes at new equilibrium → operators still profitable, buyers happy

  This is the market mechanism DePIN has been missing.
```
