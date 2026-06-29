# Regulatory Enforcement — Incident Response Runbook

**Severity:** P0
**Response SLA:** Legal counsel engaged in 1h. Zero public statements without legal approval.
**Owner:** CEO + Legal lead (privileged)

> ⚠️ Everything in this channel is attorney-client privileged. Add your legal counsel
> to the incident channel immediately. Do not discuss in any public or unencrypted channel.

## Trigger Conditions

- Receipt of SEC/CFTC subpoena, Wells Notice, or Civil Investigative Demand
- Cease-and-desist order from any regulator
- Exchange notifies you of delisting due to regulatory compliance concerns
- Node operators in a specific jurisdiction receiving compliance inquiries
- Regulatory agency publicly names your protocol in an enforcement action

---

## Immediate Actions (T+0 to T+60 min)

### Step 1 — Secure the notice and activate legal hold

```bash
# IMMEDIATELY: Forward the exact notice to legal@yourprotocol.com (privileged)
# DO NOT forward to Discord, Telegram, Twitter, or any public channel

# Legal hold: preserve all relevant data — do not delete anything
# This includes: on-chain transaction history, Discord DMs, email, Notion docs

# Activate legal hold in your communication tools:
# Slack: Workspace admin → Compliance Exports → Legal Hold
# Google Workspace: admin.google.com → Reports → Audit → Vault → Create Matter

# Snapshot current on-chain state immediately (evidence preservation)
solana snapshot --ledger /var/ledger --no-cleanup \
  --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY \
  --snapshot-archive-path /backup/incident-$(date +%Y%m%d)/ &

# Get complete token distribution for any required reporting
spl-token supply <TOKEN_MINT> --url https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY
curl "https://mainnet.helius-rpc.com/?api-key=$HELIUS_KEY" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "getTokenAccounts",
    "params": {"mint": "<TOKEN_MINT>", "limit": 1000}
  }' > /backup/token-distribution-$(date +%Y%m%d).json
```

### Step 2 — Engage outside counsel (within 1h)

```
CRYPTO-NATIVE LAW FIRMS (2026 reference list):
  Tier 1: Fenwick & West, Cooley, Latham & Watkins (large protocols, VC-backed)
  Tier 2: DLx Law, Debevoise (enforcement specialists)
  Tier 3: Kelman Law, Haun Ventures legal network (early-stage / founder-friendly)

MINIMUM INFORMATION TO PROVIDE ON FIRST CALL:
  1. Exact text of the notice (date, issuing agency, case number)
  2. Nature of the protocol (DePIN, token utility, operator structure)
  3. Jurisdictions of operations and key team members
  4. Total token supply, FDV, and approximate holder count
  5. Whether any US persons received tokens in any distribution
  6. Whether token was ever sold vs airdropped vs earned
```

### Step 3 — Do not touch the protocol while assessing

```
DO NOT:
  ❌ Pause the protocol (looks like destruction of evidence / admission)
  ❌ Delete any smart contracts or off-chain records
  ❌ Transfer treasury funds to "safe" wallets (looks like asset concealment)
  ❌ Delist from exchanges preemptively (wait for counsel's advice)
  ❌ Make public statements (even "we're cooperating" needs legal review)
  ❌ Notify other regulators without counsel (may trigger additional inquiries)

DO:
  ✅ Preserve all records
  ✅ Maintain normal protocol operations
  ✅ Keep team calm and silent publicly
  ✅ Brief board/investors under privilege
  ✅ Prepare a factual timeline (internal, privileged)
```

---

## Short-Term Actions (T+1h to T+24h, with counsel)

### Step 4 — Build the factual record (internal only, privileged)

```markdown
# Internal Incident Timeline — PRIVILEGED AND CONFIDENTIAL
# Attorney: [NAME]  Matter: [MATTER ID]

## Protocol facts (provide to counsel)
- Token launch date: 
- Token distribution method: [sale / airdrop / earned rewards]
- US persons in distribution: [yes/no/unknown]
- Registered entity jurisdiction: 
- Protocol revenue (last 12 months): 
- Number of node operators: 
- Operator jurisdictions:

## Notice details
- Issuing agency: 
- Date received:
- Case/subpoena number:
- Response deadline:
- Requested materials:

## Key questions for counsel
1. Does the token constitute a security under Howey?
2. What is our exposure given the distribution method?
3. Should we file a voluntary disclosure in any jurisdiction?
4. What is the likely enforcement path and timeline?
5. Should we geo-block certain jurisdictions from the protocol UI?
```

### Step 5 — Assess and geo-fence if required by counsel

```typescript
// If counsel advises restricting access for specific jurisdictions:
// Add to frontend middleware (not a protocol-level pause)

const RESTRICTED_JURISDICTIONS = ["US"]; // Only if counsel explicitly advises

export function geoCheck(userCountry: string): boolean {
  return !RESTRICTED_JURISDICTIONS.includes(userCountry);
}

// NOTE: Geo-fencing UI ≠ pausing the protocol.
// The smart contract remains accessible. This is a UI-layer access control.
// Document the decision and date in writing for the legal record.
```

---

## Medium-Term Actions (T+24h to T+7 days)

### Step 6 — Prepare response to regulator (counsel-led)

```
STANDARD RESPONSE ELEMENTS (all drafted by counsel):

1. Cover letter: firm's identity, representation, request for extension
2. Privilege log: documents withheld and reason for privilege assertion
3. Factual response: accurate and complete answers to specific questions
4. Document production: organized, Bates-numbered if applicable

TIMING:
  - Most subpoenas allow 30-day extensions; always request
  - Do not produce anything without counsel review
  - Keep a log of everything produced
```

### Step 7 — Operator and community communication

```
TIMING: Only after counsel approves specific language

TEMPLATE (counsel must approve):
"[PROTOCOL] has received a regulatory inquiry from [AGENCY/no agency named].
We are cooperating fully and cannot comment on the specifics.
The network continues to operate normally.
We will provide updates when legally permitted to do so.
Please direct media inquiries to: press@[PROTOCOL].com"

WHAT NOT TO SAY:
  ❌ "We did nothing wrong" — legal conclusion, not for protocol to state
  ❌ "This is an attack on crypto" — inflammatory, unhelpful
  ❌ Any mention of settlement discussions
  ❌ Any details about what the regulator is investigating
```

---

## Jurisdiction-Specific Notes

```
US (SEC / CFTC):
  Key risk: token classified as unregistered security
  Key factor: Was there a "common enterprise" and "expectation of profit"?
  Mitigation: utility token legal opinion pre-launch; no US persons in sale
  Load: skill/legal-compliance.md → US Securities Analysis section

EU (MiCA — effective 2024):
  Key risk: operating as CASP without registration
  Key factor: Are you providing services to EU residents?
  Mitigation: MiCA whitepaper; CASP registration in at least one EU state

SINGAPORE (MAS):
  Generally crypto-friendly. Digital Payment Token framework.
  Key risk: token deemed payment token → Payment Services Act licensing
```

---

## CLI Quick-Reference Card

```bash
# PASTE INTO PRIVILEGED LEGAL CHANNEL ONLY (not #general, not Discord)

NOTICE DATE:      
AGENCY:           
CASE NUMBER:      
RESPONSE DUE:     
COUNSEL ENGAGED:  Y/N
COUNSEL FIRM:     

# Legal hold activated: Y/N
# Evidence snapshot: /backup/incident-[DATE]/

# Protocol status: NORMAL OPERATIONS (do not pause without counsel instruction)
# Public statement approved: NONE YET
```

---

## Recovery Indicators

- [ ] Outside counsel engaged within 1h
- [ ] Legal hold activated across all communications platforms
- [ ] On-chain state snapshot preserved
- [ ] No public statements made without counsel approval
- [ ] Response deadline calendared; extension requested
- [ ] Internal factual timeline documented under privilege
- [ ] Board and investors briefed under privilege
- [ ] Protocol operating normally unless counsel advises otherwise

## Cross-Skill Signals

No automatic cross-skill signals. Legal matters are human-decision-gated.
If protocol must be paused per counsel: load `skill/incident-response-integration.md` → program-freeze-and-pause.md.
