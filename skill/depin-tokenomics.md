# DePIN Tokenomics

Token economic design for DePIN networks — reward mechanisms, burn-and-mint equilibrium, coverage-weighted emissions, anti-gaming protections, and long-term sustainability modeling. Covers the unique challenges of aligning hardware operators, data consumers, and token holders simultaneously.

## DePIN Tokenomics Is Different

```
STANDARD PROTOCOL TOKENOMICS:      DEPIN TOKENOMICS:
  ─ Users pay fees in token           ─ Operators earn tokens for hardware work
  ─ Treasury receives fees            ─ Data consumers pay in stablecoins (or token)
  ─ Buyback-and-burn optional         ─ Burn-and-mint equilibrium required
  ─ Team/investor vesting             ─ Hardware CAPEX must be recoverable via rewards
  ─ Governance rights                 ─ Coverage quality must be incentivized
                                      ─ Geographic distribution must be rewarded
                                      ─ Sybil attacks (fake nodes) must be penalized
                                      ─ Data quality must be verifiable on-chain
```

---

## Section 1: Burn-and-Mint Equilibrium (BME)

The canonical DePIN tokenomic model (pioneered by Helium).

```
BME MECHANICS:
  1. Data consumers burn tokens to buy Data Credits (DC)
  2. DC are pegged 1:1 to USD (e.g., 1 DC = $0.00001)
  3. DC are non-transferable — used only to pay for data/coverage
  4. Operators earn tokens emitted from the reward pool
  5. Equilibrium: burn rate = emission rate → stable token supply

BME SIMULATION:
  If burn_rate > emission_rate → net deflationary → price appreciation → more operators
  If burn_rate < emission_rate → net inflationary → price dilution → operators exit
  Sustainable equilibrium requires sufficient real data demand
```

```python
#!/usr/bin/env python3
# scripts/simulate_depin_tokenomics.py
# Run: python3 scripts/simulate_depin_tokenomics.py

import math
from dataclasses import dataclass
from typing import List

@dataclass
class DePINConfig:
    # Supply
    total_supply: int = 250_000_000          # 250M tokens
    initial_circulating: int = 25_000_000   # 10% at TGE
    
    # Emissions
    monthly_emission_pct: float = 0.015     # 1.5% of remaining supply/month
    emission_decay_pct: float = 0.002       # Emission halves approx every 2 years
    
    # Network
    initial_nodes: int = 500
    monthly_node_growth_pct: float = 0.08   # 8% monthly node growth
    target_nodes: int = 100_000             # Growth plateau
    
    # Economics
    monthly_data_revenue_usd: float = 50_000  # USD paid by data consumers
    dc_price_usd: float = 0.00001             # 1 DC = $0.00001
    token_price_usd: float = 1.0
    
    # Hardware
    hardware_cost_usd: float = 300.0          # One-time CAPEX per node
    monthly_opex_usd: float = 10.0            # Power + connectivity per node/month
    target_payback_months: int = 18           # Desired payback period

@dataclass
class MonthResult:
    month: int
    nodes: int
    circulating_supply: int
    monthly_emission: float
    monthly_burn: float
    net_emission: float
    token_price_usd: float
    reward_per_node_usd: float
    payback_months: float
    network_sustainable: bool

def simulate_depin(config: DePINConfig, months: int = 48) -> List[MonthResult]:
    circulating = config.initial_circulating
    remaining_supply = config.total_supply - circulating
    nodes = config.initial_nodes
    token_price = config.token_price_usd
    results = []

    for month in range(1, months + 1):
        # ── Node growth (logistic curve — S-curve, not exponential forever) ──
        growth_rate = config.monthly_node_growth_pct * (1 - nodes / config.target_nodes)
        nodes = min(int(nodes * (1 + max(0, growth_rate))), config.target_nodes)

        # ── Emissions ──────────────────────────────────────────────────────
        # Emission decays over time (Helium-style halving approximation)
        decay_factor = (1 - config.emission_decay_pct) ** month
        monthly_emission = remaining_supply * config.monthly_emission_pct * decay_factor
        remaining_supply -= monthly_emission
        circulating += monthly_emission

        # ── Burn (data revenue → DC → token burn) ─────────────────────────
        # Data revenue grows with network size (more nodes → more coverage → more consumers)
        coverage_factor = math.log10(max(nodes / config.initial_nodes, 1) + 1)
        actual_revenue = config.monthly_data_revenue_usd * coverage_factor
        tokens_burned = actual_revenue / token_price
        circulating -= tokens_burned

        # ── Token price (simplified: supply/demand pressure) ───────────────
        net_emission = monthly_emission - tokens_burned
        supply_pressure = net_emission / circulating  # Positive = inflation pressure
        token_price = token_price * (1 - supply_pressure * 0.1)  # Price adjusts 10% of pressure
        token_price = max(token_price, 0.001)  # Floor price

        # ── Operator economics ─────────────────────────────────────────────
        reward_per_node_tokens = monthly_emission / nodes if nodes > 0 else 0
        reward_per_node_usd = reward_per_node_tokens * token_price
        
        # Payback = CAPEX / (monthly reward - monthly opex)
        monthly_net = reward_per_node_usd - config.monthly_opex_usd
        payback_months = (config.hardware_cost_usd / monthly_net) if monthly_net > 0 else float('inf')
        
        # Network is sustainable if operators can break even within target period
        network_sustainable = (
            payback_months <= config.target_payback_months and
            monthly_net > 0 and
            tokens_burned > 0  # At least some real demand
        )

        results.append(MonthResult(
            month=month,
            nodes=nodes,
            circulating_supply=int(circulating),
            monthly_emission=round(monthly_emission, 0),
            monthly_burn=round(tokens_burned, 0),
            net_emission=round(net_emission, 0),
            token_price_usd=round(token_price, 4),
            reward_per_node_usd=round(reward_per_node_usd, 2),
            payback_months=round(payback_months, 1),
            network_sustainable=network_sustainable,
        ))

    return results

def print_report(results: List[MonthResult], config: DePINConfig) -> None:
    print(f"\n{'='*75}")
    print(f"DePIN TOKENOMICS SIMULATION — {config.total_supply:,} token supply")
    print(f"{'='*75}")
    print(f"{'Mo':>3} {'Nodes':>7} {'Circ Supply':>13} {'Emission':>10} {'Burn':>10} "
          f"{'Net':>10} {'Price':>7} {'$/Node/Mo':>10} {'Payback':>8} {'OK':>4}")
    print("-"*75)
    
    for r in results:
        if r.month % 6 == 0 or r.month <= 3:  # Print every 6 months + first 3
            ok = "✅" if r.network_sustainable else "❌"
            payback_str = f"{r.payback_months:.0f}mo" if r.payback_months < 999 else "∞"
            print(f"{r.month:>3} {r.nodes:>7,} {r.circulating_supply:>13,} "
                  f"{r.monthly_emission:>10,.0f} {r.monthly_burn:>10,.0f} "
                  f"{r.net_emission:>10,.0f} {r.token_price_usd:>7.4f} "
                  f"{r.reward_per_node_usd:>10.2f} {payback_str:>8} {ok:>4}")
    
    # Death spiral early warning
    last = results[-1]
    if last.payback_months > config.target_payback_months * 2:
        print(f"\n⚠️  DEATH SPIRAL RISK: Month {last.month} payback = {last.payback_months:.0f} months")
        print("   Recommendation: Increase data consumer revenue or reduce emission rate")
    
    sustainable_months = sum(1 for r in results if r.network_sustainable)
    print(f"\nSustainable months: {sustainable_months}/{len(results)} "
          f"({sustainable_months/len(results)*100:.0f}%)")

if __name__ == "__main__":
    config = DePINConfig()
    results = simulate_depin(config, months=48)
    print_report(results, config)
```

---

## Section 2: Coverage-Weighted Emissions

The critical design challenge: rewarding geographic diversity without enabling Sybil attacks.

```rust
// programs/depin_rewards/src/instructions/distribute_rewards.rs

use anchor_lang::prelude::*;
use crate::state::{NodeAccount, RewardEpoch, CoverageMap};

/// Coverage weight calculation
/// Rewards nodes in underserved areas more than nodes in saturated areas
/// H3 hex resolution 7 (~5km² cells) is the recommended base unit
pub fn calculate_coverage_weight(
    node_location: &[u8; 32],  // H3 cell ID
    coverage_map: &CoverageMap,
) -> u64 {
    let cell_node_count = coverage_map.nodes_in_cell(node_location);
    
    // Diminishing returns: 1st node in cell = 100 weight
    //                       2nd node = 50 weight, 3rd = 33, 4th = 25...
    // This incentivizes geographic expansion over clustering
    let base_weight: u64 = 10_000; // Basis points
    
    match cell_node_count {
        0 => base_weight,       // Shouldn't happen (this node is registering)
        1 => base_weight,       // First node — full weight
        n => base_weight / n as u64, // nth node — 1/n weight
    }
}

/// Quality multipliers applied on top of coverage weight
pub fn calculate_quality_multiplier(
    uptime_bps: u64,            // 0-10000 (10000 = 100% uptime)
    data_accuracy_score: u64,   // 0-10000 (from oracle verification)
    response_time_ms: u64,      // Average response time to data requests
) -> u64 {
    // Uptime multiplier: 100% uptime = 1.2x; 95% = 1.0x; 90% = 0.8x; <80% = 0.5x
    let uptime_multiplier = match uptime_bps {
        9_900..=10_000 => 12_000, // > 99%
        9_500..=9_899  => 10_000, // 95-99%
        9_000..=9_499  =>  8_000, // 90-95%
        8_000..=8_999  =>  5_000, // 80-90%
        _ =>               2_000, // < 80% — severe penalty
    };
    
    // Data accuracy multiplier: verified data = 1.1x; unverified = 0.7x
    let accuracy_multiplier = if data_accuracy_score >= 9_000 {
        11_000
    } else if data_accuracy_score >= 7_000 {
        10_000
    } else {
        7_000
    };
    
    // Response time multiplier: < 500ms = 1.1x; < 2s = 1.0x; > 5s = 0.8x
    let latency_multiplier = match response_time_ms {
        0..=500    => 11_000,
        501..=2000 => 10_000,
        _          =>  8_000,
    };
    
    // Combined: (uptime × accuracy × latency) / 10000^2
    (uptime_multiplier as u128)
        .saturating_mul(accuracy_multiplier as u128)
        .saturating_mul(latency_multiplier as u128)
        .saturating_div(10_000 * 10_000)
        as u64
}

pub fn distribute_epoch_rewards(ctx: Context<DistributeRewards>) -> Result<()> {
    let epoch = &ctx.accounts.reward_epoch;
    let total_emission = epoch.total_emission_tokens;
    
    // Step 1: Calculate each node's weighted share
    let mut total_weight: u128 = 0;
    let mut node_weights: Vec<(Pubkey, u128)> = Vec::new();
    
    for node_key in &epoch.eligible_nodes {
        let node = ctx.accounts.get_node(node_key)?;
        
        let coverage_weight = calculate_coverage_weight(
            &node.location_hash,
            &ctx.accounts.coverage_map,
        );
        
        let quality_multiplier = calculate_quality_multiplier(
            node.uptime_bps,
            node.data_accuracy_score,
            node.avg_response_time_ms,
        );
        
        let final_weight = (coverage_weight as u128)
            .saturating_mul(quality_multiplier as u128)
            .saturating_div(10_000);
        
        total_weight = total_weight.saturating_add(final_weight);
        node_weights.push((*node_key, final_weight));
    }
    
    // Step 2: Distribute proportionally
    for (node_key, weight) in &node_weights {
        let reward = (total_emission as u128)
            .saturating_mul(*weight)
            .saturating_div(total_weight.max(1)) as u64;
        
        // Transfer reward tokens to node operator
        transfer_reward(&ctx, node_key, reward)?;
    }
    
    emit!(RewardsDistributed {
        epoch: epoch.epoch_number,
        total_emission,
        nodes_rewarded: node_weights.len() as u32,
        total_weight_bps: total_weight as u64,
    });
    
    Ok(())
}
```

---

## Section 3: Anti-Gaming Protections

```
ATTACK VECTORS AND MITIGATIONS:

1. LOCATION SPOOFING (most common):
   Attack: Operator registers node at high-value location, actually deploys elsewhere
   Mitigation: 
     ─ Require GPS attestation signed by SE at data submission time (not just registration)
     ─ Cross-reference reported location with actual RF coverage data
     ─ Community challenge mechanism: any operator can challenge another's location
     ─ Stake slashing on proven location fraud

2. SYBIL NODES (second most common):
   Attack: Operator runs software-simulated nodes (no real hardware)
   Mitigation:
     ─ Hardware attestation via SE (see hardware-supply-chain.md)
     ─ Stake requirement per node (economic cost to spam)
     ─ Sensor data plausibility checks (simulated data has detectable patterns)
     ─ Serial number uniqueness on-chain

3. DATA FABRICATION:
   Attack: Real hardware submitting fake sensor readings to earn rewards
   Mitigation:
     ─ Cross-node validation: readings from nearby nodes should correlate
     ─ Oracle verification: third-party data source comparison
     ─ Statistical anomaly detection (see hardware-supply-chain.md § 3)
     ─ Stake slashing on proven data fraud

4. REWARD GAMING (timing attacks):
   Attack: Operator activates node just before epoch snapshot, earns full epoch reward
   Mitigation:
     ─ Pro-rata rewards: earn proportional to time active in epoch
     ─ Minimum uptime threshold per epoch (e.g., 80% minimum to earn)
     ─ Cooldown period on new node activation (first epoch = reduced reward)
```

---

## Section 4: Token Allocation for DePIN

```
RECOMMENDED ALLOCATION (DePIN-specific):

  Rewards Pool:        55%  ─ The largest single bucket — operators must see long runway
  Treasury:            15%  ─ Protocol development + ecosystem grants
  Team:                12%  ─ Lower than standard (operators are the "team")
  Investors:            8%  ─ Lower than standard — hardware subsidies compete
  Ecosystem/Partners:   5%  ─ Hardware manufacturer partnerships, coverage incentives
  Liquidity:            5%  ─ DEX seeding + market maker

VESTING SCHEDULE:
  Team: 12-month cliff + 48-month linear (longer than software — hardware is a 5yr bet)
  Investors: 6-month cliff + 36-month linear
  Ecosystem: 24-month linear (aligned with network buildout phase)
  Rewards Pool: Released via emission schedule (never cliff — operators need continuous income)

REWARDS POOL EMISSION:
  Year 1: 20% of rewards pool (aggressive growth phase — attract first operators)
  Year 2: 15% of rewards pool (established network — reduce dilution)
  Year 3: 12% of remaining (shifting toward burn-funded rewards)
  Year 4+: Governed by DAO vote + automatic halving every 2 years
  
  Target: By Year 4, data consumer burns should cover ≥ 50% of operator rewards
  (This is the transition from "growth subsidy" to "self-sustaining network")
```

---

## Section 5: Hardware Subsidy Economics

```
THE CHICKEN-AND-EGG PROBLEM:
  ─ No nodes → no coverage → no data consumers → no revenue → no rewards → no nodes
  
  SOLUTION: Aggressive Year 1 subsidies that front-load operator ROI
  
HARDWARE SUBSIDY MODELS:

  Model A — Token Loan:
    Protocol lends operators tokens upfront (equivalent to hardware cost)
    Operator repays from future rewards (no interest for first 6 months)
    Risk: Operators may abandon nodes before repayment

  Model B — Coverage Bounties:
    Protocol pays extra tokens for deploying in specific H3 cells
    Example: 3x normal rewards for cells with zero coverage
    Risk: Operators game bounties by deploying temporarily

  Model C — Hardware Marketplace:
    Protocol sells certified hardware at cost (no markup)
    Subsidized by treasury in Year 1
    Risk: Supply chain complexity for protocol team

  Model D — Revenue Share Guarantee:
    Protocol guarantees minimum USD revenue for first 12 months
    If actual revenue < guarantee, treasury pays the difference
    Risk: Expensive if network grows faster than demand

RECOMMENDED: Model A + B combined
  ─ Token loan for hardware cost (6 months, no interest) — reduces operator barrier
  ─ Coverage bounties for underserved H3 cells — drives geographic distribution
  ─ Both mechanisms can be implemented as smart contracts (fully on-chain)
```

---

## Section 6: Death Spiral Early Warning System

```typescript
// Monitor these signals weekly — escalate if multiple trigger simultaneously

interface DePINHealthMetrics {
  // Supply/demand
  weeklyBurnRate: number;       // Tokens burned by data consumers
  weeklyEmissionRate: number;   // Tokens emitted to operators
  burnToEmitRatio: number;      // Target: > 0.5 (at least 50% covered by demand)
  
  // Operator health
  activeNodes: number;
  weeklyNodeChurn: number;      // Nodes that went offline this week
  newNodeRegistrations: number; // Nodes registered this week
  avgPaybackMonths: number;     // At current token price, how long to break even
  
  // Price health
  tokenPriceUsd: number;
  priceChange7d: number;        // Percentage change
  priceChange30d: number;
}

const DEATH_SPIRAL_THRESHOLDS = {
  // Individual thresholds
  burnToEmitRatioCritical: 0.2,   // < 20% covered by demand = serious
  nodeChurnPctCritical: 0.05,     // > 5% weekly node loss
  paybackMonthsCritical: 36,      // > 36 months payback = operators exit
  priceDropCritical: -0.30,       // > 30% drop in 30d = panic
  
  // Combined: 2+ of these triggers = SPIRAL state
  combinedTriggerCount: 2,
};

function assessSpiralRisk(metrics: DePINHealthMetrics): {
  riskLevel: "SAFE" | "WATCH" | "WARNING" | "SPIRAL";
  triggeredConditions: string[];
  recommendation: string;
} {
  const triggered: string[] = [];
  
  if (metrics.burnToEmitRatio < DEATH_SPIRAL_THRESHOLDS.burnToEmitRatioCritical) {
    triggered.push(`Burn/emit ratio critical: ${(metrics.burnToEmitRatio * 100).toFixed(1)}% (threshold: 20%)`);
  }
  if (metrics.weeklyNodeChurn / metrics.activeNodes > DEATH_SPIRAL_THRESHOLDS.nodeChurnPctCritical) {
    triggered.push(`Node churn critical: ${(metrics.weeklyNodeChurn / metrics.activeNodes * 100).toFixed(1)}%/week`);
  }
  if (metrics.avgPaybackMonths > DEATH_SPIRAL_THRESHOLDS.paybackMonthsCritical) {
    triggered.push(`Payback period critical: ${metrics.avgPaybackMonths.toFixed(0)} months`);
  }
  if (metrics.priceChange30d < DEATH_SPIRAL_THRESHOLDS.priceDropCritical) {
    triggered.push(`Price drop critical: ${(metrics.priceChange30d * 100).toFixed(1)}% in 30d`);
  }
  
  const riskLevel =
    triggered.length === 0          ? "SAFE" :
    triggered.length === 1          ? "WATCH" :
    triggered.length >= DEATH_SPIRAL_THRESHOLDS.combinedTriggerCount ? "SPIRAL" :
    "WARNING";
  
  const recommendation =
    riskLevel === "SPIRAL"
      ? "EMERGENCY: Activate SPIRAL response — increase coverage bounties, pause emission decay, emergency DAO vote on treasury buyback"
    : riskLevel === "WARNING"
      ? "ESCALATE: Present metrics to core team — prepare contingency plans for burn rate increase"
    : riskLevel === "WATCH"
      ? "MONITOR: Review in 7 days — no action yet but track the triggering condition"
    : "All systems nominal";
  
  return { riskLevel, triggeredConditions: triggered, recommendation };
}
```
