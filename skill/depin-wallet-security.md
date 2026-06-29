# Wallet Security for DePIN Operators

> Load this skill for the operator-side wallet security layer of a DePIN protocol.
> It covers: operator wallet architecture, treasury multisig design, device keypair
> security, session keys for proof submission, and wallet compromise response.
>
> This is the DePIN-specific extension of `solana-ux-skill/skill/wallet-engineering.md`.
> Load both for complete coverage.

---

## Engineering Philosophy

DePIN introduces a wallet complexity that single-user wallets do not have:
**multiple parties with different trust levels controlling different on-chain authorities.**

A DePIN protocol has at minimum:
- **Protocol team wallet** — upgrade authority, treasury, emission controller
- **Operator wallets** — register nodes, claim rewards (thousands of them)
- **Device keypairs** — sign proofs (one per hardware device)
- **Crank keypairs** — automated epoch finalization (server-side)

Each of these has different threat vectors, different security requirements, and different recovery paths. Conflating them is the root cause of most DePIN security incidents.

---

## Authority Architecture (Production Standard)

```
PROTOCOL TEAM AUTHORITIES
┌──────────────────────────────────────────────────────────────────┐
│  upgrade_authority        → Squads v4 multisig (3-of-5)         │
│  mint_authority           → Squads v4 multisig (3-of-5)         │
│  emission_controller      → Squads v4 multisig (2-of-3)         │
│  treasury                 → Squads v4 multisig (3-of-5)         │
│  pause_authority          → Single hot key + Squads as backup    │
│                             (pause must be fast; multisig slow)  │
└──────────────────────────────────────────────────────────────────┘
     ↑ Load: solana-incident-response-skill/skill/wallet-security.md
       if any of these keys are suspected compromised

CRANK KEYPAIRS (automated)
┌──────────────────────────────────────────────────────────────────┐
│  epoch_crank              → HSM or AWS KMS (never in .env)      │
│  oracle_submitter         → HSM or AWS KMS                      │
│  fee_payer                → Hot wallet, refilled regularly       │
│                             monitored via wallet-observability.md│
└──────────────────────────────────────────────────────────────────┘

OPERATOR WALLETS (external — not your keys)
┌──────────────────────────────────────────────────────────────────┐
│  Tier 1 (>$10K value):    Ledger or Squads recommended           │
│  Tier 2 ($1K-$10K):       Phantom / Backpack with strong PIN    │
│  Tier 3 (<$1K):           Any wallet acceptable                  │
│  Apply: wallet-engineering.md → Progressive Security Architecture│
└──────────────────────────────────────────────────────────────────┘

DEVICE KEYPAIRS (per-hardware)
┌──────────────────────────────────────────────────────────────────┐
│  Ed25519 keypair burned into firmware                            │
│  Never exposed over any API                                      │
│  Operator keypair ≠ device keypair (see node-registry.md)       │
│  Signs every proof — high-frequency, low-value operations        │
│  Compromise: jail node, slash stake, re-register new device key  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Crank Keypair Security (Often Neglected)

Crank keypairs are server-side signers that run 24/7. They are the most frequently compromised DePIN keypairs because developers treat them like application keys — stored in `.env` files and CI/CD pipelines.

### Secure Crank Key Management

```typescript
// ✅ PRODUCTION: Load crank key from AWS KMS (never in memory as raw bytes)
import { KMSClient, SignCommand, GetPublicKeyCommand } from "@aws-sdk/client-kms";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";

const kmsClient = new KMSClient({ region: process.env.AWS_REGION! });
const CRANK_KEY_ID = process.env.CRANK_KMS_KEY_ID!; // ARN of KMS key

// Get the public key (for registration / verification)
async function getCrankPublicKey(): Promise<PublicKey> {
  const cmd = new GetPublicKeyCommand({ KeyId: CRANK_KEY_ID });
  const res = await kmsClient.send(cmd);
  // KMS returns DER-encoded public key — extract the 32-byte Ed25519 key
  const pubkeyBytes = res.PublicKey!.slice(-32); // last 32 bytes of DER encoding
  return new PublicKey(pubkeyBytes);
}

// Sign a transaction using KMS (key never leaves AWS)
async function signWithKMS(
  tx: Transaction,
  publicKey: PublicKey
): Promise<Transaction> {
  const message = tx.serializeMessage();
  const cmd = new SignCommand({
    KeyId: CRANK_KEY_ID,
    Message: message,
    MessageType: "RAW",
    SigningAlgorithm: "ECDSA_SHA_256", // Use Ed25519 key in KMS
  });
  const res = await kmsClient.send(cmd);
  const signature = res.Signature!;
  tx.addSignature(publicKey, Buffer.from(signature));
  return tx;
}

// ❌ NEVER DO THIS — even in "dev" environment
const crankKey = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(process.env.CRANK_SECRET_KEY!))
);
// This approach means: one leaked .env = all crank authority is compromised
```

### Crank Keypair Rotation Protocol

```bash
#!/usr/bin/env bash
# rotate-crank-key.sh
# Run monthly or immediately after any suspected compromise.
# Safe to run on a live network — no downtime if done correctly.

# Step 1: Generate new crank key (in KMS, never locally)
echo "Generating new crank key in AWS KMS..."
NEW_KEY_ARN=$(aws kms create-key \
  --key-spec KEY_SPEC_ECC_NIST_P256 \
  --key-usage SIGN_VERIFY \
  --description "DePIN crank key $(date +%Y-%m)" \
  --query 'KeyMetadata.Arn' --output text)

echo "New key ARN: $NEW_KEY_ARN"

# Step 2: Update crank registration on-chain BEFORE disabling old key
# (The program must accept EITHER old or new key during transition window)
echo "Registering new crank key on-chain..."
# anchor run update-crank-key -- --new-key $NEW_KEY_PUBKEY

# Step 3: Deploy new crank service using new key
echo "Deploying crank service with new key..."
# kubectl set env deployment/epoch-crank CRANK_KMS_KEY_ID=$NEW_KEY_ARN

# Step 4: Verify new crank is submitting proofs successfully
echo "Monitoring for 2 epochs before retiring old key..."
sleep 120 # 2 minutes — verify in dashboards

# Step 5: Disable old key (scheduled deletion in KMS — 7 day minimum)
echo "Scheduling old key for deletion..."
aws kms schedule-key-deletion --key-id $OLD_KEY_ARN --pending-window-in-days 7
```

---

## Session Keys for Proof Submission

High-frequency proof submission (every 5-30 minutes per device) should never use
the operator's main wallet. Use the session key pattern from `wallet-engineering.md`.

```typescript
// depin/wallet/proof-session-key.ts
import { Keypair, PublicKey } from "@solana/web3.js";

/**
 * DePIN-specific session key configuration.
 *
 * The operator approves ONE transaction that registers a session key
 * for their node. The session key can ONLY call:
 *   - submit_proof instruction
 *   - Max 24 calls per epoch (matches on-chain rate limit)
 *   - Expires after 24 hours (one epoch)
 *   - Cannot transfer SOL, tokens, or delegate to others
 *
 * This eliminates the need for the operator to connect their wallet
 * for every proof submission — the automated firmware uses the session key.
 */
export interface DepinProofSessionConfig {
  programId: PublicKey;
  allowedInstructions: [2]; // [2] = submit_proof discriminator only
  maxCallsPerEpoch: 24;
  expiresAfterHours: 24;
  maxSolSpend: 0.01; // Enough for transaction fees only
}

export function createProofSessionKey(): {
  sessionKeypair: Keypair;
  config: DepinProofSessionConfig;
  createdAt: number;
} {
  return {
    sessionKeypair: Keypair.generate(), // ephemeral — firmware stores this
    config: {
      programId: new PublicKey(process.env.DEPIN_PROGRAM_ID!),
      allowedInstructions: [2],
      maxCallsPerEpoch: 24,
      expiresAfterHours: 24,
      maxSolSpend: 0.01,
    },
    createdAt: Date.now(),
  };
}

/**
 * The operator calls this ONCE per epoch to register the new session key.
 * Their Ledger / hardware wallet signs only this registration.
 * All subsequent proof submissions use the ephemeral session keypair.
 */
export async function buildSessionKeyRegistrationTx(
  operatorWallet: PublicKey,
  sessionKeypair: Keypair,
  programId: PublicKey
): Promise<string> {
  // Returns a base58 unsigned transaction that the operator signs
  // with their hardware wallet via the dApp UI
  return `Register session key ${sessionKeypair.publicKey.toString()} for operator ${operatorWallet.toString()} — valid for 24h`;
}
```

---

## Transaction Intent Verification for DePIN Operations

DePIN operators interact with three types of transactions. Each has a specific
risk profile that the wallet must communicate clearly.

```typescript
// depin/wallet/depin-intent.ts
// Extends analyzeTransactionIntent() from wallet-engineering.md for DePIN-specific instructions

export type DepinTxType =
  | "register_node"         // New: registers device keypair + escrows stake
  | "submit_proof"          // Routine: proof of work — low risk
  | "claim_rewards"         // Routine: withdraw earned tokens — low risk
  | "update_node"           // Moderate: changes node metadata
  | "close_node"            // High: closes account, returns stake
  | "register_session_key"  // Moderate: delegates signing for 24h
  | "governance_vote"       // Moderate: protocol governance
  | "unknown_depin_ix";     // High: unknown instruction on DePIN program

export const DEPIN_INTENT_DESCRIPTIONS: Record<DepinTxType, {
  humanReadable: string;
  risk: "safe" | "caution" | "danger";
  warning: string | null;
}> = {
  register_node: {
    humanReadable: "Register a new node — escrows your stake amount",
    risk: "caution",
    warning: "This locks your stake tokens in escrow. You will not be able to withdraw them until you close the node account.",
  },
  submit_proof: {
    humanReadable: "Submit proof of work for this epoch",
    risk: "safe",
    warning: null,
  },
  claim_rewards: {
    humanReadable: "Claim accumulated node rewards to your wallet",
    risk: "safe",
    warning: null,
  },
  update_node: {
    humanReadable: "Update node metadata or configuration",
    risk: "caution",
    warning: "Verify the new metadata URI is correct — incorrect metadata may affect reward eligibility.",
  },
  close_node: {
    humanReadable: "Close node account and return staked tokens",
    risk: "danger",
    warning: "⚠ This permanently removes your node from the network. Your stake will be returned, but you will lose your node's history and reputation score.",
  },
  register_session_key: {
    humanReadable: "Delegate proof submission to automated session key (24h)",
    risk: "caution",
    warning: "This delegates signing authority to an automated key. Only approve if you initiated this from your node's setup interface.",
  },
  governance_vote: {
    humanReadable: "Cast governance vote on protocol proposal",
    risk: "caution",
    warning: "Governance votes are final and on-chain. Verify the proposal ID matches the one you intended to vote on.",
  },
  unknown_depin_ix: {
    humanReadable: "Unknown DePIN instruction",
    risk: "danger",
    warning: "⚠ This instruction is not recognized. Do not approve unless you explicitly initiated this action from the official DePIN dashboard.",
  },
};
```

---

## Address Poisoning in DePIN Context

DePIN operators frequently copy-paste reward claim destinations and treasury addresses.
Address poisoning in DePIN has a specific pattern: attackers send dust from addresses
that match the protocol treasury or reward pool, causing operators to accidentally
send rewards to the attacker's address.

```typescript
// Extend detectAddressPoisoning() from wallet-engineering.md
// with DePIN-specific known addresses

export function buildDepinAddressGuard(
  protocolAddresses: {
    treasury: string;
    rewardPool: string;
    programId: string;
    oracleAddress: string;
  }
): (candidate: string) => { safe: boolean; warning: string | null } {
  const knownAddresses = Object.values(protocolAddresses);

  return (candidate: string) => {
    // Check against all known protocol addresses
    for (const known of knownAddresses) {
      if (candidate === known) return { safe: true, warning: null };

      const first6Match = candidate.slice(0, 6) === known.slice(0, 6);
      const last6Match = candidate.slice(-6) === known.slice(-6);

      if (first6Match && last6Match) {
        return {
          safe: false,
          warning: `⚠️ This address matches the first AND last 6 characters of a known DePIN protocol address. This is the signature of an address poisoning attack. Copy the address directly from the official dashboard — never from transaction history.`,
        };
      }
    }
    return { safe: true, warning: null };
  };
}
```

---

## DePIN Operator Wallet Security Checklist

A checklist specifically for DePIN node operators — not protocol teams.

**Before Registering a Node**
- [ ] Operator wallet uses hardware wallet (Ledger) if staking >$1,000
- [ ] Node account PDA verified before sending stake transaction
- [ ] `analyzeTransactionIntent` run — confirms `register_node` instruction type
- [ ] Stake amount confirmed — matches protocol's minimum requirement
- [ ] Node metadata URI points to your controlled storage (not third-party)

**For Automated Proof Submission**
- [ ] Session key pattern used — operator wallet NOT used for routine proofs
- [ ] Session key config scopes to `submit_proof` instruction only
- [ ] Session key expires every 24 hours — renewed per epoch
- [ ] Session key stored only in device firmware — never uploaded to cloud

**For Reward Claiming**
- [ ] Reward destination address verified character-by-character (all 44 chars)
- [ ] Address not copied from transaction history (address poisoning risk)
- [ ] `claim_rewards` instruction type confirmed before signing
- [ ] Address poisoning check run against known protocol addresses

**Crank Keypairs (Protocol Team)**
- [ ] Crank key in AWS KMS or HashiCorp Vault — never in `.env` or code
- [ ] Separate crank key per environment (devnet/mainnet never share keys)
- [ ] Crank key rotation scheduled (monthly minimum)
- [ ] Fee payer runway monitored (>48h minimum — alert configured)
- [ ] `WALLET_FEE_PAYER_CRITICAL` signal wired to on-call rotation

---

## Cross-Skill Signals — DePIN Wallet

```
DEPIN WALLET → INCIDENT RESPONSE:
  WALLET_KEY_COMPROMISED  (crank key, treasury, upgrade authority)
  → Load: solana-incident-response-skill/skill/wallet-security.md
  → Load: solana-incident-response-skill/skill/active-exploit-response.md

DEPIN WALLET → OBSERVABILITY:
  WALLET_FEE_PAYER_CRITICAL  (epoch crank fee payer low)
  → Load: Solana-observabilty-skill/skill/wallet-observability.md
  → Probe crank submissions — are they succeeding or failing?

DEPIN WALLET → UX:
  Signal to DePIN operator dashboard: session key expiry warning
  → Load: solana-ux-skill/skill/depin-dashboard-ux.md
  → Show "session key expires in 2 hours" warning in operator dashboard

INCIDENT RESPONSE → DEPIN WALLET:
  WALLET_KEY_COMPROMISED (any DePIN authority)
  → Pause reward distribution immediately
  → Load: skill/incident-response-integration.md
  → Rotate key before investigating how it was compromised
```
