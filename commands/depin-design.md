# /depin-design — Full Network Design Command

Orchestrates the complete DePIN network design process from concept to implementation plan.

## Usage

```
/depin-design
```

## Intake

The command will ask the following questions in sequence:

```
1. What type of DePIN are you building?
   (Connectivity / Sensor / Compute / Storage / Energy / Other)

2. What is your primary value proposition?
   (Describe what problem your network solves)

3. What geographic scope do you target?
   (Global / Regional / Local / City-specific)

4. What is your target operator demographic?
   (Crypto-native / Tech-savvy / Small business / Enterprise / Mixed)

5. What is your target timeline to mainnet?
   (3 months / 6 months / 12 months / 18+ months)

6. What is your approximate budget for development?
   (<$50K / $50K-250K / $250K-1M / $1M+)

7. Do you have a technical team?
   (Yes, in-house / Yes, contractors / No, need full build / Mixed)

8. What oracle trust level do you require?
   (Switchboard v3 / Custom Ed25519 / TEE / Multi-party / ZK proofs)

9. Do you need token economics design?
   (Yes / No / Already designed)

10. Do you have regulatory compliance requirements?
    (Yes, specify jurisdiction / No / Not sure)
```

## Output

The command generates a comprehensive design document with:

### 1. Architecture Pattern Recommendation

Based on your DePIN type, recommends the optimal architecture pattern:
- Beacon/Witness (Helium-style)
- Challenge/Response (Filecoin-style)
- Job/Completion (Render Network-style)
- Contribution/Mapping (WeatherXM-style)
- Uptime/Routing (Althea-style)

### 2. Technology Stack

- On-chain program: Anchor framework, account structures
- Off-chain oracle: Switchboard v3 or custom
- Hardware recommendations for your use case
- Infrastructure: RPC providers, monitoring, alerting

### 3. Proof Mechanism Design

- Proof type and verification method
- Geographic indexing (H3 hex grid if applicable)
- Anti-Sybil mechanisms
- Proof submission frequency

### 4. Oracle Integration Plan

- Oracle trust level selection
- Implementation approach
- Security considerations
- Backup/failover strategy

### 5. Token Economics Outline

- Total supply and distribution
- Emission schedule
- Reward calculation method
- Breakeven analysis for operators

### 6. Safety & Security

- Emergency pause mechanism
- Multisig authority structure
- Slashing conditions
- Audit requirements

### 7. Implementation Roadmap

- 12-week build sequence
- Milestones and deliverables
- Resource requirements
- Risk mitigation

### 8. Operator Experience

- Onboarding flow
- Dashboard requirements
- Alerting strategy
- Support documentation

## Example Output

```markdown
# DePIN Network Design: MyConnectivity

## Architecture Pattern
**Recommended:** Beacon/Witness (Helium-style)

**Rationale:** Connectivity networks benefit from continuous coverage verification. The beacon/witness pattern allows nodes to prove they're providing coverage in their assigned location.

## Technology Stack

### On-Chain
- Framework: Anchor 0.30.1
- Program: `my-connectivity`
- Key accounts: NetworkConfig, NodeAccount, BeaconAccount, WitnessAccount

### Off-Chain Oracle
- Primary: Switchboard v3 Custom Oracle
- Trust Level: Centralized (acceptable for MVP)
- Backup: Custom Ed25519 oracle for failover

### Hardware
- Recommended: ESP32-S3 with external antenna
- Cost: $15-25 per unit
- Power: Mains or PoE

### Infrastructure
- RPC: Helius (devnet), QuickNode (mainnet)
- Monitoring: Grafana + Prometheus
- Alerting: PagerDuty integration

## Proof Mechanism

### Proof Type: Coverage Beacon
- Nodes transmit beacons at regular intervals
- Witnesses (other nodes) verify beacon reception
- Proof = beacon signature + witness attestations

### Geographic Indexing
- H3 resolution 8 (city-level hexes)
- Each hex has target node count
- Underserved hexes earn bonus rewards

### Anti-Sybil
- Minimum stake: 100 SOL
- Geographic density limit: 1 node per hex (resolution 9)
- Device signature verification

### Proof Frequency
- Beacon interval: 10 minutes
- Witness verification: 15 minutes
- Epoch length: 24 hours

## Token Economics

### Total Supply: 10B tokens
- Node rewards: 40% (4B tokens)
- Treasury: 25% (2.5B tokens)
- Team: 15% (1.5B tokens)
- Investors: 10% (1B tokens)
- Community: 10% (1B tokens)

### Emission Schedule
- Type: Halving every 2 years
- Duration: 10 years
- Initial epoch reward: 1M tokens

### Operator Economics
- Hardware cost: $400
- Monthly opex: $8
- Breakeven: 14 months
- Year 1 ROI: 85%

## Safety & Security

### Emergency Controls
- Authority: 3/5 multisig
- Pause capability: Yes
- Pause trigger: Oracle down >30 min, critical bug detected

### Slashing Conditions
- Proof failure >50% in epoch: 25% slash
- Geographic spoofing: 100% slash
- Sybil attack: 100% slash + ban

## Implementation Roadmap

### Week 1-2: Foundation
- Initialize Anchor project
- Design account structures
- Set up Switchboard oracle

### Week 3-4: Core Program
- Implement initialize instruction
- Implement node registration
- Implement beacon/witness logic

### Week 5-6: Proof Verification
- Implement proof submission
- Implement oracle verification
- Implement reward calculation

### Week 7-8: Safety Features
- Implement emergency pause
- Implement jail/slash mechanism
- Implement multisig authority

### Week 9-10: Testing
- Unit tests
- Integration tests
- Security audit

### Week 11-12: Deployment
- Devnet deployment
- Mainnet deployment
- Operator onboarding

## Next Steps

1. Review this design with your team
2. Approve architecture pattern
3. Load `agents/depin-architect.md` for detailed implementation
4. Load `agents/reward-engineer.md` for token economics deep dive
5. Load `agents/hardware-engineer.md` for hardware selection
```

## Follow-up Commands

After reviewing the design, you can:
- `/depin-audit` — Audit an existing design
- `/depin-diagram` — Generate architecture diagrams
- `/depin-hardware` — Get hardware cost estimates
- `/node-economics` — Detailed ROI modeling
