# Wallet Engineering Framework — DePIN

> This is the DePIN-specific entry point for the unified Solana Wallet Engineering Framework.
> It maps every wallet concern in a DePIN protocol to the exact skill files that address it.
>
> For the full framework (all 5 skills), see:
>   - `solana-ux-skill/wallet-framework.md`

---

## DePIN Wallet Complexity Map

A DePIN protocol has more wallet types than any other Solana application.
Each has different security requirements, threat vectors, and lifecycle operations.

| Wallet Type | Owner | Security Tier | Primary Skill File |
|---|---|---|---|
| Protocol upgrade authority | Protocol team | Squads 3-of-5 | `skill/wallet-tge-security.md` (in `solana-token-launch-skill`) |
| Mint / emission authority | Protocol team | Squads 3-of-5 | `skill/wallet-tge-security.md` (in `solana-token-launch-skill`) |
| Epoch crank keypair | Automated (server) | AWS KMS | `skill/depin-wallet-security.md` |
| Oracle submitter keypair | Automated (server) | AWS KMS | `skill/oracle-integration.md` |
| Fee payer keypair | Automated (server) | Hot wallet, monitored | `skill/depin-wallet-security.md` → monitoring section |
| Operator wallet | Node operator | Hardware recommended | `skill/depin-wallet-security.md` |
| Device keypair | Hardware firmware | Secure element | `skill/node-registry.md` |
| Session key | Automated (firmware) | Ephemeral | `skill/depin-wallet-security.md` |

---

## Load Order by Task

```
"Help me secure my DePIN protocol's wallets"
  → skill/depin-wallet-security.md (this repo)
  → solana-ux-skill/skill/wallet-engineering.md (threat model)
  → solana-incident-response-skill/skill/wallet-security.md (compromise response)

"Help me set up the crank keypair securely"
  → skill/depin-wallet-security.md → Crank Keypair Security section

"Operator asking how to secure their node wallet"
  → skill/depin-wallet-security.md → DePIN Operator Wallet Security Checklist

"Set up session keys for automated proof submission"
  → skill/depin-wallet-security.md → Session Keys for Proof Submission
  → solana-ux-skill/skill/wallet-engineering.md → Session Key Architecture

"A DePIN authority key may be compromised"
  → solana-incident-response-skill/skill/wallet-security.md → P0 response
  → solana-incident-response-skill/skill/active-exploit-response.md
  → Fire: WALLET_KEY_COMPROMISED signal

"Monitor fee payer and crank health"
  → Solana-observabilty-skill/skill/wallet-observability.md → Fee Payer Runway
```

---

## Shared Security Principles (DePIN-Specific)

These extend the 8 principles from `solana-ux-skill/wallet-framework.md` with DePIN-specific constraints:

**P9 — Separation of authorities.** Upgrade authority, mint authority, and treasury must be on separate Squads multisigs. No single key controls more than one critical protocol function.

**P10 — Crank keys are not user keys.** Crank keypairs are server-side automation keys with narrow permissions. They must never hold funds beyond transaction fees and must be in KMS, not `.env` files.

**P11 — Device keypairs are not operator keypairs.** The two-keypair model from `node-registry.md` is mandatory. Device key compromise = jail one node. Operator key compromise = lose all nodes and funds.

**P12 — Session keys expire with epochs.** Proof submission session keys must expire at epoch boundaries. An expired session key means one missed epoch — acceptable. A never-expiring session key means an unlimited signing window if the firmware is compromised.

---

## Canonical Wallet Signals (DePIN)

DePIN fires and receives the canonical wallet signals from `wallet-framework.md`:

| Signal | DePIN Role | Action |
|---|---|---|
| `WALLET_KEY_COMPROMISED` | Fires when crank/oracle/treasury key compromised | Pause reward distribution, load active-exploit-response.md |
| `WALLET_FEE_PAYER_CRITICAL` | Fires to Observability when crank fee payer low | Monitor crank submissions, refill fee payer |
| `WALLET_ADDRESS_POISONING_DETECTED` | Receives from IR when operators targeted | Add warning to operator dashboard |
| `WALLET_SIGNING_LATENCY_HIGH` | Fires to Observability when proof submission slow | Check crank RPC endpoint health |
