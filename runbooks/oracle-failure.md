# Runbook: Oracle Failure / Data Manipulation

## Severity

P0 if oracle is actively poisoning reward distribution (wrong rewards already sent).
P1 if oracle deviation detected before distribution.
P2 if oracle is stale/offline but no wrong distribution yet.

## Symptoms

- `solana_oracle_price_deviation_pct > 15%` alert fires (from Observability)
- Reward distribution epoch completes but operator amounts look wrong
- Switchboard feed has not updated in >30 minutes
- Multiple devices submitting identical proof values (copy-paste attack)
- Oracle submission rate exceeds physical device capabilities

## First 5 Minutes

1. Check Switchboard feed account — is the value updated recently?
2. Compare oracle value to 3 independent data sources
3. If deviation confirmed: pause rewards before next epoch closes
4. If already distributed: record the difference — governance compensation required

## PromQL Equivalent (from Observability)

```
# Oracle deviation
abs(solana_oracle_price_deviation_pct) > 15

# Stale oracle (no update in 30 min)
time() - solana_oracle_last_update_timestamp > 1800
```

## Recovery Procedure

```
STALE ORACLE (P2):
  1. Check Switchboard node operator status
  2. Switch to backup oracle feed if available
  3. Delay epoch close until fresh data available
  4. Resume when oracle lag < 5 minutes

DEVIATION (P1 — pre-distribution):
  1. Flag as quarantined: do not use for reward calculation
  2. Use median of remaining valid oracles
  3. If <50% of expected oracles available → delay epoch
  4. Investigate flagged oracles → jail if manipulation confirmed

CONFIRMED POISONING (P0 — post-distribution):
  1. Pause ALL further distributions
  2. Audit: which operators received wrong amounts?
  3. Governance proposal: compensation for under-rewarded, claw-back for over-rewarded
  4. Fix oracle trust level — upgrade from Level 1 to Level 2 if this was centralized oracle
  5. Load solana-incident-response-skill
```

## Resolution Criteria

- Oracle feed verified clean for 3 consecutive epochs
- Reward distribution error calculated and governance proposal submitted
- Oracle trust level reviewed and upgraded if current level was the root cause
