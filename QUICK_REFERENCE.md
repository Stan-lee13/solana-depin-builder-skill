# DePIN Builder Skill — Quick Reference

Common code snippets and patterns for DePIN development on Solana.

## Anchor Program Boilerplate

### Initialize Network Config

```rust
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + NetworkConfig::INIT_SPACE,
        seeds = [b"network-config"],
        bump
    )]
    pub network_config: Account<'info, NetworkConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NetworkConfig {
    pub authority: Pubkey,
    pub epoch_length_secs: u64,
    pub min_stake_lamports: u64,
    pub paused: bool,
    pub total_nodes: u64,
    pub bump: u8,
}

impl Space for NetworkConfig {
    const INIT_SPACE: usize = 32 + 8 + 8 + 1 + 8 + 1;
}
```

### Register Node

```rust
#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = operator,
        space = 8 + NodeAccount::INIT_SPACE,
        seeds = [b"node", operator.key().as_ref()],
        bump
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        init,
        payer = operator,
        space = 8,
        seeds = [b"stake-vault", operator.key().as_ref()],
        bump
    )]
    pub stake_vault: SystemAccount<'info>,
    
    #[account(
        seeds = [b"network-config"],
        bump
    )]
    pub network_config: Account<'info, NetworkConfig>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NodeAccount {
    pub operator: Pubkey,
    pub device_pubkey: [u8; 32],
    pub node_type: NodeType,
    pub stake_lamports: u64,
    pub is_jailed: bool,
    pub proofs_this_epoch: u32,
    pub total_proofs: u64,
    pub pending_rewards_lamports: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum NodeType {
    Connectivity,
    Sensor,
    Compute,
    Storage,
}
```

### Submit Proof

```rust
#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(
        mut,
        seeds = [b"node", operator.key().as_ref()],
        bump = node_account.bump
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(
        seeds = [b"network-config"],
        bump = network_config.bump
    )]
    pub network_config: Account<'info, NetworkConfig>,
    
    pub operator: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ProofPayload {
    pub device_pubkey: [u8; 32],
    pub epoch: u64,
    pub timestamp: i64,
    pub proof_type: ProofType,
    pub score: u8,
    pub data: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum ProofType {
    CoverageBeacon,
    SensorReading,
    ComputeResult,
    StorageProof,
}
```

## TypeScript Code Snippets

### Connect to Solana

```typescript
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const connection = new Connection("https://api.devnet.solana.com");
const operator = Keypair.generate();
```

### Submit Transaction

```typescript
import { Transaction, SystemProgram } from "@solana/web3.js";

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: operator.publicKey,
    toPubkey: new PublicKey("..."),
    lamports: 1_000_000_000, // 1 SOL
  })
);

const signature = await connection.sendTransaction(
  transaction,
  [operator]
);

await connection.confirmTransaction(signature);
```

### H3 Hex Encoding

```typescript
import { h3ToParent, h3ToChildren } from "h3-js";

const hex = "8826e1c4fffffff";
const parent = h3ToParent(hex, 7); // Get parent at resolution 7
const children = h3ToChildren(hex); // Get children at next resolution
```

### Ed25519 Signature

```typescript
import { sign } from "@noble/ed25519";

const message = new TextEncoder().encode("proof data");
const privateKey = operator.secretKey.slice(0, 32);
const signature = sign(message, privateKey);
```

## Oracle Integration

### Switchboard v3 Setup

```typescript
import * as sb from "@switchboard-xyz/on-demand";

const oracle = await sb.Oracle.create(connection, operator.publicKey);
const feed = await sb.PullFeed.create(connection, operator, {
    oracle: oracle,
    maxUpdateDelaySec: 60,
});
```

### Custom Oracle Signature Verification

```typescript
import { verify } from "@noble/ed25519";

const oraclePubkey = new PublicKey("...");
const isValid = verify(
  oraclePubkey.toBytes(),
  message,
  signature
);
```

## Testing Patterns

### Anchor Test Setup

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

describe("depin-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DepinRegistry as Program<DepinRegistry>;
  const authority = provider.wallet as anchor.Wallet;

  it("initializes network config", async () => {
    await program.methods
      .initialize(86400, 100_000_000)
      .accounts({
        networkConfig: networkConfigPDA,
        authority: authority.publicKey,
      })
      .rpc();
  });
});
```

### Jest Test Setup

```typescript
import { calculateNodeEconomics } from "../src/roi-calculator";

describe("ROI Calculator", () => {
  it("calculates breakeven correctly", () => {
    const input = {
      total_supply: 10_000_000_000n,
      node_reward_pct: 40,
      duration_years: 5,
      epoch_length_hours: 24,
      schedule_type: "halving" as const,
      target_nodes_by_year: [500, 2000, 5000],
      hardware_cost_usd: 400,
      monthly_opex_usd: 8,
      token_launch_price_usd: 0.05,
    };

    const result = calculateNodeEconomics(input);
    expect(result.breakeven_months).toBeGreaterThan(0);
  });
});
```

## Common Errors & Solutions

### Account Already Initialized

```rust
// Error: Account already initialized
// Solution: Check if account exists before init

#[account(
    init_if_needed,
    payer = authority,
    space = 8 + MyAccount::INIT_SPACE,
    seeds = [b"my-account"],
    bump
)]
pub my_account: Account<'info, MyAccount>,
```

### Invalid Signature

```typescript
// Error: Signature verification failed
// Solution: Ensure correct keypair is signing

const signature = await connection.sendTransaction(
  transaction,
  [operator], // Must include operator keypair
);
```

### Insufficient Funds

```typescript
// Error: Insufficient funds for transaction
// Solution: Airdrop SOL on devnet

await connection.requestAirdrop(
  operator.publicKey,
  2 * LAMPORTS_PER_SOL
);
```

## Deployment Checklist

- [ ] Build program: `anchor build`
- [ ] Run tests: `anchor test`
- [ ] Deploy to devnet: `anchor deploy --provider.cluster devnet`
- [ ] Verify on Solscan
- [ ] Initialize network config
- [ ] Test emergency pause
- [ ] Configure monitoring
- [ ] Set up alerting
- [ ] Deploy to mainnet: `anchor deploy --provider.cluster mainnet`
- [ ] Secure authority keys (HSM)

## Useful Commands

```bash
# Build Anchor program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet

# Upgrade program
anchor upgrade <PROGRAM_ID> --program-id <PROGRAM_ID>

# Verify program
anchor verify <PROGRAM_ID>

# Run TypeScript tests
npm test

# Run TypeScript with coverage
npm run test:coverage

# Lint markdown
markdownlint '**/*.md'
```

## Resources

- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Switchboard Docs](https://switchboard.xyz/docs)
- [H3 Documentation](https://h3geo.org/docs/)
- [Solana CLI](https://docs.solana.com/cli)
