# Adaptive Proof Engine

Most DePIN protocols pick one proof mechanism at launch and live with it forever. This is the wrong abstraction. Physical infrastructure networks face conditions that change over time: node density in a cell grows, geographic coverage shifts, oracle reliability fluctuates, and adversarial pressure evolves. A proof mechanism that was optimal at 500 nodes becomes gameable at 50,000.

The Adaptive Proof Engine is a meta-layer that switches proof strategies automatically based on network state — without requiring a governance vote or protocol upgrade for each transition.

## The Core Insight

```
STATIC PROOF:                       ADAPTIVE PROOF:
  Pick PoL at launch                  PoL at low density (< 3 nodes/cell)
  Scale to 50K nodes                  PoL + witness consensus (3–10 nodes/cell)
  PoL becomes gameable at scale       Cryptographic challenge (> 10 nodes/cell)
  Governance vote to change           Switch happens automatically at threshold
  6-month delay → attackers profit    Attackers cannot predict which mode fires
```

---

## Architecture

```rust
// programs/adaptive_proof/src/state.rs

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum ProofStrategy {
    /// Low-density cells: single-node heartbeat with GPS attestation
    /// Used when: cell has < MIN_WITNESS_THRESHOLD nodes
    SimpleHeartbeat,

    /// Medium-density cells: multi-witness beacon/response
    /// Used when: cell has MIN_WITNESS_THRESHOLD..MAX_WITNESS_THRESHOLD nodes
    WitnessConsensus { min_witnesses: u8 },

    /// High-density cells: VRF-selected challenge with cryptographic response
    /// Used when: cell has > MAX_WITNESS_THRESHOLD nodes
    /// Attackers cannot predict which node gets challenged
    VrfChallenge { vrf_account: Pubkey },

    /// Compute networks: TEE attestation (no geographic component)
    TeeAttestation { enclave_type: EnclaveType },

    /// Degraded mode: fallback when primary proof infrastructure fails
    /// Reduced rewards — incentivizes restoration of primary mode
    DegradedHeartbeat { reward_multiplier_bps: u16 },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum EnclaveType {
    IntelTdx,
    AmdSev,
    MarlinOyster,
}

#[account]
pub struct NetworkProofConfig {
    pub authority:               Pubkey,
    pub min_witness_threshold:   u8,    // Nodes per H3 cell to activate WitnessConsensus
    pub max_witness_threshold:   u8,    // Nodes per H3 cell to activate VrfChallenge
    pub challenge_window_secs:   i64,   // How long a VRF challenge stays open
    pub degraded_mode_active:    bool,  // True when oracle/VRF infra is down
    pub bump:                    u8,
}

#[account]
pub struct CellProofState {
    pub h3_cell:          [u8; 8],   // H3 cell ID (resolution 7)
    pub active_nodes:     u16,       // Current registered nodes in this cell
    pub current_strategy: ProofStrategy,
    pub last_strategy_change_slot: u64,
    pub bump:             u8,
}
```

---

## Strategy Selection Engine

```rust
// programs/adaptive_proof/src/instructions/select_strategy.rs

pub fn select_proof_strategy(
    ctx: Context<SelectStrategy>,
    h3_cell: [u8; 8],
) -> Result<ProofStrategy> {
    let config = &ctx.accounts.network_config;
    let cell_state = &mut ctx.accounts.cell_proof_state;
    let node_count = cell_state.active_nodes;

    // Degraded mode override — always check first
    if config.degraded_mode_active {
        let new_strategy = ProofStrategy::DegradedHeartbeat {
            reward_multiplier_bps: 3_000, // 30% of normal rewards in degraded mode
        };
        update_strategy_if_changed(cell_state, new_strategy.clone())?;
        return Ok(new_strategy);
    }

    let new_strategy = if node_count < config.min_witness_threshold as u16 {
        ProofStrategy::SimpleHeartbeat

    } else if node_count <= config.max_witness_threshold as u16 {
        let min_witnesses = std::cmp::min(
            (node_count / 3) as u8, // 1/3 of nodes must witness
            7u8,                    // Cap at 7 witnesses (diminishing security return)
        );
        ProofStrategy::WitnessConsensus { min_witnesses }

    } else {
        // High density — use VRF to prevent predictable targeting
        ProofStrategy::VrfChallenge {
            vrf_account: ctx.accounts.switchboard_vrf.key(),
        }
    };

    update_strategy_if_changed(cell_state, new_strategy.clone())?;
    Ok(new_strategy)
}

fn update_strategy_if_changed(
    cell_state: &mut Account<CellProofState>,
    new_strategy: ProofStrategy,
) -> Result<()> {
    if cell_state.current_strategy != new_strategy {
        let slot = Clock::get()?.slot;
        msg!(
            "Strategy changed in cell {:?}: {:?} → {:?} at slot {}",
            cell_state.h3_cell,
            cell_state.current_strategy,
            new_strategy,
            slot
        );
        cell_state.current_strategy = new_strategy;
        cell_state.last_strategy_change_slot = slot;
    }
    Ok(())
}
```

---

## TypeScript SDK Integration

```typescript
// sdk/adaptive-proof-client.ts
import { Connection, PublicKey } from "@solana/web3.js";

export type ProofStrategy =
  | { type: "SimpleHeartbeat" }
  | { type: "WitnessConsensus"; minWitnesses: number }
  | { type: "VrfChallenge"; vrfAccount: PublicKey }
  | { type: "TeeAttestation"; enclaveType: "IntelTdx" | "AmdSev" | "MarlinOyster" }
  | { type: "DegradedHeartbeat"; rewardMultiplierBps: number };

export class AdaptiveProofClient {
  constructor(
    private connection: Connection,
    private programId: PublicKey,
    private heliusApiKey: string,
  ) {}

  /**
   * Get the current required proof strategy for a device's H3 cell.
   * Devices MUST submit proof in the format this returns.
   * Submitting the wrong format results in rejected proof + no reward.
   */
  async getCurrentStrategy(h3Cell: string): Promise<ProofStrategy> {
    const [cellStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("cell-proof"), Buffer.from(h3Cell)],
      this.programId,
    );

    const accountInfo = await this.connection.getAccountInfo(cellStatePda);
    if (!accountInfo) {
      // Cell not yet initialized → default to SimpleHeartbeat
      return { type: "SimpleHeartbeat" };
    }

    return this.deserializeStrategy(accountInfo.data);
  }

  /**
   * Build the proof payload the device should sign and submit.
   * Strategy-aware — returns the correct format automatically.
   */
  async buildProofPayload(
    deviceId: string,
    h3Cell: string,
    options: {
      gpsCoords?: { lat: number; lng: number };
      witnessSignatures?: Array<{ deviceId: string; signature: Uint8Array }>;
      vrfProof?: Uint8Array;
      teeAttestation?: Uint8Array;
    },
  ): Promise<{ strategy: ProofStrategy; payload: Uint8Array }> {
    const strategy = await this.getCurrentStrategy(h3Cell);

    switch (strategy.type) {
      case "SimpleHeartbeat": {
        if (!options.gpsCoords) throw new Error("GPS coordinates required for SimpleHeartbeat");
        return { strategy, payload: this.buildHeartbeatPayload(deviceId, options.gpsCoords) };
      }
      case "WitnessConsensus": {
        if (!options.witnessSignatures || options.witnessSignatures.length < strategy.minWitnesses) {
          throw new Error(
            `WitnessConsensus requires ${strategy.minWitnesses} witnesses, got ${options.witnessSignatures?.length ?? 0}`
          );
        }
        return { strategy, payload: this.buildWitnessPayload(deviceId, options.witnessSignatures) };
      }
      case "VrfChallenge": {
        if (!options.vrfProof) throw new Error("VRF proof required for VrfChallenge mode");
        return { strategy, payload: this.buildVrfPayload(deviceId, options.vrfProof) };
      }
      case "DegradedHeartbeat": {
        // Same as SimpleHeartbeat but marks reduced reward expectation
        if (!options.gpsCoords) throw new Error("GPS coordinates required for DegradedHeartbeat");
        return { strategy, payload: this.buildHeartbeatPayload(deviceId, options.gpsCoords) };
      }
      default:
        throw new Error(`Unknown strategy type: ${(strategy as any).type}`);
    }
  }

  private buildHeartbeatPayload(deviceId: string, gps: { lat: number; lng: number }): Uint8Array {
    // Encode: [deviceId (32 bytes)] [lat (4 bytes f32)] [lng (4 bytes f32)] [timestamp (8 bytes i64)]
    const buf = Buffer.alloc(48);
    Buffer.from(deviceId.padEnd(32, "\0").slice(0, 32)).copy(buf, 0);
    buf.writeFloatLE(gps.lat, 32);
    buf.writeFloatLE(gps.lng, 36);
    buf.writeBigInt64LE(BigInt(Math.floor(Date.now() / 1000)), 40);
    return buf;
  }

  private buildWitnessPayload(
    deviceId: string,
    witnesses: Array<{ deviceId: string; signature: Uint8Array }>,
  ): Uint8Array {
    // Pack: [deviceId (32)] [witness_count (1)] [witness_id × N (32 each)] [witness_sig × N (64 each)]
    const buf = Buffer.alloc(32 + 1 + witnesses.length * (32 + 64));
    let offset = 0;
    Buffer.from(deviceId.padEnd(32, "\0").slice(0, 32)).copy(buf, offset); offset += 32;
    buf.writeUInt8(witnesses.length, offset); offset += 1;
    for (const w of witnesses) {
      Buffer.from(w.deviceId.padEnd(32, "\0").slice(0, 32)).copy(buf, offset); offset += 32;
      Buffer.from(w.signature).copy(buf, offset); offset += 64;
    }
    return buf.subarray(0, offset);
  }

  private buildVrfPayload(deviceId: string, vrfProof: Uint8Array): Uint8Array {
    const buf = Buffer.alloc(32 + vrfProof.length);
    Buffer.from(deviceId.padEnd(32, "\0").slice(0, 32)).copy(buf, 0);
    Buffer.from(vrfProof).copy(buf, 32);
    return buf;
  }

  private deserializeStrategy(data: Buffer): ProofStrategy {
    // Discriminant byte at offset 8 (after Anchor discriminator)
    const discriminant = data[8];
    switch (discriminant) {
      case 0: return { type: "SimpleHeartbeat" };
      case 1: return { type: "WitnessConsensus", minWitnesses: data[9] };
      case 2: return { type: "VrfChallenge", vrfAccount: new PublicKey(data.slice(9, 41)) };
      case 4: return { type: "DegradedHeartbeat", rewardMultiplierBps: data.readUInt16LE(9) };
      default: return { type: "SimpleHeartbeat" };
    }
  }
}
```

---

## Why This Changes the Game

```
TRADITIONAL DEPIN SECURITY:          ADAPTIVE PROOF ENGINE:
  Fixed proof → attackers study it     Strategy rotates → no stable attack surface
  Gaming detected → governance vote    Cell threshold reached → strategy auto-upgrades
  6-month fix timeline                 Milliseconds to switch
  All cells use same proof             Each cell has the right proof for its density
  Oracle down → network halts          Degraded mode → reduced rewards, no halt

ECONOMIC EFFECT:
  Simple heartbeat cells:   Low cost, high throughput → ideal for sparse coverage phase
  Witness consensus cells:  Medium cost → community validates each other
  VRF challenge cells:      High security → premium coverage areas
  
  Operators in high-density premium cells earn MORE because proof is harder.
  This creates organic incentive to fill coverage gaps (simpler proof = easier rewards).
  Geographic distribution emerges from economics, not just from token rewards.
```
