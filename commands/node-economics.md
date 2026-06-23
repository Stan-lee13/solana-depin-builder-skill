# /node-economics

Model operator ROI, design emission curves, and stress-test reward economics before committing to numbers on-chain.

## Invocation

User types: `/node-economics` or "model my node rewards" or "calculate operator ROI" or "design my emission schedule"

## Required input

```
1. Total token supply
2. % allocated to node rewards (e.g., 40%)
3. Target reward duration (years)
4. Epoch length (hours — 24h is standard)
5. Target node count at: launch / 6 months / 1 year / 3 years
6. Hardware cost per node (USD)
7. Monthly operating cost per node (electricity + internet, USD)
8. Target token launch price (USD) or FDV
9. Protocol revenue model (what do consumers pay per unit?)
10. Stake requirement per node (tokens or USD equivalent)
```

## Step 1 — Emission Schedule Calculator

```typescript
interface EmissionInput {
  total_reward_allocation: bigint;      // Total tokens for node rewards
  duration_years: number;               // How many years to distribute over
  epoch_length_hours: number;           // Standard: 24
  schedule_type: "halving" | "linear_decay" | "constant";
  halving_interval_years?: number;      // For halving: years between halvings
  decay_rate_annual_bps?: number;       // For decay: annual reduction in BPS
}

function designEmissionSchedule(input: EmissionInput): {
  epoch_emissions: bigint[];            // Emission per epoch for each year
  year_summary: Array<{
    year: number;
    annual_emission: bigint;
    cumulative_distributed_pct: number;
    inflation_rate_pct: number;
  }>;
  total_distributed: bigint;
  remaining_treasury: bigint;
} {
  const total_epochs = Math.round(
    (input.duration_years * 365 * 24) / input.epoch_length_hours
  );

  const epochs_per_year = Math.round((365 * 24) / input.epoch_length_hours);
  const year_summaries = [];
  let cumulative = BigInt(0);

  for (let year = 1; year <= input.duration_years; year++) {
    let epoch_emission: bigint;

    if (input.schedule_type === "halving") {
      const halvings = Math.floor(year / (input.halving_interval_years ?? 2));
      epoch_emission = input.total_reward_allocation / 
        (BigInt(epochs_per_year * input.duration_years) * BigInt(2 ** halvings));
    } else if (input.schedule_type === "linear_decay") {
      const annual_decay = 1 - ((input.decay_rate_annual_bps ?? 1000) / 10000);
      const year_factor = Math.pow(annual_decay, year - 1);
      epoch_emission = BigInt(
        Math.round(Number(input.total_reward_allocation) * year_factor / 
          (epochs_per_year * input.duration_years))
      );
    } else {
      epoch_emission = input.total_reward_allocation / BigInt(total_epochs);
    }

    const annual_emission = epoch_emission * BigInt(epochs_per_year);
    cumulative += annual_emission;

    year_summaries.push({
      year,
      annual_emission,
      epoch_emission,
      cumulative_distributed_pct: Number(cumulative * BigInt(10000) / input.total_reward_allocation) / 100,
    });
  }

  return { year_summaries, epoch_emissions: [], total_distributed: cumulative, remaining_treasury: input.total_reward_allocation - cumulative };
}
```

**Output this table:**

```
EMISSION SCHEDULE
═══════════════════════════════════════════════════════════
Year │ Epoch Emission │ Annual Total  │ Cumulative % │ Annual Inflation
─────┼────────────────┼───────────────┼──────────────┼────────────────
  1  │ X,XXX,XXX      │ X,XXX,XXX,XXX │ XX.X%        │ XX.X%
  2  │ X,XXX,XXX      │ X,XXX,XXX,XXX │ XX.X%        │ XX.X%
  ...
═══════════════════════════════════════════════════════════
```

## Step 2 — Operator ROI Model

```typescript
interface OperatorROIInput {
  token_price_usd: number;
  epoch_emission_tokens: number;        // From Step 1, Year 1
  network_node_count: number;
  hardware_cost_usd: number;
  monthly_opex_usd: number;            // Electricity + internet
  stake_requirement_tokens: number;
  stake_tier: 0 | 1 | 2;              // Affects reward multiplier
  coverage_quality_score: number;       // 0-1000 expected score
  geographic_bonus: number;             // 1.0 = no bonus, 2.0 = 2x bonus
}

function calculateOperatorROI(input: OperatorROIInput): void {
  const tier_multipliers = [1.0, 1.3, 1.6];
  const tier_mult = tier_multipliers[input.stake_tier];
  const quality_mult = input.coverage_quality_score / 1000;
  const effective_score = tier_mult * quality_mult * input.geographic_bonus;
  
  // Node's share of network rewards (adjusted for their score vs average)
  const market_share = (1 / input.network_node_count) * effective_score;
  const daily_tokens = input.epoch_emission_tokens * market_share;
  const daily_usd = daily_tokens * input.token_price_usd;
  const monthly_usd = daily_usd * 30;
  const monthly_net = monthly_usd - input.monthly_opex_usd;
  
  const stake_cost_usd = input.stake_requirement_tokens * input.token_price_usd;
  const total_upfront_usd = input.hardware_cost_usd + stake_cost_usd;
  
  const breakeven_months = total_upfront_usd / Math.max(monthly_net, 0.01);
  const annual_roi = (monthly_net * 12 / total_upfront_usd) * 100;

  // Print results
  console.log(`Daily earnings:    ${daily_tokens.toFixed(0)} tokens ($${daily_usd.toFixed(2)})`);
  console.log(`Monthly net:       $${monthly_net.toFixed(2)}`);
  console.log(`Total upfront:     $${total_upfront_usd.toFixed(2)}`);
  console.log(`Breakeven:         ${breakeven_months.toFixed(1)} months`);
  console.log(`Annual ROI:        ${annual_roi.toFixed(1)}%`);
}
```

**Output format:**

```
OPERATOR ROI MODEL — [Network Name]
════════════════════════════════════════════════════════
Assumptions: [token price], [node count], Tier [N], Score [N]/1000

EARNINGS:
  Daily:          XXX tokens  ($X.XX USD)
  Monthly gross:  $XX.XX
  Monthly OpEx:   -$X.XX
  Monthly net:    $XX.XX

UPFRONT COSTS:
  Hardware:       $XXX
  Stake (tokens): XXX tokens ($XXX at launch price)
  Total:          $XXX

RETURNS:
  Breakeven:      X.X months
  Annual ROI:     XX.X%

VERDICT: [ATTRACTIVE / MARGINAL / UNATTRACTIVE]
  [Why an operator would/wouldn't deploy based on these numbers]
```

## Step 3 — Sensitivity Analysis

Run automatically for all ROI models:

```
PRICE SENSITIVITY TABLE
═══════════════════════════════════════════════════════════════
Token Price │ Monthly Net │ Breakeven  │ Annual ROI │ Status
────────────┼─────────────┼────────────┼────────────┼──────────
$X.XX (1x)  │ $XXX        │ X.X months │ XXX%       │ ✅ STRONG
$X.XX (0.7x)│ $XXX        │ X.X months │ XXX%       │ ✅ OK
$X.XX (0.5x)│ $XXX        │ X.X months │ XX%        │ ⚠️ MARGINAL
$X.XX (0.3x)│ $XXX        │ X.X months │ XX%        │ ⚠️ WEAK
$X.XX (0.1x)│ ($XX)       │ Never      │ -XX%       │ ❌ LOSS
═══════════════════════════════════════════════════════════════
Network remains operator-profitable at: $X.XX minimum price
```

## Step 4 — Network Sustainability Score

```
SUSTAINABILITY METRICS
══════════════════════════════════════════════════════════════
Annual emissions (Year 1):    XXX,XXX,XXX tokens ($XXX,XXX at launch)
Protocol revenue (target):    $XX,XXX/month
Revenue coverage ratio:       XX% (target: >50% by Year 2)

SUSTAINABILITY VERDICT:
  [SELF-SUSTAINING / ON-TRACK / AT-RISK / INFLATION-DEPENDENT]

BREAK-EVEN MILESTONE:
  Month N: Protocol revenue covers 100% of node rewards
  Assumption: [revenue growth rate] per month
  Confidence: [HIGH/MEDIUM/LOW] — [reasoning]
```

## Step 5 — Anti-Gaming Economics Check

```
REWARD GAMING ANALYSIS
══════════════════════════════════════════════════════════════
Cost to fake 1 node:          $X stake + $X hardware equivalent
Expected reward per fake node: $X/month
Fake node ROI (if undetected): XXX%

RISK LEVEL:
  [LOW / MEDIUM / HIGH / CRITICAL]

If HIGH or CRITICAL:
  → Increase stake requirement to $XXX minimum
  → Add geographic verification to proof mechanism
  → Reduce max rewards per hex to limit upside of fake cluster

Stake required for deterrence (30× daily reward):
  30 × $X.XX/day = $XXX minimum stake per node
  Current stake value: $XXX
  [SUFFICIENT / INCREASE NEEDED]
```

## Common emission mistakes to flag automatically

```
FLAG if: Epoch 1 emission > 1% of total supply
  → Too much early inflation; punishes long-term holders

FLAG if: No emission floor (can reach zero)
  → Network loses all incentive to run nodes when emissions hit zero
  → Add: min_emission = protocol_revenue_per_epoch × 0.5

FLAG if: Halving interval < 6 months
  → Too aggressive; operators see income cut in half too fast → churn

FLAG if: Year 1 inflation > 30% of circulating supply
  → Severe sell pressure from operators → price dump → less operator ROI → death spiral

FLAG if: Breakeven > 24 months at launch price
  → Operators won't join; hardware is too expensive relative to rewards

FLAG if: Breakeven < 2 months at launch price
  → Attracts mercenary farmers who exit at first sign of price weakness
  → Add: earned reward vesting (3-6 months)
```
