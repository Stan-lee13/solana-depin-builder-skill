# DePIN Network Architecture

Design the system architecture for your DePIN protocol before writing a single line of code. Getting this wrong is expensive and often irreversible once nodes are deployed in the field.

## Step 1 — Define your network's value proposition

Answer these before designing anything:

```
1. What physical service does your network provide?
   → What does a node DO to earn rewards?

2. Who are the consumers of this service?
   → Who pays for it, and how do they access it?

3. How do you verify that a node actually did the work?
   → This is the hardest and most important question in DePIN.

4. How do you prevent fake nodes from stealing rewards?
   → Anti-Sybil is existential — get this wrong and you have no network.

5. What is the geographic or capacity unit of coverage?
   → H3 hexagon? City? Country? Compute unit? GB of data?
```

## Step 2 — Choose your architecture pattern

### Pattern A: Beacon/Witness (Helium-style)
Best for: Wireless coverage networks (WiFi, 5G, LoRaWAN, Bluetooth)

```
How it works:
- Hotspot A broadcasts a "beacon" (encrypted challenge)
- Hotspot B "witnesses" the beacon (proves radio proximity)
- Neither can fake this without being physically close
- Both earn rewards for participation

Proof mechanism: RF signal detection — unforgeable without physical hardware
Geographic unit: H3 hexagons (res 8-12 depending on density target)
Oracle: Off-chain challenger service + on-chain proof submission
```

### Pattern B: Challenge/Response (IoT sensor networks)
Best for: Weather stations, air quality monitors, GPS base stations (GEODNET)

```
How it works:
- Network sends a signed challenge to a node
- Node must respond with verifiable sensor reading + signature
- Response is cross-validated against neighboring nodes
- Statistical outliers are penalized

Proof mechanism: Data consistency across independent sensors
Geographic unit: H3 hexagons or GPS coordinates
Oracle: Multi-source aggregation + statistical validation
```

### Pattern C: Job/Completion (Compute networks)
Best for: GPU compute, AI inference, rendering (io.net)

```
How it works:
- Orchestrator assigns compute job to node
- Node executes and returns result + computation proof
- Result is verified (re-execution sample, ZK proof, or TEE attestation)
- Node earns based on compute units consumed × quality score

Proof mechanism: Deterministic computation verification or ZK proofs
Geographic unit: N/A (compute is location-agnostic)
Oracle: Job scheduler + result verification service
```

### Pattern D: Contribution/Mapping (Hivemapper-style)
Best for: Data collection networks (dashcams, lidar, satellite)

```
How it works:
- Device collects data during operation
- Data is uploaded to centralized validation service (initially)
- Validated contribution earns geographic coverage credit
- Coverage represented as hexagon NFTs on-chain

Proof mechanism: AI/ML quality validation off-chain → signed attestation
Geographic unit: H3 hexagons (res 10-12 for street-level mapping)
Oracle: Centralized AI validator → progressive decentralization
```

### Pattern E: Uptime/Routing (Bandwidth networks)
Best for: Residential proxies, VPN nodes, CDN (Grass)

```
How it works:
- Node registers available bandwidth
- Network routes traffic through active nodes
- Traffic volume + uptime is metered by the orchestrator
- Nodes earn based on bandwidth served × uptime %

Proof mechanism: Traffic routing logs signed by orchestrator
Geographic unit: Country/ASN for proxy diversity
Oracle: Centralized traffic router (pragmatic for v1)
```

## Step 3 — Solana program architecture

### Core accounts (every DePIN network needs these)

```rust
// Node Registry Account
#[account]
pub struct NodeAccount {
    pub owner: Pubkey,           // Node operator wallet
    pub device_pubkey: Pubkey,   // Device keypair (hardware identity)
    pub node_type: NodeType,     // Connectivity / Compute / Sensor / etc.
    pub metadata_uri: String,    // Hardware specs, location attestation
    pub stake_amount: u64,       // SOL or token stake (anti-Sybil)
    pub status: NodeStatus,      // Active / Inactive / Slashed
    pub registered_at: i64,      // Unix timestamp
    pub last_heartbeat: i64,     // Last proof submission
    pub epoch_score: u64,        // Accumulated score this epoch
    pub lifetime_rewards: u64,   // Total earned
    pub bump: u8,
}

// Epoch Tracker Account (one per epoch)
#[account]
pub struct EpochState {
    pub epoch: u64,
    pub start_slot: u64,
    pub end_slot: u64,
    pub total_work_units: u128,  // Network-wide verified work
    pub reward_pool: u64,        // Tokens to distribute this epoch
    pub participating_nodes: u32,
    pub is_finalized: bool,
    pub bump: u8,
}

// Reward Pool (protocol treasury for emissions)
#[account]
pub struct RewardPool {
    pub authority: Pubkey,       // Squads multisig
    pub token_mint: Pubkey,      // Protocol token
    pub epoch_emission: u64,     // Tokens emitted per epoch
    pub decay_rate: u64,         // Basis points reduction per year
    pub total_distributed: u128,
    pub bump: u8,
}

// Geographic Claim (for coverage networks)
#[account]
pub struct HexClaim {
    pub h3_index: u64,           // H3 hexagon index
    pub claimed_by: Pubkey,      // Node that has best coverage here
    pub coverage_score: u64,     // Quality of coverage (0-1000)
    pub last_verified: i64,
    pub bump: u8,
}
```

### Program instruction set (minimum viable)

```rust
pub enum DePINInstruction {
    // Node lifecycle
    RegisterNode { device_pubkey: Pubkey, metadata_uri: String },
    DeactivateNode,
    
    // Proof submission (called by oracle cranks)
    SubmitWorkProof { 
        epoch: u64,
        work_units: u64, 
        proof_data: Vec<u8>,
        oracle_signature: [u8; 64],
    },
    
    // Reward claiming (called by node operators)
    ClaimReward { epoch: u64 },
    
    // Epoch management (called by crank)
    FinalizeEpoch { epoch: u64 },
    
    // Governance
    UpdateEmissionRate { new_rate: u64 },  // DAO vote required
    SlashNode { node: Pubkey, reason: SlashReason },
}
```

## Step 4 — Technology stack decisions

### On-chain (Solana program)
| Choice | Recommendation | Rationale |
|---|---|---|
| Framework | Anchor v0.30+ | Fastest path; good for complex account structures |
| High performance | Pinocchio | If CU optimization is critical (high-frequency proof submissions) |
| Token standard | Token-2022 | Transfer fees for protocol revenue on reward distribution |
| Multisig | Squads v4 | Treasury, upgrade authority, slashing authority |
| Testing | LiteSVM or Mollusk | Fast unit testing for proof validation logic |

### Off-chain oracle layer
| Component | Recommendation |
|---|---|
| Oracle framework | Switchboard v3 (custom jobs) |
| Alternative | Custom TypeScript oracle with Ed25519 signing |
| Data transport | gRPC (high volume) or HTTPS (low volume) |
| Queue | BullMQ on Redis for proof submission pipeline |
| Database | PostgreSQL (node registry mirror + proof history) |

### Infrastructure
| Component | Recommendation |
|---|---|
| RPC | Helius (dedicated node for high-volume proof submissions) |
| Transaction sending | Jito bundles for epoch finalization (atomic) |
| Monitoring | Grafana + Helius webhooks |
| Geographic indexing | H3-js (TypeScript) / h3-rs (Rust) |

## Step 5 — The oracle problem (critical)

The single hardest problem in DePIN: **how do you get trustworthy real-world data on-chain?**

### Trust level hierarchy (choose based on your proof mechanism)

```
Level 1 — TEE (Trusted Execution Environment)       [MOST TRUSTED]
  Device runs code inside Intel SGX / ARM TrustZone
  Generates attestation proof verifiable on-chain
  Examples: Marlin Oyster, Phala Network
  Cost: Hardware requirement; limits device types

Level 2 — Multi-party oracle consensus              [HIGH TRUST]
  Multiple independent oracles validate the same data
  Switchboard v3 with multiple data sources
  Consensus required (2-of-3, 3-of-5)
  Examples: Switchboard, Pyth (price feeds use this)

Level 3 — Cryptographic challenge-response          [MEDIUM TRUST]
  Network issues signed challenges; device must respond
  Response proves device was active at that location/time
  Cannot be replayed (challenges are nonce-based)
  Examples: Helium beacon/witness

Level 4 — Statistical anomaly detection             [MODERATE TRUST]
  Individual proofs aren't verified cryptographically
  But statistical outliers are penalized
  Requires large node count to be robust
  Examples: Weather networks, traffic data

Level 5 — Centralized oracle (pragmatic v1)         [LOWEST TRUST]
  Protocol team runs oracle, signs proof attestations
  Progressive decentralization roadmap required
  Fine for launch; must disclose and have upgrade path
  Examples: Most DePIN networks at launch
```

**Recommendation for new networks:** Start with Level 5, design for Level 3-4, roadmap to Level 2.

## Architecture checklist

Before writing any code:
- [ ] DePIN category identified (connectivity/compute/sensor/mapping/bandwidth/storage)
- [ ] Proof mechanism defined and anti-gaming analysis done
- [ ] Oracle trust level chosen with rationale
- [ ] Stake requirement calculated (economic deterrence for fake nodes)
- [ ] H3 resolution chosen for geographic networks
- [ ] Epoch length set (24h standard; shorter = more responsive, higher CU cost)
- [ ] Reward pool funding source identified (inflation / protocol revenue / both)
- [ ] Crank design (who runs epoch finalization and proof submission cranks?)
- [ ] Upgrade path planned (program authority → Squads → DAO)
- [ ] Emergency pause mechanism designed
