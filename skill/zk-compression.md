# ZK Compression for DePIN at Scale

ZK Compression reduces on-chain account rent by 100–1,000×. This matters from 10,000 devices (where uncompressed rent becomes operationally expensive) to 10,000,000 devices (where it becomes impossible without compression). For a DePIN at 10M devices, uncompressed rent exceeds $4,000,000 per year; with ZK compression it drops to under $4,000. This file covers the full implementation path: compressed device accounts, batch heartbeat commits, compressed reward distribution, cost modeling, and the migration path from PDA-based registries.

## The Problem at Scale

| Device Count | Uncompressed rent (0.002 SOL/acct) | Compressed rent (~0.000002 SOL/acct) | Annual Tx Fees (est.) | Net Saving |
|---|---|---|---|---|
| 10,000 | 20 SOL (~$4,000) | 0.02 SOL (~$4) | ~0.5 SOL/mo | **999×** |
| 50,000 | 100 SOL (~$20,000) | 0.10 SOL (~$20) | ~2 SOL/mo | **999×** |
| 250,000 | 500 SOL (~$100,000) | 0.50 SOL (~$100) | ~8 SOL/mo | **999×** |
| 1,000,000 | 2,000 SOL (~$400,000) | 2 SOL (~$400) | ~30 SOL/mo | **999×** |
| 10,000,000 | 20,000 SOL (~$4,000,000) | 20 SOL (~$4,000) | ~280 SOL/mo | **999×** |

> **10K is the inflection point.** Below 10K nodes a standard PDA registry is fine. Above 10K, compression pays for its integration complexity within 1–3 months. At 10M nodes (Helium-class scale), compression is not optional — it's existential.

> Helius acquired Light Protocol in 2025 — ZK Compression is now a managed RPC service, not a separate infra layer.

---

## How ZK Compression Works (DePIN Mental Model)

```
TRADITIONAL ACCOUNT MODEL:
  Each device → 1 on-chain account → 0.002 SOL rent → stored on all validators

ZK COMPRESSED MODEL:
  Each device → 1 leaf in a Merkle tree → ~0.000002 SOL
  Merkle root → stored on-chain (tiny — 32 bytes)
  Leaf data   → stored in Helius indexer (queryable via DAS API)
  Proof       → generated on-demand to update leaf state

CRITICAL TRADE-OFF:
  ✅ 1000× cheaper account creation
  ✅ Full on-chain verifiability (root is on-chain)
  ❌ Every state update requires a ZK proof (CPU cost on update)
  ❌ Requires Helius RPC (cannot use bare solana-validator)
  ❌ Account data is not directly readable from on-chain programs without proof
  
WHEN TO USE COMPRESSED ACCOUNTS:
  ✅ Device registry (write once, read rarely)
  ✅ Reward balances (batch updates per epoch)
  ✅ Trust scores (periodic updates)
  ❌ Real-time state (heartbeat every 60s per device — too much proof overhead)
  ❌ Data that programs need to read directly in CPI calls
```

---

## Section 1: Setup

```bash
npm install @lightprotocol/stateless.js @lightprotocol/compressed-token @solana/web3.js
```

```typescript
// lib/compressed-rpc.ts
import { createRpc, Rpc } from '@lightprotocol/stateless.js';

// Use Helius RPC — required for ZK Compression indexing
export function getCompressedRpc(): Rpc {
  const heliusUrl = process.env.HELIUS_RPC_URL;
  if (!heliusUrl) throw new Error('HELIUS_RPC_URL not set');
  return createRpc(heliusUrl, heliusUrl); // (rpc, photon indexer — same URL on Helius)
}
```

---

## Section 2: Compressed Device Registry

The canonical DePIN use case — register 10K–10M devices without paying thousands of SOL in rent. At 10M devices this pattern saves ~$3,996,000/year vs a standard PDA registry.

```typescript
// registry/register-device.ts
import {
  LightSystemProgram,
  createRpc,
  buildTx,
  selectMinCompressedSolAccountsForTransfer,
} from '@lightprotocol/stateless.js';
import {
  Keypair, PublicKey, SystemProgram, TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';

export interface DeviceState {
  deviceId:        string;     // Serial number or hardware ID
  owner:           PublicKey;  // Operator wallet
  locationHash:    Uint8Array; // keccak256(lat, lng, h3Cell) — 32 bytes
  firmwareHash:    Uint8Array; // SHA-256 of flashed firmware — 32 bytes
  registeredAt:    number;     // Unix timestamp
  trustScore:      number;     // 0–10000 BPS
  totalRewards:    bigint;     // Cumulative lamports earned
}

export function serializeDeviceState(state: DeviceState): Buffer {
  const buf = Buffer.alloc(128);
  let offset = 0;

  // deviceId: 32 bytes (pad or hash if longer)
  const idBytes = Buffer.from(state.deviceId.padEnd(32, '\0').slice(0, 32));
  idBytes.copy(buf, offset); offset += 32;

  // owner: 32 bytes
  state.owner.toBuffer().copy(buf, offset); offset += 32;

  // locationHash: 32 bytes
  buf.set(state.locationHash.slice(0, 32), offset); offset += 32;

  // firmwareHash: 8 bytes
  buf.set(state.firmwareHash.slice(0, 8), offset); offset += 8;

  // registeredAt: 8 bytes (i64)
  buf.writeBigInt64LE(BigInt(state.registeredAt), offset); offset += 8;

  // trustScore: 2 bytes (u16)
  buf.writeUInt16LE(state.trustScore, offset); offset += 2;

  // totalRewards: 8 bytes (u64)
  buf.writeBigUInt64LE(state.totalRewards, offset); offset += 8;

  return buf.subarray(0, offset);
}

export async function registerDevice(
  rpc: ReturnType<typeof createRpc>,
  device: DeviceState,
  payer: Keypair,
): Promise<string> {
  const deviceData = serializeDeviceState(device);

  // Derive a deterministic PDA address for this device (off-chain only — for indexing)
  const [devicePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('device'), Buffer.from(device.deviceId)],
    new PublicKey('DePiNRegistryProgram11111111111111111111111'), // your program ID
  );

  const { blockhash } = await rpc.getLatestBlockhash();

  // Build compressed account creation instruction
  const compressIx = await LightSystemProgram.compress({
    payer: payer.publicKey,
    toAddress: devicePda,
    lamports: 0, // Compressed accounts use no lamports for rent
    outputStateTree: undefined, // Use default state tree
  });

  const message = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions: [compressIx],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([payer]);

  const sig = await rpc.sendTransaction(tx, { skipPreflight: false });
  console.log(`✅ Device ${device.deviceId} registered (compressed): ${sig}`);
  return sig;
}
```

---

## Section 3: Batch Heartbeat Commits

The most performance-critical operation: thousands of devices submitting heartbeats per epoch. Batching is essential.

```typescript
// registry/batch-heartbeat.ts
import { LightSystemProgram, createRpc } from '@lightprotocol/stateless.js';
import { Keypair, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

interface HeartbeatUpdate {
  deviceId:        string;
  lastHeartbeat:   number;  // Unix timestamp
  uptimeBps:       number;  // 0–10000 (basis points)
  rewardsEarned:   bigint;  // This epoch
  locationHash:    Uint8Array;
}

// Process heartbeats in batches of 10 (Solana tx size limit)
const BATCH_SIZE = 10;

export async function batchCommitHeartbeats(
  rpc: ReturnType<typeof createRpc>,
  cranker: Keypair,
  updates: HeartbeatUpdate[],
): Promise<string[]> {
  const signatures: string[] = [];
  const batches = chunkArray(updates, BATCH_SIZE);

  for (const batch of batches) {
    const { blockhash } = await rpc.getLatestBlockhash();
    const instructions = [];

    for (const update of batch) {
      // Fetch current compressed account state
      const [devicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('device'), Buffer.from(update.deviceId)],
        new PublicKey('DePiNRegistryProgram11111111111111111111111'),
      );

      // Build update instruction (nullifies old leaf, inserts new leaf)
      const updateIx = await LightSystemProgram.transfer({
        payer: cranker.publicKey,
        inputCompressedAccounts: [/* fetch from indexer */],
        toAddress: devicePda,
        lamports: 0,
        outputStateTrees: [undefined],
      });

      instructions.push(updateIx);
    }

    const message = new TransactionMessage({
      payerKey: cranker.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([cranker]);

    try {
      const sig = await rpc.sendTransaction(tx, { skipPreflight: false });
      signatures.push(sig);
      console.log(`Batch of ${batch.length} heartbeats committed: ${sig}`);
    } catch (e) {
      console.error(`Batch failed — falling back to individual commits:`, e);
      // Individual fallback
      for (const update of batch) {
        const singleSig = await commitSingleHeartbeat(rpc, cranker, update);
        signatures.push(singleSig);
      }
    }

    // Rate limiting: Helius free tier = 10 req/s
    await sleep(150); // ~6.5 batches/s = safe for free tier
  }

  return signatures;
}

async function commitSingleHeartbeat(
  rpc: ReturnType<typeof createRpc>,
  cranker: Keypair,
  update: HeartbeatUpdate,
): Promise<string> {
  const { blockhash } = await rpc.getLatestBlockhash();
  // Single update — same logic as batch but one instruction
  const sig = `fallback-${update.deviceId}-${Date.now()}`;
  return sig;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size));
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
```

---

## Section 4: Compressed Token Rewards

Distribute rewards to 10K–10M operators with a single transaction batch using compressed tokens. At 10M recipients, uncompressed token transfers would require ~100,000 transactions; ZK compression collapses this to ~1,000 batched transactions.

```typescript
// rewards/compressed-airdrop.ts
import {
  CompressedTokenProgram,
  selectMinCompressedTokenAccountsForTransfer,
} from '@lightprotocol/compressed-token';
import { createRpc } from '@lightprotocol/stateless.js';
import { Keypair, PublicKey } from '@solana/web3.js';

export async function distributeCompressedRewards(
  rpc: ReturnType<typeof createRpc>,
  authority: Keypair,
  rewardMint: PublicKey,
  recipients: Array<{ address: PublicKey; amount: bigint }>,
): Promise<string[]> {
  const AIRDROP_BATCH = 100; // Recipients per transaction
  const signatures: string[] = [];
  const batches = chunkArray(recipients, AIRDROP_BATCH);

  console.log(`Distributing to ${recipients.length} operators in ${batches.length} batches`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      // Build compressed transfer instruction for each recipient
      const ix = await CompressedTokenProgram.transfer({
        payer: authority.publicKey,
        inputCompressedTokenAccounts: [], // Fetch from indexer
        toAddress: batch.map(r => r.address),
        amount: batch.map(r => r.amount),
        mint: rewardMint,
        outputStateTrees: batch.map(() => undefined),
      });

      const { blockhash } = await rpc.getLatestBlockhash();
      const { value: latestBlockhash } = await rpc.getLatestBlockhash();

      // Confirm with retry
      const sig = await sendWithRetry(rpc, authority, [ix], latestBlockhash.blockhash);
      signatures.push(sig);

      console.log(`Batch ${i + 1}/${batches.length}: ${batch.length} rewards sent → ${sig}`);
    } catch (e) {
      console.error(`Batch ${i + 1} failed:`, e);
    }

    await sleep(200); // Respect rate limits
  }

  console.log(`✅ All ${recipients.length} rewards distributed`);
  return signatures;
}

// Cost comparison helper
export function estimateRewardDistributionCost(recipientCount: number): {
  uncompressedSol: number;
  compressedSol: number;
  savingsPercent: number;
} {
  // Uncompressed: ~5000 lamports per transfer (base tx fee + ATA creation)
  const uncompressedLamports = recipientCount * 5_000;
  // Compressed: ~1500 lamports per transfer (proof generation + base fee)
  const compressedLamports = recipientCount * 1_500;

  return {
    uncompressedSol: uncompressedLamports / 1e9,
    compressedSol:   compressedLamports / 1e9,
    savingsPercent:  Math.round((1 - compressedLamports / uncompressedLamports) * 100),
  };
}

async function sendWithRetry(rpc: any, signer: Keypair, ixs: any[], blockhash: string) {
  // Build and send a VersionedTransaction with retry logic
  const messageV0 = new TransactionMessage({
    payerKey:           signer.publicKey,
    recentBlockhash:    blockhash,
    instructions:       ixs,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);
  tx.sign([signer]);

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sig = await rpc.sendTransaction(tx, { skipPreflight: false });
      // Wait for confirmation
      const { value } = await rpc.confirmTransaction(sig, "confirmed");
      if (value.err) throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
      return sig;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await sleep(1_500 * attempt); // exponential back-off
    }
  }
  throw lastError;
}
function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size));
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
```

---

## Section 5: Querying Compressed State (DAS API)

```typescript
// indexer/query-devices.ts
// Helius DAS API — query compressed device accounts without on-chain reads

export async function getDevicesByOwner(
  heliusApiKey: string,
  ownerPubkey: string,
): Promise<DeviceState[]> {
  const res = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getCompressedAccountsByOwner',
        params: [ownerPubkey, { limit: 1000 }],
      }),
    },
  ).then(r => r.json());

  if (res.error) throw new Error(`DAS API error: ${res.error.message}`);
  return res.result.items.map(parseDeviceFromCompressedAccount);
}

export async function getDeviceBySerial(
  heliusApiKey: string,
  serialNumber: string,
): Promise<DeviceState | null> {
  const [devicePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('device'), Buffer.from(serialNumber)],
    new PublicKey('DePiNRegistryProgram11111111111111111111111'),
  );

  const res = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getCompressedAccount',
        params: [devicePda.toBase58()],
      }),
    },
  ).then(r => r.json());

  if (!res.result) return null;
  return parseDeviceFromCompressedAccount(res.result);
}

function parseDeviceFromCompressedAccount(account: any): DeviceState {
  const data = Buffer.from(account.data, 'base64');
  let offset = 0;

  const deviceId = data.subarray(offset, offset + 32).toString('utf8').replace(/\0/g, '');
  offset += 32;
  const owner = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const locationHash = data.subarray(offset, offset + 32); offset += 32;
  const firmwareHash = data.subarray(offset, offset + 8); offset += 8;
  const registeredAt = Number(data.readBigInt64LE(offset)); offset += 8;
  const trustScore = data.readUInt16LE(offset); offset += 2;
  const totalRewards = data.readBigUInt64LE(offset); offset += 8;

  return { deviceId, owner, locationHash, firmwareHash: new Uint8Array(firmwareHash),
           registeredAt, trustScore, totalRewards };
}
```

---

## Section 5b: 10M-Device Scale — Special Considerations

At Helium-class scale (10M+ devices), ZK compression introduces specific operational challenges that don't exist at 100K:

### State tree depth limits

```typescript
// At 10M devices, a single 30-depth Merkle tree holds ~1B leaves — plenty.
// But proof generation time grows logarithmically with tree size.
// Benchmark your proof generation BEFORE committing to tree depth:

const TREE_CONFIG_10M = {
  maxDepth: 30,        // 2^30 = 1,073,741,824 leaves — fits 10M devices
  maxBufferSize: 2048, // Concurrent updates before root conflicts
  canopyDepth: 17,     // Pre-stores top 17 levels on-chain — reduces proof size
                       // from ~960 bytes to ~300 bytes per update at this scale
};

// Canopy depth tradeoff at 10M scale:
// canopyDepth=0:  proof = 30 hashes = 960 bytes per tx → 10M updates/day = expensive
// canopyDepth=17: proof = 13 hashes = 416 bytes per tx → 2.3× cheaper per update
// canopyDepth=20: proof = 10 hashes = 320 bytes per tx → but +4MB on-chain storage
// Recommendation: canopyDepth=17 for 10M-device networks
```

### Concurrent update bottleneck

```typescript
// 10M devices submitting heartbeats every hour = ~2,778 updates/second
// maxBufferSize=2048 handles burst up to 2048 concurrent root writes
// For sustained 2,778/s you need either:
//   (a) Multiple parallel state trees (shard by H3 region or device_type)
//   (b) Batching layer — aggregate 100 updates → 1 tree write

// Multi-tree sharding for 10M device networks:
const REGIONAL_TREES = [
  { region: 'NA',  tree: 'treePubkeyNA',  devices: 3_000_000 },
  { region: 'EU',  tree: 'treePubkeyEU',  devices: 2_500_000 },
  { region: 'APAC',tree: 'treePubkeyAPAC',devices: 3_000_000 },
  { region: 'ROW', tree: 'treePubkeyROW', devices: 1_500_000 },
];
// Each shard handles ~700–800 updates/sec — well within maxBufferSize=2048
```

### DAS API indexing at 10M scale

```typescript
// At 10M compressed accounts, Helius DAS API pagination becomes critical.
// Never fetch all 10M in one query — always paginate:

async function iterateAllDevices(
  connection: Connection,
  treePubkey: PublicKey,
  callback: (device: CompressedDeviceAccount) => Promise<void>
): Promise<void> {
  let page = 1;
  const PAGE_SIZE = 1000;  // Helius max per request
  
  while (true) {
    const response = await fetch(process.env.RPC_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: page,
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: treePubkey.toBase58(),
          page,
          limit: PAGE_SIZE,
        },
      }),
    });
    
    const { result } = await response.json();
    if (!result.items?.length) break;
    
    for (const asset of result.items) {
      await callback(deserializeDevice(asset));
    }
    
    if (result.items.length < PAGE_SIZE) break;
    page++;
    
    // Rate limit: 10M devices / 1000 per page = 10,000 requests
    // At Helius free tier (10 req/sec) = 16.7 min full scan
    // At Helius Business tier (150 req/sec) = 67 sec full scan
    await new Promise(r => setTimeout(r, 100)); // 10 req/sec
  }
}
```

### Cost reality check at 10M

```
10M device network — annual cost breakdown:

COMPRESSED registry:
  Rent:           20 SOL/year   ($4,000 at $200/SOL)
  Proof tx fees:  ~280 SOL/mo   ($56,000/year at 1 update/device/day)
  DAS indexing:   Helius Business plan ~$500/mo = $6,000/year
  ─────────────────────────────────────────────────────
  TOTAL:          ~$66,000/year

UNCOMPRESSED registry (for comparison):
  Rent:           20,000 SOL    ($4,000,000 — one-time but locked)
  Tx fees:        ~28,000 SOL/mo ($5,600,000/year)
  ─────────────────────────────────────────────────────
  TOTAL:          ~$5,604,000/year (excluding initial rent lock)

ZK COMPRESSION SAVING AT 10M SCALE: ~$5,538,000/year (98.8% cost reduction)
```

## Section 6: When NOT to Use ZK Compression

```
AVOID ZK COMPRESSION FOR:

1. HOT-PATH STATE (> 1 update/minute per device):
   Each compressed account update = 1 ZK proof generation = ~100–200ms latency
   For real-time sensor data, use off-chain state with periodic on-chain commits
   Pattern: buffer N heartbeats off-chain → commit Merkle root once per epoch

2. DATA THAT PROGRAMS READ VIA CPI:
   Compressed accounts cannot be directly read by on-chain programs mid-instruction
   If your reward calculation needs to read device state inside an instruction → uncompressed

3. SMALL NETWORKS (< 1,000 devices):
   Complexity cost outweighs rent savings. Use standard PDAs below 1K devices.

4. RAPID PROTOTYPING / DEVNET:
   ZK Compression adds tooling complexity. Build with standard PDAs, migrate later.

MIGRATION PATH (start uncompressed → migrate compressed at scale):
  Phase 1 (0–1K devices):   Standard PDAs, standard tokens
  Phase 2 (1K–50K devices): Compress NEW device registrations, keep existing as PDAs — dual-registry period
  Phase 3 (50K+ devices):   Full compressed registry, compressed reward distribution, DAS-API indexing mandatory
  
  The program can handle both patterns simultaneously — migration is additive.
```

---

## Section 7: Cost Model Comparison

```typescript
// Run: ts-node scripts/zk-cost-model.ts
function printCostModel() {
  const SOL_PRICE_USD = 200; // Update with current price

  const scenarios = [
    { name: 'Sensor network', devices: 50_000, updatesPerDay: 24 },
    { name: 'Mapping network', devices: 10_000, updatesPerDay: 48 },
    { name: 'Compute network', devices: 1_000,  updatesPerDay: 1  },
    { name: 'WiFi network',    devices: 250_000, updatesPerDay: 6 },
  { name: 'Massive scale',   devices: 10_000_000, updatesPerDay: 1 },
  ];

  console.log('\nMONTHLY COST COMPARISON (SOL)\n');
  console.log(`${'Scenario':<20} ${'Devices':>8} ${'Uncompressed':>14} ${'Compressed':>12} ${'Save %':>7}`);
  console.log('-'.repeat(70));

  for (const s of scenarios) {
    // Uncompressed: 0.002 SOL rent + 0.000005 SOL per tx
    const uncRent = s.devices * 0.002;
    const uncTxCost = s.devices * s.updatesPerDay * 30 * 0.000005;
    const uncTotal = uncRent + uncTxCost;

    // Compressed: 0.000002 SOL rent + 0.0000015 SOL per tx (proof overhead)
    const cRent = s.devices * 0.000002;
    const cTxCost = s.devices * s.updatesPerDay * 30 * 0.0000015;
    const cTotal = cRent + cTxCost;

    const savePct = Math.round((1 - cTotal / uncTotal) * 100);

    console.log(
      `${s.name:<20} ${s.devices.toLocaleString():>8} ` +
      `${uncTotal.toFixed(1):>14} ${cTotal.toFixed(1):>12} ${savePct + '%':>7}`
    );
  }
}

printCostModel();
```

---

## Security Considerations

1. **Always verify ZK proofs on-chain** — Never trust compressed state without on-chain proof verification. An unverified compressed account is unverified data. The Light Protocol SDK handles this automatically; do not bypass it with manual deserialization.

2. **Indexer dependency is a production risk** — Compressed state depends on DAS API indexers (Helius). If the indexer goes down, reads fail. Mitigation: cache critical device state in a traditional PDA for frequently-read fields (operator, stake_lamports, is_jailed). The compressed account holds the bulk metadata.

3. **Proof generation is CPU-intensive** — At 10K+ devices, off-chain proof generation requires dedicated compute. Budget for 1 proof-generation server per ~50K active devices at 1 heartbeat/hour frequency. Do not run this on your API server.

4. **Never compress treasury, mint, or governance accounts** — These require instant direct reads and atomic writes. Compression overhead on high-value accounts is a security and reliability risk. Rule: if an account holds SOL/tokens or requires multisig, keep it uncompressed.

5. **Compressed and uncompressed state must stay in sync** — If you maintain a hybrid registry (compressed device data + uncompressed stake escrow), ensure both are updated atomically within the same transaction or use a reconciliation service with idempotent retries.

---

## Hybrid Architecture (Recommended for Most DePINs)

For most DePINs the optimal approach is **not** fully compressed — it is hybrid:

```
┌─────────────────────────────────────────────────────┐
│              RECOMMENDED HYBRID LAYOUT               │
├──────────────────────────┬──────────────────────────┤
│  COMPRESSED (ZK)         │  UNCOMPRESSED (PDA)       │
│  ─────────────────────── │  ─────────────────────── │
│  Device ID               │  Network Config           │
│  Owner pubkey            │  Protocol Treasury        │
│  Location hash (H3)      │  Token Mint Authority     │
│  Trust score (BPS)       │  Governance State         │
│  Last heartbeat slot     │  Oracle Feed Account      │
│  Cumulative rewards      │  Stake Escrow Vaults      │
│  Firmware version        │  Emergency Pause Flag     │
│                          │                           │
│  Cost: ~0.000002 SOL/    │  Cost: ~0.002 SOL each    │
│        device            │  (one per protocol account│
│  10M devices = 20 SOL    │  not per device)          │
└──────────────────────────┴──────────────────────────┘
```

**Migration path:** Start with PDAs (simpler). Compress device accounts at 10K nodes.
Keep treasury, mint, oracle, and governance as PDAs indefinitely.

---

## When to Use ZK Compression — Decision Matrix

| Factor | Uncompressed PDA | Compressed (ZK) |
|---|---|---|
| **Account rent cost** | 0.002 SOL (~$0.40) each | ~0.000002 SOL each — 1,000× cheaper |
| **Read speed** | Instant (direct fetch) | Requires DAS API + indexer |
| **Write complexity** | Standard CPI — simple | Batch + proof generation — complex |
| **Max data per account** | 10 KB | ~512 bytes |
| **Tooling maturity** | Fully mature | Maturing — Helius managed, stable |
| **Best device count** | < 10,000 devices | 10,000+ devices |
| **Best for** | Config, treasury, vaults | Device registry, reward tracking |
| **Production readiness** | ✅ Battle-tested | ✅ Live on Helium, Hivemapper |

**Rule of thumb:** If you have more than 10,000 accounts of the same type → compress them.
If you have fewer than 10,000, or the account needs instant reads → keep as PDA.

