# Node Reputation System

Binary node status — active or inactive — is the most naive model a DePIN can implement. Real networks have nodes that are technically online but contributing low-quality data, or nodes that were excellent last month and are degrading this month. A reputation system turns node quality from a point-in-time check into a continuous, on-chain track record that compounds over time.

## Why Reputation Changes Everything

```
BINARY STATUS MODEL:            REPUTATION MODEL:
  Node registered                 Node has reputation score 0–10,000
  Node submits proof              Proof quality updates score (Bayesian update)
  Reward = fixed per proof        Reward = f(score) — elite nodes earn 3× base
  Node goes rogue                 Score decay detects degradation before Sybil flag
  Slash (binary, irreversible)    Graduated response: reduce rewards → warn → slash
  Operator loses everything       Operator sees degradation and fixes it

EMERGENT BEHAVIOR:
  High-reputation nodes become economically valuable assets
  Operators maintain hardware because score is their equity
  Buyers can select data from high-reputation nodes only
  Insurance premiums decrease for high-rep node clusters
```

---

## On-Chain Reputation Account

```rust
// programs/depin_reputation/src/state.rs

use anchor_lang::prelude::*;

/// Sliding-window Bayesian reputation score
/// Updated every epoch — never reset except via governance slash
#[account]
#[derive(InitSpace)]
pub struct NodeReputation {
    pub node:               Pubkey,
    pub operator:           Pubkey,
    pub score:              u32,     // 0–10,000 (BPS: 10000 = perfect)
    pub confidence:         u16,     // 0–1000 — how confident we are in the score
                                     // Confidence grows with observation history
    pub epoch_samples:      u32,     // Total epochs with valid data
    pub consecutive_good:   u16,     // Streak of above-threshold epochs
    pub consecutive_bad:    u16,     // Streak of below-threshold epochs
    pub last_update_epoch:  u64,
    pub tier:               ReputationTier,
    pub decay_paused:       bool,    // True during verified hardware failure (grace period)
    pub bump:               u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug, InitSpace)]
pub enum ReputationTier {
    /// < 2000: New node or severely degraded. Reduced rewards, increased monitoring.
    Probation,
    /// 2000–5999: Normal operation. Standard rewards.
    Standard,
    /// 6000–8499: Consistently reliable. 1.25× reward multiplier. SLA-eligible.
    Trusted,
    /// 8500–9499: Elite operator. 1.75× multiplier. Preferred in high-value coverage auctions.
    Elite,
    /// 9500–10000: Institutional grade. 3× multiplier. Priority in data marketplace.
    Institutional,
}
```

---

## Bayesian Score Update

```rust
// programs/depin_reputation/src/instructions/update_reputation.rs

pub struct EpochObservation {
    pub uptime_bps:           u16,  // 0–10000 (actual uptime this epoch)
    pub data_accuracy_bps:    u16,  // 0–10000 (oracle-verified accuracy)
    pub response_latency_ms:  u32,  // Average response time to data requests
    pub proof_quality:        u16,  // 0–10000 (did proof meet all requirements)
    pub geographic_stability: u16,  // 0–10000 (location consistent with registration)
}

/// Compute epoch score from observation
fn compute_epoch_score(obs: &EpochObservation) -> u32 {
    // Weighted average — data accuracy and proof quality matter most
    let weighted = (obs.uptime_bps as u32 * 20)           // 20%
        + (obs.data_accuracy_bps as u32 * 30)             // 30%
        + (obs.response_latency_score(obs.response_latency_ms) * 20) // 20%
        + (obs.proof_quality as u32 * 25)                 // 25%
        + (obs.geographic_stability as u32 * 5);          // 5%

    weighted / 100 // Normalize to 0–10000
}

fn response_latency_score(ms: u32) -> u32 {
    match ms {
        0..=300    => 10_000,
        301..=1000 => 8_000,
        1001..=3000 => 5_000,
        _           => 2_000,
    }
}

/// Bayesian update: blend epoch score into running average
/// with increasing confidence as observations accumulate
pub fn bayesian_update_score(
    current_score: u32,
    current_confidence: u16,   // 0–1000
    epoch_score: u32,
    epoch_samples: u32,
) -> (u32, u16) {
    // Weight of new observation decreases as confidence grows
    // New node (low confidence): epoch_weight = 0.5 (fast adaptation)
    // Mature node (high confidence): epoch_weight = 0.05 (stable, hard to game)
    let confidence_ratio = current_confidence as f64 / 1000.0; // 0.0–1.0
    let epoch_weight = 0.5 * (1.0 - confidence_ratio) + 0.05 * confidence_ratio;
    let history_weight = 1.0 - epoch_weight;

    let new_score = (current_score as f64 * history_weight
        + epoch_score as f64 * epoch_weight) as u32;

    // Confidence grows slowly — takes ~100 epochs to reach full confidence
    let new_confidence = std::cmp::min(
        current_confidence + (10 - (epoch_samples / 10).min(9) as u16),
        1000,
    );

    (new_score, new_confidence)
}

pub fn update_node_reputation(
    ctx: Context<UpdateReputation>,
    obs: EpochObservation,
    epoch: u64,
) -> Result<()> {
    let rep = &mut ctx.accounts.node_reputation;

    let epoch_score = compute_epoch_score(&obs);

    // Bayesian update
    let (new_score, new_confidence) = bayesian_update_score(
        rep.score, rep.confidence, epoch_score, rep.epoch_samples,
    );

    // Streak tracking
    if epoch_score >= 7_000 {
        rep.consecutive_good = rep.consecutive_good.saturating_add(1);
        rep.consecutive_bad = 0;
    } else if epoch_score < 4_000 {
        rep.consecutive_bad = rep.consecutive_bad.saturating_add(1);
        rep.consecutive_good = 0;
    }

    // Score decay for inactive nodes (grace period of 2 epochs)
    if epoch > rep.last_update_epoch + 2 && !rep.decay_paused {
        let missed_epochs = (epoch - rep.last_update_epoch - 2) as u32;
        let decay = missed_epochs * 100; // 1% per missed epoch after grace
        rep.score = rep.score.saturating_sub(decay);
    }

    rep.score = new_score;
    rep.confidence = new_confidence;
    rep.epoch_samples = rep.epoch_samples.saturating_add(1);
    rep.last_update_epoch = epoch;

    // Update tier
    rep.tier = match new_score {
        9_500..=10_000 => ReputationTier::Institutional,
        8_500..=9_499  => ReputationTier::Elite,
        6_000..=8_499  => ReputationTier::Trusted,
        2_000..=5_999  => ReputationTier::Standard,
        _              => ReputationTier::Probation,
    };

    emit!(ReputationUpdated {
        node: rep.node,
        epoch,
        old_score: rep.score,
        new_score,
        new_tier: rep.tier.clone(),
        epoch_score,
    });

    Ok(())
}
```

---

## Reputation-Weighted Reward Multiplier

```rust
// In the reward distribution instruction:

pub fn get_reward_multiplier(tier: &ReputationTier) -> u64 {
    match tier {
        ReputationTier::Probation     =>  5_000,  // 0.5× — disincentivizes low quality
        ReputationTier::Standard      => 10_000,  // 1.0× — baseline
        ReputationTier::Trusted       => 12_500,  // 1.25× — reliability premium
        ReputationTier::Elite         => 17_500,  // 1.75× — significant premium
        ReputationTier::Institutional => 30_000,  // 3.0× — institutional grade
    }
}

pub fn compute_reputation_weighted_reward(
    base_reward: u64,
    tier: &ReputationTier,
) -> u64 {
    (base_reward as u128)
        .saturating_mul(get_reward_multiplier(tier) as u128)
        .saturating_div(10_000)
        as u64
}
```

---

## Reputation as a Tradeable Asset

```typescript
// The most innovative aspect: reputation scores can be used in the data marketplace
// High-reputation nodes get preferential pricing and access to premium data contracts

export interface ReputationProfile {
  nodeId:            string;
  score:             number;  // 0–10000
  confidence:        number;  // 0–1000
  tier:              "Probation" | "Standard" | "Trusted" | "Elite" | "Institutional";
  epochSamples:      number;  // Total observation epochs
  consecutiveGood:   number;
  consecutiveBad:    number;
  rewardMultiplier:  number;  // Current epoch multiplier (e.g., 1.75)
  slaEligible:       boolean; // Trusted+ required for SLA contracts
  dataMarketAccess:  "None" | "Standard" | "Premium" | "Institutional";
}

// Data consumers can filter by minimum reputation tier
export interface DataQuery {
  h3Cells:          string[];
  minReputationTier: "Standard" | "Trusted" | "Elite" | "Institutional";
  // Only data from nodes meeting minReputationTier is returned
  // Premium query rates for higher-tier-only data
}
```

---

## Graduated Response System

```
AUTOMATED RESPONSE TO REPUTATION SIGNALS:

  score drops below 5,000 (3 consecutive bad epochs):
    → reward_multiplier drops to 0.5×
    → operator receives automated warning: "Your node performance has degraded"
    → monitoring cadence increases (more frequent proof requirements)

  score drops below 2,000 (Probation):
    → node excluded from SLA contracts
    → operator receives final warning: "Restore within 5 epochs or face stake slash"

  consecutive_bad ≥ 10:
    → automatic stake slash (partial, not full)
    → partial slash event emitted → ecosystem-signals.md → Incident Response notified
    → operator can appeal via governance vote within 7 days

  consecutive_bad ≥ 20 OR score = 0:
    → full stake slash
    → node deregistered
    → serial number blacklisted (cannot re-register same hardware)

GRACE PERIOD:
  If operator submits a verified hardware failure report (signed by tech-docs-writer agent):
    → decay_paused = true for up to 14 epochs
    → Score frozen during maintenance window
    → Resumes from frozen score when node returns online
    → Prevents unfair punishment for legitimate hardware issues
```
