# Coverage Verification & Proof of Physical Work

Proving that a physical device is ACTUALLY where it claims to be, doing what it claims to do. This is what separates DePIN from just "airdrop farming with hardware."

## H3 Hexagonal Grid — Geographic Primitives

H3 is the standard for geographic DePIN networks. Used by Helium, Hivemapper, GEODNET.

### Resolution guide

| Resolution | Hex diameter | Use case |
|---|---|---|
| 5 | ~250km | Country-level density maps |
| 6 | ~80km | Region-level |
| 7 | ~30km | City-level |
| 8 | ~10km | Neighborhood coverage (Helium hotspot density) |
| 9 | ~3km | Street-level (Hivemapper streets) |
| 10 | ~1km | Block-level precision |
| 12 | ~100m | Precise location verification |

**Rule:** Use resolution 8 for hotspot density limits. Use resolution 10-12 for precise coverage claims.

### H3 on Solana — encoding

```typescript
import * as h3 from "h3-js";

// Convert GPS to H3 index
const lat = 6.4541;  // Lagos, Nigeria coordinates
const lng = 3.3947;
const resolution = 8;

const h3Index = h3.latLngToCell(lat, lng, resolution);
// Returns: "8826e1c4fffffff"

// Encode as u64 for on-chain storage
function h3ToU64(h3Index: string): bigint {
  return BigInt("0x" + h3Index);
}

// Decode back
function u64ToH3(h3u64: bigint): string {
  return h3u64.toString(16).padStart(15, "0");
}

// Check if two nodes are in adjacent hexagons (for witness validation)
const isAdjacent = h3.areNeighborCells(h3IndexA, h3IndexB);

// Get all hexagons within k rings (for coverage area calculation)
const coverageArea = h3.gridDisk(h3Index, 2); // 2-ring neighborhood
```

```rust
// On-chain H3 validation in Anchor
pub fn validate_hex_claim(
    claimed_h3_index: u64,
    proof_lat_scaled: i64,  // latitude * 10^7 (integer representation)
    proof_lng_scaled: i64,
) -> Result<()> {
    // Convert scaled integers back to degrees
    let lat = proof_lat_scaled as f64 / 1e7;
    let lng = proof_lng_scaled as f64 / 1e7;
    
    // Verify the claimed H3 index matches the proven location
    // Note: Full H3 lib in BPF is expensive — use a simplified validator
    // or verify off-chain and submit signed attestation
    
    // For production: use off-chain oracle to compute H3 index,
    // sign it with oracle key, verify signature on-chain
    
    Ok(())
}
```

## Beacon/Witness Protocol (Helium Pattern)

The gold standard for connectivity network proof-of-coverage.

### How it works

```
EPOCH START
    │
    ▼
CHALLENGER (protocol-selected crank)
    ├─ Selects random BEACONER node
    ├─ Issues encrypted challenge: Challenge = Encrypt(secret, beaconer_pubkey)
    └─ Posts ChallengeIssued event on-chain

BEACONER NODE
    ├─ Detects it was selected (monitors on-chain events)
    ├─ Decrypts challenge with device keypair
    ├─ Broadcasts beacon signal on radio frequency
    └─ Waits for witnesses

WITNESS NODES (physically nearby)
    ├─ Receive beacon signal
    ├─ Sign witness receipt: Sign(beacon_hash + their_location, device_keypair)
    └─ Submit witness report to oracle service

ORACLE SERVICE
    ├─ Collects witness reports
    ├─ Validates witness signatures
    ├─ Validates witness nodes are registered in adjacent hexagons
    ├─ Filters out witnesses in same hexagon as beaconer (prevents self-witnessing)
    └─ Submits proof bundle to Solana

ON-CHAIN VERIFICATION
    ├─ Verify all signatures
    ├─ Check witness count meets minimum (e.g., ≥ 3)
    ├─ Apply coverage quality score
    └─ Credit beacon reward + witness rewards
```

### Implementation

```typescript
// Oracle service: Process beacon/witness proofs
interface BeaconProof {
  beacon_node: string;           // Node account pubkey
  challenge_id: string;          // Unique challenge identifier
  beacon_timestamp: number;
  witnesses: WitnessReport[];
}

interface WitnessReport {
  witness_node: string;
  witness_h3_index: string;      // Hex-8 of witness location
  signal_strength_dbm: number;   // RSSI reading
  snr_db: number;               // Signal-to-noise ratio
  device_signature: string;      // Signed by witness device keypair
  report_timestamp: number;
}

async function validateBeaconProof(proof: BeaconProof): Promise<{
  is_valid: boolean;
  valid_witnesses: WitnessReport[];
  coverage_score: number;
  rejection_reasons: string[];
}> {
  const rejections: string[] = [];
  const validWitnesses: WitnessReport[] = [];

  for (const witness of proof.witnesses) {
    // Rule 1: Witness must be a registered node
    const witnessNode = await getNodeAccount(witness.witness_node);
    if (!witnessNode || witnessNode.status !== "active") {
      rejections.push(`${witness.witness_node}: not an active node`);
      continue;
    }

    // Rule 2: Witness cannot be in same hexagon as beaconer (prevents self-witness)
    const beaconerNode = await getNodeAccount(proof.beacon_node);
    if (witness.witness_h3_index === u64ToH3(beaconerNode.geo_h3_index)) {
      rejections.push(`${witness.witness_node}: same hex as beaconer`);
      continue;
    }

    // Rule 3: Witness must be in plausible range (hex-8 max distance)
    const beaconerHex = u64ToH3(beaconerNode.geo_h3_index);
    const gridDistance = h3.gridDistance(beaconerHex, witness.witness_h3_index);
    if (gridDistance > MAX_WITNESS_HEX_DISTANCE) {
      rejections.push(`${witness.witness_node}: too far from beaconer`);
      continue;
    }

    // Rule 4: Validate device signature
    const message = `${proof.challenge_id}:${witness.witness_node}:${witness.report_timestamp}`;
    const isValidSig = verifyDeviceSignature(
      witnessNode.device_pubkey,
      message,
      witness.device_signature
    );
    if (!isValidSig) {
      rejections.push(`${witness.witness_node}: invalid device signature`);
      continue;
    }

    // Rule 5: Signal strength plausibility check
    // RSSI should correlate with distance — large discrepancies are suspicious
    const expectedRSSI = estimateRSSIForDistance(gridDistance);
    if (Math.abs(witness.signal_strength_dbm - expectedRSSI) > 20) {
      rejections.push(`${witness.witness_node}: implausible RSSI for distance`);
      continue;
    }

    validWitnesses.push(witness);
  }

  // Score based on witness count and quality
  const baseScore = Math.min(validWitnesses.length / MIN_WITNESSES, 1.0);
  const qualityBonus = validWitnesses.reduce((sum, w) => sum + scoreWitnessQuality(w), 0) 
    / Math.max(validWitnesses.length, 1);
  
  const coverageScore = Math.round((baseScore * 0.7 + qualityBonus * 0.3) * 1000);

  return {
    is_valid: validWitnesses.length >= MIN_WITNESSES,
    valid_witnesses: validWitnesses,
    coverage_score: coverageScore,
    rejection_reasons: rejections,
  };
}
```

### On-chain proof verification (Anchor)

```rust
#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct BeaconProofData {
    pub challenge_id: [u8; 32],
    pub beacon_node: Pubkey,
    pub witness_count: u8,
    pub coverage_score: u16,         // 0-1000
    pub oracle_signature: [u8; 64],
    pub proof_timestamp: i64,
}

pub fn verify_beacon_proof(
    ctx: Context<VerifyBeaconProof>,
    proof: BeaconProofData,
) -> Result<()> {
    // 1. Verify proof is not stale (must be within current epoch)
    let epoch_state = &ctx.accounts.epoch_state;
    let current_slot = Clock::get()?.slot;
    require!(
        current_slot >= epoch_state.start_slot && current_slot <= epoch_state.end_slot,
        ErrorCode::ProofOutsideEpoch
    );

    // 2. Verify oracle signature (oracle attests to witness validation)
    let proof_message = proof.try_to_vec()?;
    verify_oracle_signature(
        &ctx.accounts.oracle_config.oracle_pubkey,
        &proof_message,
        &proof.oracle_signature,
        &ctx.accounts.ed25519_instruction_sysvar,
    )?;

    // 3. Credit beacon node
    let beacon_score = (proof.coverage_score as u64) * BEACON_REWARD_MULTIPLIER;
    ctx.accounts.beacon_node.current_epoch_score += beacon_score;

    // 4. Challenge ID can only be used once (prevent replay)
    let challenge_used = &mut ctx.accounts.challenge_record;
    require!(!challenge_used.is_used, ErrorCode::ChallengeAlreadyUsed);
    challenge_used.is_used = true;

    emit!(BeaconVerified {
        beacon_node: proof.beacon_node,
        challenge_id: proof.challenge_id,
        witness_count: proof.witness_count,
        coverage_score: proof.coverage_score,
    });

    Ok(())
}
```

## Data Quality Verification (Sensor Networks)

For weather stations, air quality monitors, GPS base stations:

```typescript
// Cross-validation against independent sources
async function validateSensorReading(
  nodeAccount: string,
  reading: { value: number; unit: string; timestamp: number }
): Promise<{ valid: boolean; confidence: number }> {
  
  const h3Index = await getNodeH3Index(nodeAccount);
  const neighborNodes = await getActiveNodesInRing(h3Index, 2); // 2-ring neighbors

  // Compare against neighbor nodes' readings
  const neighborReadings = await Promise.all(
    neighborNodes.map(n => getLatestReading(n.account, reading.unit))
  );

  const validNeighbors = neighborReadings.filter(r => 
    r && Math.abs(r.timestamp - reading.timestamp) < 600 // Within 10 min
  );

  if (validNeighbors.length === 0) {
    // No neighbors — use external API as fallback
    const externalSource = await queryWeatherAPI(h3Index, reading.unit);
    const variance = Math.abs(reading.value - externalSource) / externalSource;
    return { valid: variance < 0.15, confidence: 0.6 };
  }

  // Statistical validation against neighbors
  const neighborValues = validNeighbors.map(r => r!.value);
  const mean = neighborValues.reduce((a, b) => a + b, 0) / neighborValues.length;
  const stdDev = Math.sqrt(
    neighborValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / neighborValues.length
  );

  const zScore = Math.abs(reading.value - mean) / (stdDev || 1);
  const isOutlier = zScore > 3; // More than 3 standard deviations = outlier

  return {
    valid: !isOutlier,
    confidence: Math.max(0, 1 - (zScore / 3)) * (validNeighbors.length / 5),
  };
}
```

## Anti-Gaming Measures

```typescript
const ANTI_GAMING_RULES = {
  // Connectivity networks
  MIN_WITNESSES_FOR_REWARD: 3,
  MAX_WITNESS_HEX_DISTANCE: 3,       // Max hex-8 rings away
  SAME_HEX_WITNESS_BANNED: true,
  MIN_SIGNAL_STRENGTH_DBM: -130,
  MAX_CHALLENGES_PER_EPOCH: 5,        // Limit beacon frequency

  // Sensor networks
  MAX_VARIANCE_FROM_NEIGHBORS_PCT: 15, // 15% max deviation from consensus
  MIN_REPORTING_INTERVAL_SECONDS: 60,  // No spamming readings
  REQUIRED_UPTIME_FOR_REWARD: 0.8,     // Must be up 80% of epoch

  // All networks
  MAX_NODES_PER_HEX_RES8: {
    connectivity: 4,    // 4 hotspots max per neighborhood hex
    sensor: 2,          // 2 sensors max per neighborhood
    compute: 0,         // No geographic limit for compute
  },
  MIN_STAKE_FOR_PROOF_SUBMISSION: true,  // Must have stake to submit proofs
  COOLDOWN_AFTER_SLASH_EPOCHS: 7,        // Can't earn for 7 epochs after slash
};
```
