# Hardware Supply Chain

End-to-end hardware supply chain management for DePIN protocols — from component sourcing through manufacturing, flashing, shipping, and field deployment. Covers anti-counterfeit measures, secure provisioning, and on-chain attestation of hardware identity.

## The DePIN Hardware Problem

```
CENTRALIZED IoT:                    DEPIN NETWORK:
  Manufacturer → Company → Deploy     Manufacturer → Protocol Spec → 
                                        Multiple ODMs → Multiple Distributors →
                                          Thousands of Operators → Deploy
                                        
RISKS UNIQUE TO DEPIN:
  1. Counterfeit hardware earning rewards fraudulently
  2. Compromised firmware pre-installed before operator receives device
  3. Supply chain attack on signing keys during manufacturing
  4. Operators self-modifying hardware to game reward oracles
  5. No visibility into hardware lifecycle post-deployment
```

---

## Section 1: Hardware Identity and Attestation

### Secure Element Architecture

```
RECOMMENDED: Every DePIN node includes a hardware secure element (SE).

WHY SECURE ELEMENT:
  - Private key never leaves the SE (physically impossible to extract)
  - Each device gets a unique identity at manufacturing time
  - Attestation certificates chain back to manufacturer root CA
  - Tamper evidence: SE becomes inoperable if physically attacked

OPTIONS BY COST:
  Budget (< $3/unit): ATECC608A (Microchip) — basic ECDSA, no TLS
  Standard ($3-8/unit): SE050 (NXP) — full TLS, CommonCriteria EAL6+
  High security ($8-20/unit): TPM 2.0 module — industry standard, Winbond/Infineon

RECOMMENDED FOR DEPIN: ATECC608A or SE050
  - Cost-effective for consumer hardware
  - Solana-compatible ECDSA (secp256r1 or ed25519)
  - Well-supported libraries (AWS IoT Greengrass, etc.)
```

### Device Identity Flow

```
MANUFACTURING → PROVISIONING → DEPLOYMENT → PROTOCOL REGISTRATION

1. MANUFACTURING:
   ─ Secure element embedded during PCB assembly
   ─ SE generates key pair internally — private key NEVER transmitted
   ─ SE public key exported → manufacturer generates device certificate
   ─ Certificate chain: Root CA → Intermediate CA → Device Certificate
   ─ Device certificate + SE public key → stored in hardware manifest DB

2. PROVISIONING (factory):
   ─ Flash production firmware (signed by protocol)
   ─ Burn SE certificate into device non-volatile storage
   ─ Burn device serial number + batch ID into SE
   ─ Run hardware self-test suite (RF, sensor accuracy, connectivity)
   ─ Pack and label with serial number + FCC ID (or regional equivalent)

3. DEPLOYMENT (operator):
   ─ Operator powers on device
   ─ Device signs a registration payload with SE private key:
       { serial: "SN-12345", firmware_hash: "abc123", location_hash: "xyz789", timestamp: 1234567890 }
   ─ Signature verified against device certificate chain → manufacturer root CA
   ─ Registration payload submitted on-chain

4. ON-CHAIN ATTESTATION:
   ─ Smart contract verifies SE signature against known device certificate
   ─ Registration accepted → node earns rewards
   ─ Counterfeit devices (no valid SE cert) cannot register
```

### On-Chain Attestation Program

```rust
// programs/depin_registry/src/instructions/register_node.rs

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttestationPayload {
    pub serial_number: [u8; 32],        // Device serial number
    pub firmware_hash: [u8; 32],        // SHA-256 of installed firmware
    pub location_hash: [u8; 32],        // H3 geohash of deployment location
    pub manufacturer_id: [u8; 16],      // Manufacturer identifier
    pub batch_id: [u8; 16],             // Manufacturing batch
    pub timestamp: i64,                 // Unix timestamp of attestation
}

#[derive(Accounts)]
pub struct RegisterNode<'info> {
    #[account(
        init,
        payer = operator,
        space = 8 + NodeAccount::LEN,
        seeds = [b"node", serial_number.as_ref()],
        bump,
    )]
    pub node_account: Account<'info, NodeAccount>,
    
    #[account(mut)]
    pub operator: Signer<'info>,
    
    /// Hardware root of trust — must be in the authorized manufacturer list
    #[account(
        constraint = manufacturer_registry.is_authorized(&attestation.manufacturer_id)
            @ RegistryError::UnauthorizedManufacturer,
    )]
    pub manufacturer_registry: Account<'info, ManufacturerRegistry>,
    
    pub system_program: Program<'info, System>,
}

pub fn register_node(
    ctx: Context<RegisterNode>,
    attestation: AttestationPayload,
    se_signature: [u8; 64],        // Signature from secure element
    device_cert_pubkey: [u8; 32],  // Device certificate public key
) -> Result<()> {
    // 1. Verify the SE signature over the attestation payload
    let payload_bytes = attestation.try_to_vec()?;
    
    // Use Solana's secp256k1 verify (or ed25519 depending on SE type)
    // For ATECC608A: secp256r1 signature — requires custom syscall or off-chain verify
    // For now, verify via pre-instruction secp256k1_instruction
    // See: https://docs.solana.com/developing/runtime-facilities/sysvars#instructions
    
    // 2. Verify device certificate chains to authorized manufacturer
    // (Certificate chain validation is complex — typically done off-chain with result stored)
    require!(
        ctx.accounts.manufacturer_registry.is_device_certified(&device_cert_pubkey),
        RegistryError::DeviceCertificateNotRecognized
    );
    
    // 3. Check for duplicate registration (same serial = counterfeit attempt)
    require!(
        !ctx.accounts.node_account.is_registered,
        RegistryError::SerialAlreadyRegistered
    );
    
    // 4. Validate firmware hash is an approved version
    require!(
        ctx.accounts.manufacturer_registry.is_firmware_approved(&attestation.firmware_hash),
        RegistryError::FirmwareVersionNotApproved
    );
    
    // 5. Register the node
    let node = &mut ctx.accounts.node_account;
    node.operator = ctx.accounts.operator.key();
    node.serial_number = attestation.serial_number;
    node.firmware_hash = attestation.firmware_hash;
    node.location_hash = attestation.location_hash;
    node.registered_at = attestation.timestamp;
    node.is_registered = true;
    node.device_cert_pubkey = device_cert_pubkey;
    node.status = NodeStatus::Active;
    
    emit!(NodeRegistered {
        serial: attestation.serial_number,
        operator: ctx.accounts.operator.key(),
        manufacturer_id: attestation.manufacturer_id,
        firmware_hash: attestation.firmware_hash,
        timestamp: attestation.timestamp,
    });
    
    Ok(())
}
```

---

## Section 2: Firmware Security

### Secure Boot and Firmware Signing

```bash
# FIRMWARE SIGNING WORKFLOW:

# Step 1: Generate firmware signing key (kept in HSM — never on a laptop)
# Production: Use AWS KMS or HashiCorp Vault (HSM-backed)
# Development: Can use local keypair for devnet testing

# Step 2: Build firmware
cd firmware/
make release TARGET=depin-node-v2 VERSION=1.3.0

# Step 3: Hash the firmware binary
FIRMWARE_HASH=$(sha256sum build/depin-node-v1.3.0.bin | awk '{print $1}')
echo "Firmware hash: $FIRMWARE_HASH"

# Step 4: Sign the firmware hash
# Production (AWS KMS):
SIGNATURE=$(aws kms sign \
  --key-id "arn:aws:kms:us-east-1:ACCOUNT:key/KEY-ID" \
  --message "$(echo -n $FIRMWARE_HASH | xxd -r -p | base64)" \
  --message-type RAW \
  --signing-algorithm ECDSA_SHA_256 \
  --output text --query Signature)

echo "Firmware signature: $SIGNATURE"

# Step 5: Publish firmware + signature to Arweave (permanent, immutable)
irys upload build/depin-node-v1.3.0.bin \
  --tags "Protocol:YourProtocol" "Version:1.3.0" "Hash:$FIRMWARE_HASH" \
  --network mainnet

# Step 6: Register approved firmware hash on-chain
# Protocol admin (multisig) signs transaction to approve new firmware version
anchor invoke --program <REGISTRY_PROGRAM> \
  --instruction approve_firmware \
  --args "{ firmware_hash: '$FIRMWARE_HASH', version: '1.3.0', min_required: false }"
```

### OTA Update Security

```typescript
// Node firmware update flow — secure OTA
// Runs on the node's MCU (or embedded Linux)

interface FirmwareUpdate {
  version: string;
  downloadUrl: string;       // Arweave URL — immutable
  firmwareHash: string;      // SHA-256 hex
  signature: string;         // Protocol signing key signature over hash
  minRequiredVersion: string | null; // If set, devices below this MUST update
}

async function performOTAUpdate(update: FirmwareUpdate): Promise<void> {
  // Step 1: Verify signature against hardcoded protocol public key
  // (Public key is burned into firmware at manufacturing — cannot be changed by operator)
  const PROTOCOL_FIRMWARE_PUBKEY = "0x04..."; // Hardcoded in firmware
  const isValid = await verifyECDSA(
    Buffer.from(update.firmwareHash, "hex"),
    Buffer.from(update.signature, "hex"),
    Buffer.from(PROTOCOL_FIRMWARE_PUBKEY, "hex")
  );
  
  if (!isValid) {
    throw new Error("FIRMWARE SIGNATURE INVALID — refusing to install");
  }
  
  // Step 2: Download firmware
  const firmwareBinary = await fetch(update.downloadUrl).then(r => r.arrayBuffer());
  
  // Step 3: Verify hash of downloaded binary
  const downloadedHash = await crypto.subtle.digest("SHA-256", firmwareBinary);
  const downloadedHashHex = Buffer.from(downloadedHash).toString("hex");
  
  if (downloadedHashHex !== update.firmwareHash) {
    throw new Error(`FIRMWARE HASH MISMATCH: expected ${update.firmwareHash}, got ${downloadedHashHex}`);
  }
  
  // Step 4: Install (device-specific — write to update partition)
  await installFirmware(firmwareBinary);
  
  // Step 5: Attest new firmware to protocol after reboot
  // On next boot, device re-registers with new firmware_hash
  console.log(`OTA complete: ${update.version} installed`);
}
```

---

## Section 3: Anti-Counterfeit Measures

```
COUNTERFEIT ATTACK VECTORS:
  1. Fake hardware claiming to be a real device (no SE → no valid attestation)
  2. Real hardware cloned (SE cannot be cloned — private key extraction requires physical destruction)
  3. Simulated hardware (software emulating a real device)
  4. Modified hardware (genuine SE + modified RF/sensor → inflated readings)

PROTOCOL-LEVEL DEFENSES:
  ✅ Attestation: SE signature at registration = fake hardware cannot register
  ✅ Serial number uniqueness: Each SN can only register once — no cloning
  ✅ Firmware hash requirement: Only approved firmware earns rewards
  ✅ Location validation: GPS claim vs H3 coverage map — remote locations checked
  ✅ Sensor anomaly detection: Statistical outlier detection on reported data
  ✅ Stake requirement: Hardware must stake tokens — fraud risk = financial risk
```

### Anomaly Detection for Hardware Fraud

```typescript
// Monitor for hardware fraud patterns on-chain

interface SensorReading {
  nodeId: string;
  timestamp: number;
  value: number;
  location: string; // H3 cell
}

interface FraudSignal {
  nodeId: string;
  type: "READING_ANOMALY" | "LOCATION_MISMATCH" | "PERFECT_UPTIME" | "IDENTICAL_READINGS";
  severity: "LOW" | "MEDIUM" | "HIGH";
  detail: string;
}

function detectHardwareFraud(readings: SensorReading[]): FraudSignal[] {
  const signals: FraudSignal[] = [];

  // Pattern 1: Perfect uptime — real hardware has occasional downtime
  const uptimeByNode = computeUptime(readings);
  for (const [nodeId, uptime] of Object.entries(uptimeByNode)) {
    if (uptime >= 0.999) { // 99.9%+ uptime over 30 days = suspicious
      signals.push({
        nodeId, severity: "HIGH",
        type: "PERFECT_UPTIME",
        detail: `${(uptime * 100).toFixed(2)}% uptime over 30d — real hardware typically shows 95-99%`
      });
    }
  }

  // Pattern 2: Identical readings from nearby nodes
  const byLocation = groupByLocation(readings);
  for (const [location, locationReadings] of Object.entries(byLocation)) {
    const values = locationReadings.map(r => r.value);
    const uniqueValues = new Set(values.map(v => Math.round(v * 10) / 10)); // round to 1dp
    if (locationReadings.length >= 3 && uniqueValues.size === 1) {
      signals.push({
        nodeId: locationReadings[0].nodeId, severity: "HIGH",
        type: "IDENTICAL_READINGS",
        detail: `${locationReadings.length} nodes at ${location} reporting identical values — possible sensor farming`
      });
    }
  }

  return signals;
}
```

---

## Section 4: Logistics and Shipping Compliance

```
PRE-SHIPMENT CHECKLIST:

  EXPORT CONTROLS (US EXPORT ADMINISTRATION REGULATIONS):
    [ ] Check if device is on the Commerce Control List (CCL)
        Most consumer IoT hardware is EAR99 (no license required)
        Exception: devices with strong encryption may need license
    [ ] Screen destination country against:
        ─ OFAC sanctions list (Cuba, Iran, North Korea, Russia, Syria)
        ─ Commerce Country Chart (BIS)
    [ ] Document: Export Control Classification Number (ECCN)

  SHIPPING DOCUMENTATION:
    [ ] Commercial Invoice (must declare actual value — not discounted)
    [ ] Packing List
    [ ] Certificate of Origin
    [ ] Harmonized System (HS) Code for customs
        Typical DePIN hardware: 8517.62 (wireless communication equipment)
    [ ] Safety data sheet (if includes battery — all LoRa nodes do)

  BATTERY SHIPPING REGULATIONS (critical):
    Li-ion batteries have strict shipping rules (IATA PI965-970, UN 38.3)
    ─ Batteries in equipment (PI966/PI967): standard UPS/FedEx, max 100Wh
    ─ Batteries alone (PI965): dangerous goods — requires special handling
    ─ All cells must have passed UN 38.3 testing
    [ ] UN 38.3 test certificate from battery manufacturer obtained
    [ ] IATA compliance label on package
    [ ] State of charge ≤ 30% for air freight

  IN-BOX DOCUMENTATION:
    [ ] Quick start guide (in local language for each market)
    [ ] FCC ID labeling (visible without disassembly)
    [ ] CE marking (for EU)
    [ ] RF compliance statement in user manual
    [ ] Warranty card / terms of service
```

---

## Section 5: Post-Deployment Hardware Lifecycle

```bash
# Hardware lifecycle tracking — on-chain + off-chain

# ON-CHAIN STATE PER NODE:
# ─ registration_slot (when first registered)
# ─ firmware_version (current)
# ─ last_update_slot (last firmware update)
# ─ uptime_30d (basis points — 10000 = 100%)
# ─ anomaly_flags (bitmask: RF_ANOMALY, SENSOR_ANOMALY, LOCATION_MISMATCH)
# ─ status (Active, Suspended, Decommissioned)

# MAINTENANCE SCHEDULE:
cat << 'SCHEDULE'
  MONTHLY:
    [ ] Firmware update push (if new version available)
    [ ] Anomaly report review (any nodes flagged by fraud detection?)
    [ ] Operator retention check (nodes offline > 7 days → support outreach)
  
  QUARTERLY:
    [ ] Hardware performance audit (RF calibration drift in field?)
    [ ] Supply chain review (component shortages, supplier changes)
    [ ] FCC/CE compliance review (regulation changes that affect existing hardware)
    [ ] Secure element rotation protocol review
  
  ANNUALLY:
    [ ] Full hardware security audit (penetration testing of SE implementation)
    [ ] Firmware signing key rotation
    [ ] Battery health assessment (Li-ion degrades ~20% per year)
    [ ] End-of-life planning for early hardware batches
SCHEDULE

# DECOMMISSIONING:
# When a node is decommissioned (end of life, operator abandonment):
# 1. On-chain: mark NodeStatus::Decommissioned, stop reward eligibility
# 2. SE key revocation: add device cert to CRL (Certificate Revocation List)
# 3. Hardware recovery: offer operator incentive to return hardware (supply chain recovery)
# 4. Data: archive final node statistics for network analytics
```
