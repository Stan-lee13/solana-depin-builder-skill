# Data Marketplace — Selling DePIN Data On-Chain

The demand side of your DePIN economy. Without real revenue from real consumers, your network is dependent entirely on token inflation — which eventually collapses. The data marketplace is how you create genuine protocol revenue.

## Marketplace architecture

```
DATA PRODUCERS (nodes)                DATA CONSUMERS
     │                                      │
     ▼                                      ▼
Node collects data              Consumer submits DataRequest
Node submits to oracle          (specifying: type, location, quantity, max_price)
Oracle validates + stores                  │
     │                                     ▼
     └──────────────► DATA MARKETPLACE ◄──┘
                           (on-chain)
                              │
                       Matching Engine
                      (off-chain crank)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             Fulfill request      Route payment
             to consumer          to contributing nodes
```

## On-chain marketplace program

### Account structures

```rust
// Data Request — posted by consumers
#[account]
pub struct DataRequest {
    pub requester: Pubkey,
    pub data_type: DataType,          // Weather, GPS, Bandwidth, Compute, etc.
    pub geo_filter: GeoFilter,        // H3 hex + radius, or global
    pub time_range: TimeRange,        // Start/end unix timestamps
    pub quality_min: u16,             // Minimum data quality score (0-1000)
    pub max_price_per_unit: u64,      // Max tokens willing to pay per data unit
    pub total_budget: u64,            // Total token budget locked
    pub fulfillment_deadline: i64,    // Unix timestamp
    pub status: RequestStatus,        // Open / Partially Filled / Filled / Expired
    pub units_requested: u32,
    pub units_fulfilled: u32,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DataType {
    WeatherTemperature,
    WeatherHumidity,
    AirQualityPM25,
    GpsRtkCorrections,
    BandwidthProxy,
    ComputeGpu,
    MappingStreetLevel,
    WirelessCoverage,
    Custom(String),
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GeoFilter {
    pub h3_indices: Vec<u64>,          // Target hexagons (empty = global)
    pub resolution: u8,
}

// Data Offer — posted by nodes (or automatically by oracle)
#[account]
pub struct DataOffer {
    pub node: Pubkey,
    pub data_type: DataType,
    pub h3_index: u64,
    pub data_hash: [u8; 32],           // SHA256 of actual data
    pub data_uri: String,              // Encrypted data on Arweave/IPFS
    pub encryption_key_hash: [u8; 32], // Released to consumer after payment
    pub quality_score: u16,
    pub timestamp: i64,
    pub price_per_unit: u64,
    pub status: OfferStatus,
    pub bump: u8,
}
```

### Subscription model (recurring revenue)

```rust
#[account]
pub struct DataSubscription {
    pub subscriber: Pubkey,
    pub data_type: DataType,
    pub geo_filter: GeoFilter,
    pub price_per_epoch: u64,           // Tokens per epoch
    pub payment_vault: Pubkey,          // Pre-funded token account
    pub quality_min: u16,
    pub active: bool,
    pub epochs_paid: u64,
    pub created_at: i64,
    pub bump: u8,
}

pub fn create_subscription(
    ctx: Context<CreateSubscription>,
    data_type: DataType,
    geo_filter: GeoFilter,
    price_per_epoch: u64,
    initial_funding_epochs: u8,         // Fund N epochs upfront
    quality_min: u16,
) -> Result<()> {
    // Lock initial funding in vault
    let initial_deposit = price_per_epoch * initial_funding_epochs as u64;
    
    anchor_spl::token::transfer(
        CpiContext::new(/* ... */),
        initial_deposit,
    )?;
    
    let sub = &mut ctx.accounts.subscription;
    sub.subscriber = ctx.accounts.subscriber.key();
    sub.data_type = data_type;
    sub.geo_filter = geo_filter;
    sub.price_per_epoch = price_per_epoch;
    sub.quality_min = quality_min;
    sub.active = true;
    sub.epochs_paid = 0;
    
    Ok(())
}
```

### Revenue distribution to nodes

```typescript
// Off-chain crank: distribute subscription revenue to contributing nodes
async function distributeSubscriptionRevenue(
  subscriptionPubkey: PublicKey,
  epoch: number
) {
  const subscription = await program.account.dataSubscription.fetch(subscriptionPubkey);
  
  // Find all nodes that contributed data matching this subscription this epoch
  const contributingNodes = await findContributingNodes(
    subscription.dataType,
    subscription.geoFilter,
    epoch,
    subscription.qualityMin
  );
  
  if (contributingNodes.length === 0) return;
  
  const revenuePerNode = subscription.pricePerEpoch / BigInt(contributingNodes.length);
  
  // Protocol takes a cut (5-10% is standard)
  const PROTOCOL_FEE_BPS = 500; // 5%
  const protocolFee = (subscription.pricePerEpoch * BigInt(PROTOCOL_FEE_BPS)) / BigInt(10000);
  const nodeRevenue = subscription.pricePerEpoch - protocolFee;
  const perNodeRevenue = nodeRevenue / BigInt(contributingNodes.length);
  
  // Distribute on-chain
  const tx = await program.methods
    .distributeSubscriptionRevenue(epoch, contributingNodes.map(n => n.pubkey))
    .accounts({ subscription: subscriptionPubkey })
    .rpc();
}
```

## Data delivery — encrypted data flow

### 1. Node encrypts and uploads data

```typescript
import * as crypto from "crypto";

async function uploadEncryptedData(
  rawData: Buffer,
  consumerPublicKey?: PublicKey // If known; else use protocol key
): Promise<{ dataUri: string; encryptionKeyHash: string; dataHash: string }> {
  // Generate ephemeral AES-256 key
  const encryptionKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  // Encrypt the data
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(rawData), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Package encrypted payload
  const payload = Buffer.concat([iv, authTag, encrypted]);
  
  // Upload to Arweave (permanent, decentralized)
  const irys = new Irys({ url: "https://node1.irys.xyz", token: "solana", key: deviceKey });
  const receipt = await irys.upload(payload, {
    tags: [
      { name: "Content-Type", value: "application/octet-stream" },
      { name: "App-Name", value: "YourDePIN-DataMarket" },
      { name: "Encrypted", value: "true" },
      { name: "DataType", value: dataType },
    ],
  });
  
  return {
    dataUri: `https://arweave.net/${receipt.id}`,
    encryptionKeyHash: crypto.createHash("sha256").update(encryptionKey).digest("hex"),
    dataHash: crypto.createHash("sha256").update(rawData).digest("hex"),
    // Store encryptionKey securely — only revealed after confirmed payment
    _encryptionKey: encryptionKey.toString("hex"),
  };
}
```

### 2. Consumer pays → key revealed (atomic swap)

```typescript
// Using Solana's atomic instructions: pay + reveal in one transaction
async function atomicPayAndReveal(
  requestPubkey: PublicKey,
  offerPubkey: PublicKey,
  encryptionKey: string  // Only the node knows this
): Promise<string> {
  const tx = await program.methods
    .fulfillDataRequest(Buffer.from(encryptionKey, "hex"))
    .accounts({
      dataRequest: requestPubkey,
      dataOffer: offerPubkey,
      node: nodeKeypair.publicKey,
      // ... payment accounts
    })
    .rpc();
  
  return tx;
}
```

## Pricing models

### Per-unit pricing (spot market)

```typescript
// Dynamic pricing based on supply and demand
function calculateSpotPrice(
  dataType: DataType,
  h3Index: string,
  availableSupply: number,   // Active nodes that can serve this request
  demandQueue: number        // Pending requests for this data
): bigint {
  const BASE_PRICE = BigInt(1_000_000); // 0.001 tokens (9 decimals)
  
  // Supply/demand adjustment
  const supplyDemandRatio = availableSupply / Math.max(demandQueue, 1);
  
  let priceMultiplier: number;
  if (supplyDemandRatio > 10) priceMultiplier = 0.5;      // Abundant supply → cheap
  else if (supplyDemandRatio > 3) priceMultiplier = 1.0;  // Balanced
  else if (supplyDemandRatio > 1) priceMultiplier = 2.0;  // Tight supply
  else priceMultiplier = 5.0;                              // Very scarce → premium
  
  // Geographic rarity bonus (harder to get data from = higher price)
  const hexDensity = getNodeDensityForHex(h3Index);
  const rarityMultiplier = hexDensity < 2 ? 1.5 : 1.0;
  
  return BigInt(Math.round(Number(BASE_PRICE) * priceMultiplier * rarityMultiplier));
}
```

### SLA-backed subscriptions (premium tier)

```typescript
interface SLASubscription {
  data_type: DataType;
  guaranteed_uptime_pct: number;    // e.g., 99.5%
  max_latency_seconds: number;      // e.g., 60 seconds from reading to delivery
  data_quality_guaranteed: number;  // Minimum quality score
  price_premium_multiplier: number; // 2-5x spot price
  penalty_per_breach_tokens: bigint; // SLA breach compensation
}
```

## Consumer SDK

```typescript
// Clean SDK for data consumers
import { DePINDataClient } from "@yourprotocol/data-sdk";

const client = new DePINDataClient({
  rpcUrl: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
  programId: DEPIN_PROGRAM_ID,
  payer: consumerKeypair,
});

// Spot request
const weatherData = await client.requestData({
  type: "WeatherTemperature",
  location: { lat: 6.4541, lng: 3.3947 }, // Lagos
  maxAgeSecs: 600,                          // Data can be up to 10 min old
  maxPriceTokens: 0.01,
  quality: "standard",
});

// Streaming subscription
const subscription = await client.subscribe({
  type: "AirQualityPM25",
  hexIndices: ["8826e1c4fffffff", "8826e1ccfffffff"],
  intervalSecs: 300,                        // Every 5 minutes
  budgetTokensPerMonth: 100,
});

subscription.on("data", (reading) => {
  console.log(`PM2.5 at ${reading.location}: ${reading.value} μg/m³`);
});
```
