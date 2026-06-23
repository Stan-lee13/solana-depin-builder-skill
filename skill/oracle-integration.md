# Oracle Integration — Real-World Data on Solana

Getting trustworthy real-world data from physical devices onto Solana is the hardest engineering problem in DePIN. This skill covers all viable approaches for 2026.

## The oracle design decision tree

```
Does your data have a cryptographic proof of correctness?
  YES → Can you use a ZK proof or TEE attestation?
    YES → Level 2: Use Switchboard + ZK verification
    NO  → Level 3: Cryptographic challenge-response
  NO  → Can you cross-validate across multiple independent devices?
    YES → Level 4: Statistical consensus oracle
    NO  → Level 5: Trusted centralized oracle (v1 only)
```

## Option 1: Switchboard v3 Custom Oracle (Recommended for most DePIN)

### What Switchboard gives you
- Permissionless oracle job creation
- Multiple off-chain data sources with aggregation
- On-chain result stored in a `PullFeed` account readable by your program
- Ed25519 signed attestations
- Slashing for dishonest oracles

### Setting up a Switchboard custom pull feed

```typescript
import * as sb from "@switchboard-xyz/on-demand";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";

const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=YOUR_KEY");

// Define your oracle job — what real-world data to fetch
const jobDefinition = {
  tasks: [
    {
      // Fetch sensor data from your device's API
      httpTask: {
        url: "https://api.yourdepin.io/device/{DEVICE_ID}/latest",
        headers: [{ key: "Authorization", value: "Bearer {API_KEY}" }],
      },
    },
    {
      // Parse the JSON response
      jsonParseTask: {
        path: "$.data.reading_value",
      },
    },
    {
      // Scale to integer (Switchboard uses integers)
      multiplyTask: {
        scalar: 1000, // Store with 3 decimal places
      },
    },
  ],
};

// Create the oracle job on-chain
const [job] = await sb.OracleJob.create(connection, {
  data: Buffer.from(JSON.stringify(jobDefinition)),
  authority: oracleAuthorityKeypair.publicKey,
});

// Create the pull feed (aggregates from multiple oracle nodes)
const [pullFeed] = await sb.PullFeed.create(connection, {
  queue: sb.MAINNET_GENESIS_HASH, // Use mainnet queue
  jobs: [job.publicKey],
  minSampleSize: 3,           // Require 3 oracle nodes to agree
  maxStalenessSeconds: 300,   // Max 5 minutes old
  maxVariance: 500,           // Max 0.5% variance between oracle nodes
  feedHash: Buffer.from("your-feed-identifier"),
});
```

### Reading Switchboard data in your Anchor program

```rust
use switchboard_on_demand::accounts::PullFeedAccountData;

#[derive(Accounts)]
pub struct SubmitWorkProof<'info> {
    pub node_account: Account<'info, NodeAccount>,
    
    /// CHECK: Validated via Switchboard SDK
    pub switchboard_feed: AccountInfo<'info>,
    
    // ... other accounts
}

pub fn submit_work_proof(ctx: Context<SubmitWorkProof>, epoch: u64) -> Result<()> {
    // Read Switchboard oracle value
    let feed = PullFeedAccountData::parse(&ctx.accounts.switchboard_feed)
        .map_err(|_| ErrorCode::InvalidOracleFeed)?;

    // Check freshness
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time - feed.result.timestamp <= 300, // 5 min max staleness
        ErrorCode::StaleOracleData
    );

    // Get the validated reading
    let reading_value = feed.result.value.try_into_i64()? as u64;

    // Apply your business logic
    let work_units = calculate_work_units(reading_value, &ctx.accounts.node_account);
    
    // Credit node for this epoch
    ctx.accounts.node_account.current_epoch_score += work_units;

    Ok(())
}
```

## Option 2: Custom Ed25519 Oracle (Most flexible)

For DePIN networks where Switchboard doesn't support your data type:

### Oracle architecture

```
Device
  → Reads real-world sensor/performs work
  → Signs reading with device keypair
  → Submits to Oracle Service API

Oracle Service (off-chain, TypeScript)
  → Receives device reading + device signature
  → Validates device signature against registered device_pubkey
  → Cross-validates against other data sources (optional)
  → Signs the validated result with oracle keypair
  → Stores result in Oracle Queue (BullMQ/Redis)

Crank Worker
  → Dequeues validated results
  → Submits to Solana program as signed proof
  → Program verifies oracle signature on-chain
```

### Oracle service implementation

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import express from "express";
import Bull from "bullmq";

const ORACLE_KEYPAIR = Keypair.fromSecretKey(
  Buffer.from(process.env.ORACLE_PRIVATE_KEY!, "base64")
);

const app = express();

app.post("/submit-reading", async (req, res) => {
  const { 
    device_pubkey,
    reading_value,
    reading_timestamp,
    device_signature,
    node_account_pubkey,
  } = req.body;

  // 1. Verify device signature
  const message = Buffer.from(
    `${device_pubkey}:${reading_value}:${reading_timestamp}`,
    "utf-8"
  );
  
  const devicePubkeyBytes = new PublicKey(device_pubkey).toBytes();
  const signatureBytes = Buffer.from(device_signature, "base64");
  
  const isValid = nacl.sign.detached.verify(
    message,
    signatureBytes,
    devicePubkeyBytes
  );
  
  if (!isValid) {
    return res.status(400).json({ error: "Invalid device signature" });
  }

  // 2. Cross-validate against external source (optional but recommended)
  const externalReading = await fetchExternalValidation(device_pubkey);
  const variance = Math.abs(reading_value - externalReading) / externalReading;
  
  if (variance > 0.1) { // >10% variance = suspicious
    await flagNodeForReview(node_account_pubkey, variance);
    return res.status(400).json({ error: "Reading out of acceptable variance" });
  }

  // 3. Oracle signs the validated result
  const validatedPayload = Buffer.from(
    `${node_account_pubkey}:${reading_value}:${reading_timestamp}:${Date.now()}`,
    "utf-8"
  );
  
  const oracleSignature = nacl.sign.detached(
    validatedPayload,
    ORACLE_KEYPAIR.secretKey
  );

  // 4. Queue for on-chain submission
  await proofQueue.add("submit-proof", {
    node_account: node_account_pubkey,
    reading_value,
    reading_timestamp,
    oracle_signature: Buffer.from(oracleSignature).toString("base64"),
    validated_payload: validatedPayload.toString("base64"),
  });

  res.json({ status: "queued", queue_id: proofQueue.id });
});
```

### Verifying oracle signature on-chain (Anchor)

```rust
use anchor_lang::solana_program::ed25519_program;

pub fn verify_oracle_signature(
    oracle_pubkey: &Pubkey,
    message: &[u8],
    signature: &[u8; 64],
    ed25519_ix_sysvar: &AccountInfo,
) -> Result<()> {
    // Use Solana's native Ed25519 precompile for efficient signature verification
    // This costs ~2,000 CU vs ~10,000 CU for pure on-chain verification
    
    let ix_data = ed25519_ix_sysvar.data.borrow();
    let num_signatures = ix_data[0];
    
    require!(num_signatures >= 1, ErrorCode::MissingEd25519Instruction);
    
    // Parse Ed25519 instruction and verify it matches our oracle pubkey + message
    // Implementation follows Solana's Ed25519SigVerifyInstruction format
    
    Ok(())
}
```

## Option 3: Trusted Execution Environment (TEE) — Most Trustworthy

For high-value DePIN networks requiring maximum trust:

### Using Marlin Oyster (Intel TDX on Solana)

```typescript
// Device code runs inside TEE — output is cryptographically attested
// The TEE attestation proves the code ran unmodified on genuine hardware

import { OysterClient } from "@marlinprotocol/oyster-sdk";

const oyster = new OysterClient({
  rpcUrl: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
  contractAddress: OYSTER_CONTRACT_ADDRESS,
});

// Deploy your oracle logic as a TEE job
const jobId = await oyster.createJob({
  image: "your-oracle-image:latest",    // Docker image with your oracle code
  operator: "trusted-operator-address",  // Verified TEE operator
  duration: 86400,                        // 24 hours
  metadata: {
    protocol: "YourDePIN",
    version: "1.0.0",
  },
});

// TEE attestation is automatically verifiable on-chain
// Your program can verify the execution was inside genuine Intel TDX hardware
```

## Oracle multi-source aggregation pattern

```typescript
// Aggregate from multiple sources for maximum reliability
async function aggregateDeviceReading(devicePubkey: string): Promise<{
  value: number;
  confidence: number;
  sources: string[];
}> {
  const sources = await Promise.allSettled([
    fetchFromDevice(devicePubkey),        // Direct device API
    fetchFromSwitchboard(devicePubkey),   // Switchboard oracle
    fetchFromThirdPartyAPI(devicePubkey), // External validation API
  ]);

  const successful = sources
    .filter((r): r is PromiseFulfilledResult<number> => r.status === "fulfilled")
    .map((r) => r.value);

  if (successful.length < 2) {
    throw new Error("Insufficient oracle sources");
  }

  // Median aggregation (resistant to outliers)
  const sorted = successful.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Confidence based on source agreement
  const maxDeviation = Math.max(...successful.map(v => Math.abs(v - median) / median));
  const confidence = Math.max(0, 1 - maxDeviation * 10); // 0-1 scale

  return { value: median, confidence, sources: ["device", "switchboard", "external"] };
}
```

## Proof submission crank

```typescript
// Runs continuously, submits validated proofs to Solana
import * as anchor from "@coral-xyz/anchor";
import Queue from "bullmq";

async function processCrank(connection: Connection, program: Program) {
  const worker = new Worker("proof-queue", async (job) => {
    const { node_account, reading_value, oracle_signature } = job.data;
    
    try {
      const tx = await program.methods
        .submitWorkProof(
          new anchor.BN(reading_value),
          Array.from(Buffer.from(oracle_signature, "base64")),
        )
        .accounts({
          nodeAccount: new PublicKey(node_account),
          oraclePubkey: ORACLE_KEYPAIR.publicKey,
          epochState: epochStatePDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc({
          // Use Jito for priority during high contention (epoch boundaries)
          skipPreflight: false,
          commitment: "confirmed",
        });

      console.log(`Proof submitted: ${tx}`);
    } catch (err) {
      // Retry logic with exponential backoff
      throw err; // BullMQ handles retry
    }
  }, {
    connection: redisConnection,
    concurrency: 10, // Submit 10 proofs in parallel
    settings: {
      backoffStrategies: {
        exponential: (attemptsMade) => Math.pow(2, attemptsMade) * 1000,
      },
    },
  });
}
```

## Oracle security checklist

- [ ] Oracle keypair stored in HSM or secure environment (never in code)
- [ ] Oracle pubkey registered on-chain and cannot be changed without multisig
- [ ] Proof payloads include: node_pubkey + value + timestamp + epoch (prevent replay)
- [ ] Timestamps validated on-chain (reject proofs > 5 minutes old)
- [ ] Rate limiting: max proofs per node per epoch enforced on-chain
- [ ] Oracle rotation plan: what happens if oracle keypair is compromised?
- [ ] Multiple oracle operators for decentralization roadmap (even if v1 is centralized)
