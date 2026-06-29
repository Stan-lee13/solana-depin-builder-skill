# Exchange Delisting — Incident Response Runbook

**Severity:** P1
**Response SLA:** Acknowledge in 1h, community notice in 4h
**Owner:** Protocol lead + treasury manager + legal

## Trigger Conditions

- Exchange sends official delisting notice (email or API notification)
- Exchange suspends deposits/withdrawals for token
- Token removed from exchange trading pairs without notice
- Regulatory-driven delisting (exchange citing compliance policy)

---

## Immediate Actions (T+0 to T+60 min)

### Step 1 — Verify and assess liquidity impact

```bash
# Check current trading volume breakdown across exchanges
# Birdeye market overview
curl "https://public-api.birdeye.so/defi/token_market?address=<TOKEN_MINT>" \
  -H "X-API-KEY: $BIRDEYE_KEY" | \
  jq '.data.markets | sort_by(.liquidity) | reverse | .[0:10] | 
    map({exchange: .source, liquidity: .liquidity, volume24h: .volume24h})'

# Jupiter aggregator — check if delisted exchange was a routing source
curl "https://quote-api.jup.ag/v6/quote?inputMint=<TOKEN_MINT>&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000" | \
  jq '.routePlan | .[].swapInfo | {amm: .ammKey, label: .label}'

# Calculate % of daily volume on the delisting exchange
TOTAL_VOLUME=$(curl "https://public-api.birdeye.so/defi/price?address=<TOKEN_MINT>" \
  -H "X-API-KEY: $BIRDEYE_KEY" | jq '.data.v24hUSD')
EXCHANGE_VOLUME=<GET_FROM_EXCHANGE_API>
echo "Exchange volume share: $(python3 -c "print(f'{$EXCHANGE_VOLUME/$TOTAL_VOLUME*100:.1f}%')")"
```

### Step 2 — Withdraw all treasury funds from exchange

```bash
# PRIORITY: get protocol-owned funds off the exchange before trading halts
# This must happen within the first hour regardless of anything else

# Most exchanges: use API withdrawal
curl -X POST "https://api.<EXCHANGE>.com/v3/capital/withdraw/apply" \
  -H "X-MBX-APIKEY: $EXCHANGE_API_KEY" \
  -d "coin=<TOKEN_SYMBOL>&address=<TREASURY_WALLET>&amount=<AMOUNT>&network=SOL"

# Verify withdrawal initiated:
curl "https://api.<EXCHANGE>.com/v3/capital/withdraw/history" \
  -H "X-MBX-APIKEY: $EXCHANGE_API_KEY" | jq '.[] | select(.coin == "<TOKEN_SYMBOL>")'
```

### Step 3 — Notify operators who may have rewards on the exchange

```typescript
// Identify operators who deposited to the delisting exchange recently
// via Helius transaction history — look for transfers to exchange hot wallet

const EXCHANGE_HOT_WALLETS = ["<EXCHANGE_DEPOSIT_WALLET_1>", "<EXCHANGE_DEPOSIT_WALLET_2>"];

async function findOperatorsOnExchange(tokenMint: string): Promise<string[]> {
  const response = await fetch(
    `https://api.helius.xyz/v0/addresses/${tokenMint}/transactions?api-key=${process.env.HELIUS_KEY}&type=TRANSFER&limit=200`
  );
  const txs = await response.json();

  const affected = txs
    .filter((tx: any) =>
      EXCHANGE_HOT_WALLETS.includes(tx.tokenTransfers?.[0]?.toUserAccount)
    )
    .map((tx: any) => tx.feePayer);

  return [...new Set(affected)] as string[];
}
// DM affected operators directly via Discord
```

---

## Short-Term Actions (T+1h to T+6h)

### Step 4 — Community announcement

```
📢 IMPORTANT: [EXCHANGE_NAME] TOKEN UPDATE

[EXCHANGE] has informed us they will be delisting [TOKEN] on [DATE].

What this means for you:
• Withdraw your [TOKEN] from [EXCHANGE] before [DEADLINE]
• Trading will continue on: [LIST_REMAINING_EXCHANGES]
• DEX trading unaffected: [JUPITER_LINK]

How to withdraw:
1. Go to [EXCHANGE] → Wallet → [TOKEN]
2. Withdraw to your Solana wallet
3. Your tokens will arrive within [TIMEFRAME]

The network continues to operate normally. Node rewards are unaffected.

Questions: #support
```

### Step 5 — Boost DEX liquidity to absorb exchange exit flow

```bash
# LP pool depth often insufficient when CEX users flood to DEX
# Treasury action: seed additional liquidity on Meteora DLMM / Orca

# Meteora DLMM — add concentrated liquidity around current price
# Install: npm install @meteora-ag/dlmm
npx ts-node << 'TSEOF'
import DLMM from "@meteora-ag/dlmm";
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(process.env.RPC_URL!);
const dlmmPool = await DLMM.create(connection, new PublicKey("<POOL_ADDRESS>"));
// Add ±20% range liquidity to absorb expected selling pressure
TSEOF

# Target: minimum $200K liquidity depth at ±5% price range
# during the withdrawal window
```

### Step 6 — Accelerate alternative exchange listings

```bash
# Check status of pending listing applications
# Standard listing package needed immediately:
# - Token audit report
# - Technical integration docs (Solana deposit/withdrawal)
# - Trading volume history (last 90 days)
# - Project deck + tokenomics

# Tier priorities (apply to all simultaneously):
# Tier 1: Bybit, OKX, Gate.io — 2-4 week turnaround
# Tier 2: MEXC, Bitget, HTX — 1-2 week turnaround (often easier)
# Tier 3: KuCoin, Phemex — 3-6 week turnaround
# Immediate fallback: ensure Jupiter aggregation is live (it likely already is)
```

---

## Medium-Term Actions (T+6h to T+7 days)

### Step 7 — Root cause and prevention

```
REGULATORY (most common):
  → Review token's legal structure with counsel
  → If US exchange: check Howey test compliance for utility token claim
  → Consider migrating primary listing to non-US exchanges
  → Load: skill/legal-compliance.md for jurisdiction analysis

VOLUME (exchange minimum not met):
  → Market-making was insufficient
  → Negotiate volume-based SLA with MM firm
  → Consider community trading incentive programs

TECHNICAL (Solana integration issue):
  → Usually fixable — contact exchange tech team directly
  → Provide updated Solana integration docs
```

---

## CLI Quick-Reference Card

```bash
# PASTE INTO #incident-delisting

EXCHANGE:        
DELISTING DATE:  
WITHDRAW BY:     
VOLUME IMPACT:   % of daily volume
TREASURY ON EXCHANGE: SOL/USDC amount

# Check token balance on exchange:
# (use exchange API or check exchange deposit address on-chain)
solana balance <EXCHANGE_DEPOSIT_ADDRESS>

# Boost DEX liquidity:
# src/incident/boost-lp.ts  ← implement before any incident

# Remaining exchange list:
# [UPDATE THIS LIST]
```

---

## Recovery Indicators

- [ ] All treasury funds withdrawn before trading halt
- [ ] Community notified within 4h of learning about delisting
- [ ] DEX liquidity boosted >$200K depth at ±5%
- [ ] At least one alternative listing application submitted within 48h
- [ ] Operators who had funds on exchange confirmed safe
- [ ] No significant node churn (operators still profitable on remaining venues)

## Cross-Skill Signals

If price crashes >30% as a result: also run `runbooks/token-price-crash.md`.
If operator economics break: fire `DEPIN_OPERATOR_ALERT` (severity: warning) to dashboard.
