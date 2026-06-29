# Governance Attack — Incident Response Runbook

**Severity:** P0
**Response SLA:** Acknowledge in 5 min, triage in 15 min
**Owner:** Protocol security lead + multisig signers

## Trigger Conditions

- Malicious proposal submitted targeting treasury, upgrade authority, or emission controller
- Single wallet accumulating governance tokens faster than organic rate (>5%/week)
- Voting power spike: unknown wallet crosses quorum threshold
- On-chain timelock expiring on a proposal the team didn't author

---

## Immediate Actions (T+0 to T+15 min)

### Step 1 — Confirm and triage the attack

```bash
# Identify all open governance proposals
spl-governance get-proposals \
  --program-id GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw \
  --realm <YOUR_REALM_PUBKEY> \
  --rpc-url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY

# Check voting power of proposer
spl-governance get-token-owner-record \
  --realm <YOUR_REALM_PUBKEY> \
  --governing-token-mint <YOUR_TOKEN_MINT> \
  --governing-token-owner <ATTACKER_WALLET>

# Check current vote counts — are we losing?
spl-governance get-proposal \
  --proposal <PROPOSAL_PUBKEY>
```

```typescript
// src/governance/triage.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { getGovernanceProgramVersion, getProposal, getProposalInstructions } from "@solana/spl-governance";

async function triageGovernanceProposal(proposalPubkey: string) {
  const connection = new Connection(process.env.RPC_URL!);
  const programId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

  const proposal = await getProposal(connection, new PublicKey(proposalPubkey));
  const instructions = await getProposalInstructions(connection, programId, new PublicKey(proposalPubkey));

  console.log("Proposal state:", proposal.account.state);
  console.log("Yes votes:", proposal.account.getYesVoteCount().toString());
  console.log("No votes:", proposal.account.getNoVoteCount().toString());
  console.log("Voting ends:", new Date(proposal.account.votingCompletedAt?.toNumber()! * 1000));

  // Decode each instruction to see what it would execute
  for (const ix of instructions) {
    console.log("Instruction program:", ix.account.getSingleInstruction().programId.toString());
    console.log("Instruction data (hex):", Buffer.from(ix.account.getSingleInstruction().data).toString("hex"));
  }
}
```

**What to look for:**
- Does the proposal call `set_governance_config` → reduces vote threshold = attack
- Does it call `transfer` on treasury accounts → drain
- Does it call `upgrade` on the program → backdoor
- Does it call `set_realm_authority` → full takeover

### Step 2 — Cast emergency no vote from all team wallets

```bash
# Vote NO immediately with every team wallet that holds governance tokens
spl-governance cast-vote \
  --proposal <PROPOSAL_PUBKEY> \
  --vote Deny \
  --keypair ~/.config/solana/team-wallet.json \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY

# If you have a Squads multisig with governance power — initiate proposal to vote No
# Via Squads UI: app.squads.so → create transaction → spl-governance cast-vote Deny
```

### Step 3 — Alert community (Discord + Twitter, <10 min)

```
⚠️ GOVERNANCE ALERT: A malicious proposal has been submitted to [PROTOCOL] governance.

Proposal: [PROPOSAL_PUBKEY short]
What it does: [plain-language description — be specific]
Current yes votes: [X]  No votes: [Y]
Voting ends: [DATETIME UTC]

We are voting NO. If you hold [TOKEN], please vote NO immediately at [GOVERNANCE_URL].

DO NOT vote yes. This proposal would [specific harm].
```

---

## Short-Term Actions (T+15 to T+60 min)

### Step 4 — Activate friendly whale network

```bash
# Identify top 20 token holders who are not the attacker
# Use Helius DAS API
curl "https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "getTokenAccounts",
    "params": {"mint": "YOUR_TOKEN_MINT", "limit": 20}
  }' | jq '.result.token_accounts | sort_by(.amount) | reverse | .[0:20]'

# DM each directly via Discord/Telegram — provide voting link
# Target: achieve >quorum in No votes before attacker can accumulate more Yes votes
```

### Step 5 — Execute emergency veto (if your governance has it)

```bash
# If realm has a Council (multisig that can veto):
spl-governance cancel-proposal \
  --proposal <PROPOSAL_PUBKEY> \
  --keypair ~/.config/solana/council-keypair.json

# Or via Squads SDK — create and immediately approve a cancel-proposal tx
import { Multisig } from "@sqds/multisig";
const { blockhash } = await connection.getLatestBlockhash();
const tx = await Multisig.cancelProposal({
  proposalAddress: new PublicKey(proposalPubkey),
  ...
});
```

### Step 6 — If proposal is passing — emergency pause the program

```bash
# Only use if proposal will execute and execute means irreversible damage
# This buys time — the program halts, proposal executes but has no effect

anchor invoke --program-id <YOUR_PROGRAM_ID> \
  --instruction-name emergency_pause \
  --accounts "network_config=<CONFIG_PDA>,authority=<PAUSE_AUTHORITY>" \
  --keypair ~/.config/solana/pause-authority.json
```

---

## Medium-Term Actions (T+1h to T+24h)

### Step 7 — Investigate attacker wallet

```bash
# Full transaction history of attacker wallet
curl "https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "getSignaturesForAddress",
    "params": ["<ATTACKER_WALLET>", {"limit": 100}]
  }' | jq '.result[].signature'

# Check where they got the tokens — flash loan? OTC? Accumulation?
# Look for: single large buy just before proposal, coordinated buys from multiple wallets
# Report to exchanges if wash trading detected
```

### Step 8 — Harden governance parameters (after attack is neutralized)

```typescript
// Submit a legitimate proposal to tighten governance rules
// Standard hardening after a governance attack:

const hardeningProposal = {
  name: "Governance Security Hardening",
  changes: [
    { param: "vote_threshold_percentage", from: current, to: Math.max(current + 10, 60) },
    { param: "min_community_tokens_to_create_proposal", from: current, to: current * 10 },
    { param: "voting_cool_off_time", from: 0, to: 86400 },   // 24h cool-off before execution
    { param: "deposit_exempt_proposal_count", from: current, to: 0 },  // require deposit for all proposals
  ],
};
```

---

## CLI Quick-Reference Card

```bash
# PASTE THIS INTO #incident-governance-attack CHANNEL IMMEDIATELY

PROPOSAL:   <PROPOSAL_PUBKEY>
REALM:      <REALM_PUBKEY>
ATTACKER:   <ATTACKER_WALLET>
VOTE ENDS:  <DATETIME>

# Vote NO (all team members run this):
spl-governance cast-vote --proposal <PROPOSAL_PUBKEY> --vote Deny --keypair <YOUR_KEY>

# Check current vote state:
spl-governance get-proposal --proposal <PROPOSAL_PUBKEY>

# Community voting link:
https://app.realms.today/dao/<REALM_PUBKEY>/proposal/<PROPOSAL_PUBKEY>

# Emergency pause (last resort):
# Load skill/incident-response-integration.md → program-freeze-and-pause.md
```

---

## Recovery Indicators

- [ ] Proposal defeated (No votes > Yes votes before deadline)
- [ ] Or proposal cancelled via council veto
- [ ] Attacker wallet blacklisted in governance (if program supports it)
- [ ] All governance parameters reviewed and hardened
- [ ] Post-mortem published within 48h

## Cross-Skill Signals

Fire `WALLET_KEY_COMPROMISED` (P0) if the attack succeeded and treasury/authority was transferred.
Load `skill/incident-response-integration.md` → `active-exploit-response.md` for key rotation.
