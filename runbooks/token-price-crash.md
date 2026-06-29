# Token Price Crash — Incident Response Runbook

**Severity:** P0 (>50% in 24h) / P1 (>30% in 24h)
**Response SLA:** Triage in 15 min
**Owner:** Protocol lead + treasury manager

## Trigger Conditions

- Token price drops >50% in 24 hours (P0)
- Token price drops >30% in 24 hours (P1)
- Liquidity depth at ±2% drops below $50K
- Daily trading volume collapses to <10% of 7-day average
- Operator node economics go underwater (rewards < electricity cost)

---

## Immediate Actions (T+0 to T+15 min)

### Step 1 — Pull live price + on-chain data

```bash
# Birdeye — current price, 24h change, volume
curl "https://public-api.birdeye.so/defi/price?address=<TOKEN_MINT>" \
  -H "X-API-KEY: $BIRDEYE_KEY" | jq '{price: .data.value, change24h: .data.priceChange24h}'

# Jupiter price + liquidity depth
curl "https://price.jup.ag/v6/price?ids=<TOKEN_MINT>" | \
  jq '{price: .data["<TOKEN_MINT>"].price}'

# On-chain: check LP pool reserves (Meteora / Orca)
spl-token account-info --address <LP_POOL_TOKEN_ACCOUNT> \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY

# Identify largest sells in last 2 hours via Helius
curl "https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "getSignaturesForAddress",
    "params": ["<TOKEN_MINT>", {"limit": 200}]
  }' | jq '.result[] | select(.err == null) | .signature' | head -20
```

```typescript
// src/incident/price-triage.ts
async function priceTriage(tokenMint: string) {
  // Helius enhanced transactions — decode swaps to find whale sells
  const response = await fetch(
    `https://api.helius.xyz/v0/addresses/${tokenMint}/transactions?api-key=${process.env.HELIUS_KEY}&type=SWAP&limit=50`
  );
  const txs = await response.json();

  const largeSells = txs
    .filter((tx: any) =>
      tx.tokenTransfers?.some(
        (t: any) => t.mint === tokenMint && t.tokenAmount > 100_000
      )
    )
    .map((tx: any) => ({
      signature: tx.signature,
      seller: tx.feePayer,
      amount: tx.tokenTransfers.find((t: any) => t.mint === tokenMint).tokenAmount,
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
    }));

  console.table(largeSells);
  return largeSells;
}
```

### Step 2 — Determine cause (critical — response differs by cause)

```
CAUSE A: Large team/investor wallet selling (vesting unlock)
  → Check vesting schedule — is a cliff hitting today?
  → Command: solana account <VESTING_ACCOUNT> --output json
  → Response: communicate unlock was scheduled; deploy buyback if treasury allows

CAUSE B: External market crash (SOL/BTC down >20%)
  → Check SOL price on Binance
  → Response: hold, communicate correlation, emphasize fundamentals

CAUSE C: Negative news / FUD (hack rumor, regulatory news)
  → Check Twitter/Discord for narrative
  → Response: factual clarification within 30 min; silence = confirmation

CAUSE D: Organic sell pressure (operators cashing out rewards)
  → Reward emission too high relative to demand
  → Response: review emission rate; emergency governance proposal to reduce

CAUSE E: Coordinated dump / wash trading
  → Look for: multiple wallets selling same block, circular trades
  → Response: document for exchange report; consider legal
```

### Step 3 — Assess operator economics

```typescript
// src/incident/operator-economics.ts
// Calculate at current token price: are operators still profitable?

function assessOperatorBreakeven(
  currentTokenPriceUsd: number,
  dailyRewardTokens: number,
  hardwareCostUsd: number,
  dailyElectricityCostUsd: number,
  amortizationMonths: number
): {
  dailyRevenueUsd: number;
  dailyCostUsd: number;
  profitable: boolean;
  breakEvenPriceUsd: number;
} {
  const dailyRevenueUsd = dailyRewardTokens * currentTokenPriceUsd;
  const dailyHardwareCost = hardwareCostUsd / (amortizationMonths * 30);
  const dailyCostUsd = dailyElectricityCostUsd + dailyHardwareCost;

  const breakEvenPriceUsd = dailyCostUsd / dailyRewardTokens;

  return {
    dailyRevenueUsd,
    dailyCostUsd,
    profitable: dailyRevenueUsd > dailyCostUsd,
    breakEvenPriceUsd,
  };
}

// If operators are underwater → they will shut down nodes → network degrades → death spiral
// Trigger emergency reward boost if:  currentPrice < breakEvenPrice * 0.8
```

---

## Short-Term Actions (T+15 to T+60 min)

### Step 4 — Communicate (within 30 min — silence is catastrophic)

```
Discord / Twitter template:

📊 TOKEN PRICE UPDATE

We're aware [TOKEN] is down [X]% today. Here's what we know:

Network status: ✅ FULLY OPERATIONAL
Active nodes: [N] (unchanged)
Protocol revenue: $[X]/day (unchanged)

What's happening: [CAUSE — be honest and specific]

What we're doing: [SPECIFIC ACTIONS]

We'll update in 2 hours. Questions → #support

[NO PROMISES about price recovery. Focus on fundamentals.]
```

### Step 5 — Treasury defense

```bash
# Check treasury composition
spl-token accounts --owner <TREASURY_MULTISIG> \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY

# If treasury is >50% in native token → at risk of further erosion
# Squads proposal: convert 30% to USDC to stabilize operational runway

# Calculate operational runway at current burn rate:
# Monthly burn (USD) / USDC in treasury = months of runway
# Target: never drop below 18 months runway
```

### Step 6 — Contact market maker (if contracted)

```bash
# Most DePIN protocols have a market-making arrangement
# This is the moment to activate it

# Standard MM activation message:
# "Token: [MINT]
#  Current price: [X]
#  Target spread: <1%
#  Min liquidity at ±2%: $100K
#  Activate full inventory deployment per our agreement"
```

---

## Medium-Term Actions (T+1h to T+24h)

### Step 7 — Emergency emission reduction (if cause is oversupply)

```typescript
// Submit governance proposal to temporarily reduce emission rate
// This is the DePIN equivalent of a central bank rate hike

const emissionReductionProposal = {
  name: "Emergency Emission Reduction",
  description: `Reduce daily node rewards by 25% for 30 days to reduce sell pressure. 
    Current price: $${currentPrice}. Operator breakeven: $${breakEvenPrice}.
    Reduction keeps operators profitable while reducing supply pressure.`,
  changes: [
    {
      instruction: "update_epoch_rewards",
      current_daily_tokens: currentEmission,
      proposed_daily_tokens: Math.floor(currentEmission * 0.75),
      duration_epochs: 30 * 24, // 30 days assuming hourly epochs
    },
  ],
};
// Submit via spl-governance or your program's admin instruction
```

---

## CLI Quick-Reference Card

```bash
# PASTE INTO #incident-token-crash

TOKEN_MINT: <MINT>
CURRENT_PRICE: $
24H_CHANGE:    %
CAUSE_HYPOTHESIS:

# Price data:
curl "https://price.jup.ag/v6/price?ids=<TOKEN_MINT>" | jq .

# LP pool depth:
spl-token account-info --address <LP_POOL_ACCOUNT>

# Operator breakeven at current price:
# Run: src/incident/operator-economics.ts
```

---

## Recovery Indicators

- [ ] Cause identified and communicated within 30 min
- [ ] Operator economics confirmed viable (or emergency boost proposed)
- [ ] Treasury USDC runway confirmed >18 months
- [ ] Market maker engaged (if contracted)
- [ ] No node churn spike (check `DEPIN_COVERAGE_DRIFT` signal)
- [ ] Price stabilises for 48h
- [ ] Post-mortem + tokenomics review within 7 days

## Cross-Skill Signals

If operator churn exceeds 5% in 24h: fire `DEPIN_COVERAGE_DRIFT` (P1) to Observability.
If treasury key needs rotation: fire `WALLET_KEY_COMPROMISED` (P0).
