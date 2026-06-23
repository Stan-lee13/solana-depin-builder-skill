# DePIN Safety Rules

Always-active rules. These protect node operators, token holders, and the network from catastrophic mistakes.

## Irreversible actions — always warn before assisting

```
IRREVERSIBLE — require explicit confirmation before proceeding:

1. Deploying reward program to mainnet without audit
   → Bugs in reward calculations can drain treasury permanently

2. Hardcoding oracle pubkey without rotation mechanism
   → Compromised oracle = compromised reward system, no recovery

3. Setting emission parameters without DAO upgrade path
   → Cannot adjust if tokenomics need correction

4. Deploying node registry with no emergency pause
   → Cannot stop rewards if critical bug discovered post-launch

5. Burning unclaimed rewards (vs returning to treasury)
   → Burning is permanent; returning to treasury preserves optionality

6. Setting slash to 100% for non-fraud offenses
   → Operators never recover from operational failures; kills community trust

7. Removing stake requirement post-launch
   → Opens network to immediate Sybil flood
```

## Mandatory design requirements

The skill MUST recommend all of the following in every DePIN architecture:

```
SECURITY:
☑ Device keypair separate from operator wallet
☑ Oracle keypair in HSM or Squads multisig protected
☑ Program upgrade authority behind Squads v4 multisig (≥ 2-of-3)
☑ Emergency pause instruction controlled by multisig
☑ Slashing bounded by reason (max 100% only for proven fraud)
☑ Proof replay protection (nonce + epoch + on-chain deduplication)
☑ Rate limiting on proof submissions per node per epoch

ECONOMICS:
☑ Minimum stake requirement (calculated as 30× expected daily reward)
☑ Geographic concentration limits (max nodes per hex)
☑ Diminishing returns for node N in same hexagon (N ≥ 2)
☑ Emission floor (never zero — network needs some incentive to run)
☑ Sustainability path: protocol revenue covers rewards by Year 2-3

OPERATOR PROTECTION:
☑ Stake recovery path with clear cooldown period
☑ Slashing conditions enumerated on-chain (no admin discretion)
☑ Grace period for consecutive missed epochs before slash
☑ Operator dashboard showing earnings, uptime, proof history

LEGAL / COMPLIANCE:
☑ Radio hardware uses certified unlicensed spectrum OR operators have licenses
☑ No PII stored on-chain (wallet addresses only)
☑ Data marketplace does not store biometric or personal location data of individuals
```

## What this skill will NOT help design

```
WILL NOT ASSIST:
- Reward systems with no anti-Sybil protection
  (Self-reported location/work = infinite fake nodes)
  
- Networks where a single key controls all oracle signing with no rotation path
  (Single point of failure for entire reward economy)
  
- Proof mechanisms that allow gaming by self-reporting without independent verification
  
- Emissions designed to dump on retail while insiders have short vesting
  
- "DePIN" wrappers around centralized services with cosmetic token rewards
  (Pay $X/month, get tokens back → this is a rebate program, not a DePIN)
  
- Any mechanism that charges node operators upfront fees that aren't stake
  (Upfront fees with no service = potential securities violation)
  
- Claiming geographic coverage that isn't independently verifiable
  (False coverage claims to investors/customers = fraud)
```

## Hardware and radio compliance (always surface when relevant)

```
US (FCC):
  Unlicensed operation: Part 15 (ISM bands: 915MHz, 2.4GHz, 5.8GHz)
  LoRaWAN: 915MHz ISM → FCC Part 15 certified hardware required
  WiFi: 2.4GHz / 5GHz ISM → FCC Part 15 certified
  5G private networks: Licensed spectrum required

EU (CE):
  RED Directive (Radio Equipment Directive) compliance required
  ISM bands: 868MHz (EU LoRa), 2.4GHz, 5GHz

Brazil (ANATEL):
  Homologação required for radio devices
  ISM bands: 915MHz, 2.4GHz covered under Resolution 506

Nigeria (NCC):
  Type Approval required for telecommunications equipment
  ISM bands similar to ITU Region 1

GENERAL RULE:
  If your hardware transmits radio signals, it needs regulatory certification
  in every country where nodes will be deployed. This is non-negotiable.
  Fines and device seizures are real risks for operators.
  Always check: has the hardware manufacturer obtained certification for your target markets?
```

## Performance guardrails

```
On-chain constraints to validate before deployment:

MAX ACCOUNT SIZE for NodeAccount:
  → Recommended: < 500 bytes (keep rent cheap for operators)
  → At 500 bytes: ~0.004 SOL rent (~$0.70 at $175/SOL)

MAX CU per proof submission instruction:
  → Target: < 50,000 CU
  → Justification: At 1M proofs/epoch across 10K nodes, total CU = 50B
    → Solana mainnet can handle this but keep headroom
  → If Ed25519 verification needed: use precompile instruction (2K CU vs 10K)

MAX proofs per node per epoch:
  → Recommend: 5-10 maximum
  → Justification: More than 10 proofs/epoch per node is likely gaming

EPOCH LENGTH minimum:
  → Never < 1 hour (too much on-chain state churn)
  → Recommended: 24 hours (daily settlement is standard)
  → Long epochs: better for gas efficiency; worse for operator feedback loop
```
