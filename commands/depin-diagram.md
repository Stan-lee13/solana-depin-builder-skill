# /depin-diagram — Generate Architecture Diagrams

Generates Mermaid diagrams for DePIN network architecture, data flow, and component relationships for all seven DePIN patterns.

## Usage

```
/depin-diagram [pattern] [diagram-type]
```

**Patterns:** `connectivity` · `sensor` · `compute` · `mapping` · `bandwidth` · `storage` · `energy`
**Types:** `architecture` · `dataflow` · `components` · `security`

---

## Pattern A — Connectivity (Helium-style)

### Architecture

```mermaid
graph TB
    subgraph On-Chain
        NC[NetworkConfig]
        NA[NodeAccount]
        BA[BeaconAccount]
        WA[WitnessAccount]
        P[Anchor Program]
    end
    subgraph Off-Chain
        CH[Challenger Service]
        N1[Hotspot A - Beacon]
        N2[Hotspot B - Witness]
    end
    subgraph Infrastructure
        RPC[Helius RPC]
        MON[Prometheus + Grafana]
        KMS[AWS KMS - Crank Key]
    end
    N1 -->|1. Broadcast beacon| N2
    N2 -->|2. Witness receipt| CH
    CH -->|3. Issue challenge tx| P
    N1 -->|4. Submit proof| P
    N2 -->|4. Submit witness| P
    P -->|5. Update accounts| NA
    P -->|6. Emit event| RPC
    RPC -->|7. Forward metrics| MON
    KMS -->|Signs epoch tx| CH
```

### Data Flow

```mermaid
sequenceDiagram
    participant HS_A as Hotspot A
    participant HS_B as Hotspot B
    participant CH as Challenger
    participant P as Solana Program
    HS_A->>HS_B: Beacon broadcast (RF signal)
    HS_B->>CH: Witness receipt (GPS + RSSI)
    CH->>P: Issue signed challenge
    HS_A->>P: submit_beacon_proof(sig, h3_index)
    HS_B->>P: submit_witness_proof(sig, rssi, h3_index)
    P->>P: Validate H3 proximity + signatures
    P->>P: Credit epoch_score to both nodes
    Note over P: Epoch crank distributes rewards
```

---

## Pattern C — Compute (io.net-style)

### Architecture

```mermaid
graph TB
    subgraph On-Chain
        JA[JobAccount]
        NA[NodeAccount]
        PA[PaymentEscrow]
        P[Anchor Program]
    end
    subgraph Off-Chain
        ORCH[Job Orchestrator]
        GPU1[GPU Node A]
        GPU2[GPU Node B]
        VER[Result Verifier]
    end
    CLIENT[Client] -->|1. Submit job + escrow| P
    ORCH -->|2. Assign job| GPU1
    GPU1 -->|3. Execute + return result| ORCH
    VER -->|4. Re-execute sample| ORCH
    ORCH -->|5. Submit verified result| P
    P -->|6. Release escrow to node| PA
```

---

## Pattern F — Lidar/Drive Mapping (Hivemapper-style)

### Architecture

```mermaid
graph TB
    subgraph On-Chain
        MC[MapContribution]
        NA[NodeAccount]
        HM[HexCell Registry]
        P[Anchor Program]
    end
    subgraph Off-Chain
        CAM[Dashcam Device]
        VALID[AI Validator Service]
        IPFS[Arweave / IPFS]
    end
    subgraph Infrastructure
        PVGIS[GPS Track Verifier]
        H3[H3 Cell Index]
        KMS[AWS KMS - Validator Key]
    end
    CAM -->|1. Upload footage + GPS track| VALID
    VALID -->|2. Quality check + duplicate detect| PVGIS
    PVGIS -->|3. GPS spoof check| VALID
    VALID -->|4. Store footage| IPFS
    VALID -->|5. Issue signed attestation| P
    P -->|6. Update H3 cell freshness| HM
    P -->|7. Mint coverage credits to operator| NA
    KMS -->|Signs attestation| VALID
```

### Data Flow — Drive Submission

```mermaid
sequenceDiagram
    participant CAM as Dashcam
    participant VAL as AI Validator
    participant GPS as GPS Verifier
    participant SOL as Solana Program
    CAM->>VAL: footage.mp4 + gps_track.json
    VAL->>VAL: Image quality check (blur, night, coverage %)
    VAL->>GPS: Verify GPS track timing vs cell count
    GPS-->>VAL: PASS — timing plausible (≥3s/cell)
    VAL->>VAL: Check H3 cells against freshness index
    VAL->>VAL: Duplicate detection (same cells in last 24h?)
    VAL->>SOL: submit_map_contribution(cells[], stale_cells, validator_sig)
    SOL->>SOL: validate_drive_timing(start, end, cells)
    SOL->>SOL: Mint credits = cells * freshness_multiplier
    Note over SOL: stale cells (>30 days) earn 2x multiplier
```

### Anti-Gaming — GPS Spoof Detection

```mermaid
flowchart TD
    A[GPS Track Received] --> B{Timestamp gaps regular?}
    B -->|No — teleportation| REJECT[❌ Reject: GPS spoof]
    B -->|Yes| C{Cell count vs drive duration}
    C -->|>1 cell per 3 sec| REJECT
    C -->|Plausible| D{Accelerometer cross-check}
    D -->|No movement signal| REJECT
    D -->|Movement confirmed| E{Cells already fresh?}
    E -->|All cells mapped <24h ago| LOWREWARD[⚠️ 0.1x reward — duplicate]
    E -->|Mix of fresh + stale| ACCEPT[✅ Accept — full + bonus reward]
```

---

## Pattern G — Energy (Powerledger-style)

### Architecture

```mermaid
graph TB
    subgraph On-Chain
        EN[EnergyNode]
        ER[EnergyReading]
        CM[CreditMint]
        P[Anchor Program]
    end
    subgraph Off-Chain
        METER[Smart Meter / Inverter]
        ORACLE[Energy Oracle Service]
        PVGIS[PVGIS Irradiance API]
        GRID[Grid Operator API]
    end
    subgraph Infrastructure
        KMS[AWS KMS - Oracle Key]
        MON[Prometheus + Grafana]
    end
    METER -->|1. Signed meter reading every 15min| ORACLE
    ORACLE -->|2. Cross-check vs irradiance| PVGIS
    PVGIS -->|3. Expected kWh for GPS + time| ORACLE
    ORACLE -->|4. Optional: verify with grid operator| GRID
    ORACLE -->|5. Submit validated reading| P
    P -->|6. Mint energy credits to operator| CM
    P -->|7. Emit EnergyReadingSubmitted| MON
    KMS -->|Signs oracle submission| ORACLE
```

### Data Flow — Meter Reading to Credit

```mermaid
sequenceDiagram
    participant M as Smart Meter
    participant O as Energy Oracle
    participant PV as PVGIS API
    participant SOL as Solana Program
    Note over M: Every 15 minutes
    M->>O: MeterAttestation{kwh, timestamp, meter_sig, cert}
    O->>O: Verify meter cert against approved registry
    O->>O: Verify meter_sig with cert pubkey
    O->>PV: GET irradiance(lat, lon, timestamp)
    PV-->>O: expected_kwh = 0.82 kWh
    O->>O: deviation = |actual - expected| / expected
    alt deviation > 25%
        O-->>SOL: SKIP — implausible reading (potential fraud)
    else deviation ≤ 25%
        O->>SOL: submit_reading(kwh, interval, oracle_sig)
        SOL->>SOL: validate_reading_interval (≥900 slots since last)
        SOL->>SOL: validate_against_nameplate (kwh ≤ capacity * 1.05)
        SOL->>SOL: mint_to(operator, credits)
    end
```

### Demand Response Flow

```mermaid
sequenceDiagram
    participant GRID as Grid Operator
    participant O as Energy Oracle
    participant SOL as Solana Program
    participant NODE as Node Operator
    GRID->>O: DemandResponseEvent{region, reduce_kw, bonus_credits, valid_window}
    O->>SOL: publish_dr_event(event_id, region, bonus_rate, window)
    Note over NODE: Operator receives alert via dashboard
    NODE->>NODE: Reduce load during window
    NODE->>O: DemandResponseProof{baseline_kw, actual_kw, meter_sig}
    O->>O: Verify baseline (avg of last 10 same-time readings)
    O->>SOL: submit_dr_proof(event_id, reduction_kwh, oracle_sig)
    SOL->>SOL: mint_to(operator, base_credits + bonus_credits)
```

---

## Pattern F — Storage (Arweave/Filecoin-style)

### Architecture

```mermaid
graph TB
    subgraph On-Chain
        SN[StorageNode]
        SC[StorageContract]
        CR[ChallengeRecord]
        P[Anchor Program]
    end
    subgraph Off-Chain
        CLIENT[Storage Client]
        NODE[Storage Node]
        CHAL[Challenge Issuer]
        SHARD[Shard Distributor]
    end
    CLIENT -->|1. Upload file + pay escrow| P
    SHARD -->|2. Shard + distribute| NODE
    NODE -->|3. Store shards| NODE
    CHAL -->|4. Issue periodic challenge| NODE
    NODE -->|5. Return merkle proof| CHAL
    CHAL -->|6. Submit verified proof| P
    P -->|7. Release epoch reward| SN
```

### Challenge-Response Data Flow

```mermaid
sequenceDiagram
    participant CH as Challenge Issuer
    participant SN as Storage Node
    participant SOL as Solana Program
    Note over CH: Every epoch (e.g., 1hr)
    CH->>SOL: get_random_challenge_seed(epoch, node)
    SOL-->>CH: seed = hash(epoch || node_pubkey || recent_blockhash)
    CH->>SN: Challenge{seed, byte_range_start, byte_range_len}
    SN->>SN: Compute merkle proof for requested byte range
    SN->>CH: MerkleProof{root, path, leaf_data}
    CH->>CH: Verify proof against stored merkle root
    alt Proof invalid or timeout
        CH->>SOL: report_challenge_failure(node, epoch)
        SOL->>SOL: Increment slash_count; jail if threshold reached
    else Proof valid
        CH->>SOL: submit_storage_proof(node, epoch, proof_hash)
        SOL->>SOL: Credit epoch reward to node
    end
```

---

## Security Diagram (all patterns)

```mermaid
graph TD
    subgraph Authority Hierarchy
        DAO[DAO / Token Holders] -->|governance vote| SQUADS[Squads 3-of-5 Multisig]
        SQUADS -->|upgrade authority| PROG[Solana Program]
        SQUADS -->|mint authority| MINT[Token Mint]
        SQUADS -->|treasury owner| TREAS[Treasury Wallet]
    end
    subgraph Operational Keys - KMS
        KMS[AWS KMS] -->|sign epoch txs| CRANK[Crank Service]
        KMS2[AWS KMS] -->|sign proofs| ORACLE[Oracle Service]
    end
    subgraph Session Keys - Ephemeral
        CRANK -->|delegate submit_proof only| SESSION[Session Key]
        SESSION -->|expires each epoch| PROG
    end
    style SQUADS fill:#primary,color:#primary-foreground
    style KMS fill:#muted
    style KMS2 fill:#muted
    style SESSION fill:#muted
```

---

## Export Options

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Export any diagram to PNG
mmdc -i diagram.mmd -o diagram.png -b transparent

# Export to SVG (preferred for docs)
mmdc -i diagram.mmd -o diagram.svg

# Batch export all diagrams in a folder
for f in diagrams/*.mmd; do mmdc -i "$f" -o "${f%.mmd}.svg"; done
```

## Follow-up Commands

- `/depin-design` — full network design using these patterns
- `/depin-deploy` — deployment checklist after architecture is finalised
- Load `skill/network-architecture.md` for deep pattern guidance
