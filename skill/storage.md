# Storage DePIN — Distributed File Storage

Design for storage networks where nodes provide disk space to store and retrieve data on-chain. Pattern F from the DePIN architecture patterns.

## Pattern Overview

### Pattern F: Proof-of-Storage (Arweave/Filecoin-style)

**Best for:** Distributed file storage, archival, CDN, backup services

**How it works:**
- Node registers available storage capacity
- Client uploads file to network (sharded across nodes)
- Nodes store data and submit periodic storage proofs
- Client retrieves data by querying nodes
- Nodes earn based on stored data × uptime

**Proof mechanism:** Periodic challenge-response proving data is still stored
**Geographic unit:** N/A (storage is location-agnostic)
**Oracle:** Challenge issuance + proof verification service

## Storage Architecture

### Core Components

```rust
// Storage-specific account structures

#[account]
pub struct StorageNode {
    pub owner: Pubkey,
    pub device_pubkey: Pubkey,
    pub capacity_bytes: u64,          // Total storage capacity
    pub used_bytes: u64,               // Currently used
    pub available_bytes: u64,          // capacity - used
    pub storage_tier: StorageTier,     // Hot/Warm/Cold
    pub uptime_epochs: u32,
    pub proofs_submitted: u32,
    pub pending_rewards: u64,
    pub status: NodeStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum StorageTier {
    Hot,    // SSD, fast access, higher rewards
    Warm,   // HDD, standard access
    Cold,   // Archive, infrequent access
}

#[account]
pub struct StorageContract {
    pub client: Pubkey,
    pub file_hash: [u8; 32],          // SHA-256 of file
    pub file_size_bytes: u64,
    pub shard_count: u8,              // Number of shards
    pub redundancy: u8,                // Replication factor
    pub storage_duration_epochs: u64,
    pub reward_per_epoch: u64,
    pub created_at: i64,
    pub expires_at: i64,
}

#[account]
pub struct ShardAssignment {
    pub contract: Pubkey,
    pub node: Pubkey,
    pub shard_index: u8,
    pub shard_hash: [u8; 32],
    pub storage_proof: StorageProof,
    pub last_verified: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct StorageProof {
    pub challenge: [u8; 32],
    pub response: [u8; 32],
    pub proof_timestamp: i64,
}
```

## Proof-of-Storage Mechanism

### Challenge-Response Protocol

```typescript
// Challenge issuance by oracle

interface StorageChallenge {
  node_pubkey: string;
  contract_id: string;
  shard_index: number;
  challenge_hash: string;  // Random challenge
  challenge_timestamp: number;
  deadline: number;        // Must respond within 5 minutes
}

// Node response

interface StorageProofResponse {
  node_pubkey: string;
  contract_id: string;
  shard_index: number;
  challenge_hash: string;
  proof_data: {
    merkle_root: string;    // Merkle root of shard
    merkle_proof: string[]; // Proof that specific data is in shard
    data_sample: string;    // Random bytes from shard
  };
  device_signature: string;
  response_timestamp: number;
}

// Oracle verification

async function verifyStorageProof(response: StorageProofResponse): Promise<boolean> {
  // 1. Verify device signature
  const sigValid = await verifyDeviceSignature(
    response.node_pubkey,
    response.challenge_hash + response.proof_data.merkle_root,
    response.device_signature
  );
  if (!sigValid) return false;

  // 2. Verify merkle proof
  const merkleValid = await verifyMerkleProof(
    response.proof_data.merkle_root,
    response.proof_data.merkle_proof,
    response.proof_data.data_sample
  );
  if (!merkleValid) return false;

  // 3. Verify response time (within 5 minutes of challenge)
  const responseTime = response.response_timestamp - response.challenge_timestamp;
  if (responseTime > 300) return false;

  return true;
}
```

### On-Chain Verification

```rust
pub fn submit_storage_proof(
    ctx: Context<SubmitStorageProof>,
    proof: StorageProof,
) -> Result<()> {
    let shard = &mut ctx.accounts.shard_assignment;
    let node = &mut ctx.accounts.node_account;

    // Verify proof is not stale
    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time - proof.proof_timestamp <= 300,
        ErrorCode::StaleProof
    );

    // Verify oracle signature (oracle attests to proof validity)
    verify_oracle_signature(
        &ctx.accounts.oracle_config.oracle_pubkey,
        &proof.try_to_vec()?,
        &ctx.accounts.oracle_signature,
        &ctx.accounts.ed25519_sysvar,
    )?;

    // Update node stats
    node.proofs_submitted += 1;
    shard.last_verified = current_time;

    // Calculate reward based on stored data
    let reward = calculate_storage_reward(
        shard.storage_proof.response.len() as u64,
        node.storage_tier,
    );
    node.pending_rewards += reward;

    emit!(StorageProofVerified {
        node: node.owner,
        contract: shard.contract,
        shard_index: shard.shard_index,
    });

    Ok(())
}
```

## File Upload & Sharding

### Sharding Strategy

```typescript
// Split file into shards with redundancy

interface FileShard {
  index: number;
  data: Buffer;
  hash: string;  // SHA-256
  nodes: string[];  // Nodes storing this shard (for redundancy)
}

async function shardAndDistribute(
  file: Buffer,
  redundancy: number = 3,
  shardSize: number = 1024 * 1024 // 1MB shards
): Promise<FileShard[]> {
  const shards: FileShard[] = [];
  const totalShards = Math.ceil(file.length / shardSize);

  for (let i = 0; i < totalShards; i++) {
    const start = i * shardSize;
    const end = Math.min(start + shardSize, file.length);
    const shardData = file.slice(start, end);
    const shardHash = sha256(shardData);

    // Select nodes with available capacity
    const availableNodes = await selectStorageNodes(shardData.length, redundancy);

    shards.push({
      index: i,
      data: shardData,
      hash: shardHash,
      nodes: availableNodes,
    });

    // Upload to each node
    for (const node of availableNodes) {
      await uploadShardToNode(node, shardData, shardHash);
    }
  }

  return shards;
}

// Select nodes based on capacity and tier
async function selectStorageNodes(
  requiredBytes: number,
  count: number
): Promise<string[]> {
  const nodes = await queryStorageNodes({
    min_available_bytes: requiredBytes,
    status: "active",
    uptime_threshold: 0.95,
  });

  // Prioritize nodes with higher uptime and appropriate tier
  const sorted = nodes.sort((a, b) => {
    if (a.uptime !== b.uptime) return b.uptime - a.uptime;
    return a.storage_tier - b.storage_tier;
  });

  return sorted.slice(0, count).map(n => n.pubkey);
}
```

### File Retrieval

```typescript
// Reconstruct file from shards

async function retrieveFile(contractId: string): Promise<Buffer> {
  const contract = await getStorageContract(contractId);
  const shards: Buffer[] = [];

  for (let i = 0; i < contract.shard_count; i++) {
    // Get shard assignments
    const assignments = await getShardAssignments(contractId, i);

    // Try each node until we get a valid response
    let shardData: Buffer | null = null;
    for (const assignment of assignments) {
      try {
        const data = await downloadShardFromNode(assignment.node, i);
        const hash = sha256(data);

        if (hash === assignment.shard_hash) {
          shardData = data;
          break;
        }
      } catch (err) {
        // Try next node
        continue;
      }
    }

    if (!shardData) {
      throw new Error(`Failed to retrieve shard ${i} from any node`);
    }

    shards.push(shardData);
  }

  // Concatenate shards
  return Buffer.concat(shards);
}
```

## Storage Tier Economics

### Tier-Based Rewards

```typescript
interface StorageRewardCalculation {
  tier: StorageTier;
  stored_bytes: number;
  uptime: number;  // 0-1
  epoch_reward: number;
}

function calculateStorageReward(
  stored_bytes: number,
  tier: StorageTier,
  uptime: number
): number {
  const BASE_REWARD_PER_GB_PER_EPOCH = {
    hot: 0.5,    // $0.50 per GB per epoch
    warm: 0.2,   // $0.20 per GB per epoch
    cold: 0.05,  // $0.05 per GB per epoch
  };

  const baseReward = (stored_bytes / 1e9) * BASE_REWARD_PER_GB_PER_EPOCH[tier];
  const uptimeBonus = Math.min(uptime * 1.2, 1.2); // Max 20% bonus for perfect uptime

  return baseReward * uptimeBonus;
}
```

### Capacity Pricing

```typescript
// Price per GB per month by tier

const STORAGE_PRICING = {
  hot: {
    price_usd_per_gb_month: 2.50,
    min_uptime_requirement: 0.99,
    hardware_requirement: "SSD NVMe",
  },
  warm: {
    price_usd_per_gb_month: 0.50,
    min_uptime_requirement: 0.95,
    hardware_requirement: "HDD 7200RPM",
  },
  cold: {
    price_usd_per_gb_month: 0.10,
    min_uptime_requirement: 0.90,
    hardware_requirement: "HDD Archive",
  },
};
```

## Anti-Sybil for Storage

### Capacity Verification

```typescript
// Prevent fake storage claims

interface CapacityChallenge {
  node_pubkey: string;
  challenge_size: number;  // Amount of data to write
  challenge_data: Buffer;
  challenge_hash: string;
  deadline: number;
}

async function verifyStorageCapacity(
  node_pubkey: string,
  claimed_capacity: number
): Promise<boolean> {
  // Challenge: write 10% of claimed capacity
  const challengeSize = Math.floor(claimed_capacity * 0.1);
  const challengeData = generateRandomData(challengeSize);
  const challengeHash = sha256(challengeData);

  // Send challenge to node
  const challenge: CapacityChallenge = {
    node_pubkey,
    challenge_size: challengeSize,
    challenge_data: challengeData,
    challenge_hash,
    deadline: Date.now() + 300000, // 5 minutes
  };

  await sendCapacityChallenge(challenge);

  // Wait for node to write and respond
  const response = await waitForCapacityResponse(challenge_hash, 300000);

  if (!response) {
    // Node failed to write claimed capacity
    return false;
  }

  // Verify data was actually stored
  const retrievedData = await retrieveChallengeData(node_pubkey, challengeHash);
  const retrievedHash = sha256(retrievedData);

  return retrievedHash === challengeHash;
}
```

### Periodic Audits

```typescript
// Random subset of nodes audited each epoch

async function runStorageAudit(epoch: number): Promise<AuditResult[]> {
  const nodes = await getActiveStorageNodes();
  const auditSample = selectRandomSubset(nodes, 0.05); // Audit 5% of nodes

  const results: AuditResult[] = [];

  for (const node of auditSample) {
    const claimedCapacity = node.capacity_bytes;
    const verified = await verifyStorageCapacity(node.pubkey, claimedCapacity);

    results.push({
      node_pubkey: node.pubkey,
      claimed_capacity,
      verified,
      epoch,
    });

    if (!verified) {
      // Slash node for false capacity claim
      await slashNode(node.pubkey, 0.5); // 50% slash
    }
  }
  return results;
}
```

## Data Retrieval Optimization

### CDN Integration

```typescript
// Popular files cached on CDN nodes

interface CachePolicy {
  file_id: string;
  access_count: number;
  last_accessed: Date;
  cache_tier: "edge" | "regional" | "origin";
}

async function optimizeCaching(): Promise<void> {
  const popularFiles = await getPopularFiles(100); // Top 100 files

  for (const file of popularFiles) {
    if (file.access_count > 1000) {
      // Cache on edge nodes
      await cacheOnEdgeNodes(file.file_id);
    } else if (file.access_count > 100) {
      // Cache on regional nodes
      await cacheOnRegionalNodes(file.file_id);
    }
  }
}
```

### Geographic Distribution

```typescript
// Store data in multiple regions for availability

interface Region {
  name: string;
  node_count: number;
  available_capacity: number;
}

async function distributeGeographically(
  file_id: string,
  min_regions: number = 3
): Promise<void> {
  const regions = await getStorageRegions();
  const selectedRegions = regions
    .sort((a, b) => b.available_capacity - a.available_capacity)
    .slice(0, min_regions);

  for (const region of selectedRegions) {
    const nodes = await selectNodesInRegion(region.name, 2);
    await replicateToNodes(file_id, nodes);
  }
}
```

## Storage Security

### Encryption at Rest

```typescript
// Encrypt data before storage

interface EncryptedShard {
  data: Buffer;
  encryption_key: string;
  nonce: string;
}

async function encryptShard(
  shard: Buffer,
  client_key: string
): Promise<EncryptedShard> {
  const nonce = generateNonce();
  const encryptionKey = deriveEncryptionKey(client_key, nonce);

  const encrypted = await encryptAES256(shard, encryptionKey, nonce);

  return {
    data: encrypted,
    encryption_key: encryptionKey,
    nonce,
  };
}

// Client decrypts on retrieval
async function decryptShard(
  encrypted: EncryptedShard,
  client_key: string
): Promise<Buffer> {
  const encryptionKey = deriveEncryptionKey(client_key, encrypted.nonce);
  return await decryptAES256(encrypted.data, encryptionKey, encrypted.nonce);
}
```

### Data Integrity

```typescript
// Merkle tree for shard verification

interface MerkleTree {
  root: string;
  leaves: string[];
  depth: number;
}

function buildMerkleTree(shards: Buffer[]): MerkleTree {
  const leaves = shards.map(s => sha256(s));
  let level = leaves;

  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || level[i];
      nextLevel.push(sha256(left + right));
    }
    level = nextLevel;
  }

  return {
    root: level[0],
    leaves,
    depth: Math.ceil(Math.log2(leaves.length)),
  };
}

function generateMerkleProof(tree: MerkleTree, shardIndex: number): string[] {
  const proof: string[] = [];
  let index = shardIndex;

  for (let level = 0; level < tree.depth; level++) {
    const siblingIndex = index ^ 1;
    const levelSize = Math.ceil(tree.leaves.length / Math.pow(2, level));
    
    if (siblingIndex < levelSize) {
      proof.push(tree.leaves[siblingIndex]);
    }
    
    index = Math.floor(index / 2);
  }

  return proof;
}
```

## Integration with Other Skills

This skill integrates with:
- `skill/node-registry.md` — Storage nodes are a specialized node type
- `skill/oracle-integration.md` — Challenge issuance and proof verification
- `skill/reward-system.md` — Storage-specific reward calculations
- `skill/data-marketplace.md` — Stored data can be monetized

## Hardware Requirements

### Hot Storage (SSD)
- NVMe SSD with 1TB+ capacity
- 10Gbps network connection
- 99.9% uptime SLA
- Power: ~10W

### Warm Storage (HDD)
- HDD 7200RPM with 4TB+ capacity
- 1Gbps network connection
- 99% uptime SLA
- Power: ~6W

### Cold Storage (Archive)
- HDD 5400RPM with 8TB+ capacity
- 100Mbps network connection
- 95% uptime SLA
- Power: ~4W

## Storage Checklist

Before launching a storage DePIN:
- [ ] Sharding strategy defined (shard size, redundancy)
- [ ] Proof-of-storage mechanism implemented
- [ ] Capacity verification system operational
- [ ] Storage tier economics modeled
- [ ] Encryption at rest implemented
- [ ] Data integrity verification (Merkle trees)
- [ ] Geographic redundancy for availability
- [ ] CDN integration for popular files
- [ ] Retrieval optimization (caching, prefetching)
- [ ] Audit mechanism for capacity claims
