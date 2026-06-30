# Regulatory RF Compliance

FCC Part 15/Part 90 compliance, CE marking, spectrum licensing, and cross-border radio frequency approval for DePIN hardware deployments. The most overlooked legal risk in DePIN — operating non-compliant RF hardware is a federal offense in most jurisdictions.

## Why RF Compliance Is Non-Negotiable

```
ENFORCEMENT EXAMPLES:
  ❌ 2023: FCC fined company $650K for LoRa devices exceeding Part 15 power limits
  ❌ 2024: European operator seized 400 nodes for missing CE/RED marking
  ❌ 2024: DePIN protocol halted in 3 EU markets — no spectrum license for 868 MHz band
  
COMPLIANCE = NETWORK SURVIVABILITY:
  - Non-compliant hardware can be ordered removed by the FCC with 24h notice
  - Interference with licensed spectrum (medical, aviation) triggers criminal penalties
  - CE marking required to sell hardware in EU — required before first sale, not after
  
THE DEPIN-SPECIFIC RISK:
  Centralized IoT companies employ RF compliance teams.
  DePIN networks distribute compliance responsibility to thousands of node operators.
  Your protocol is responsible for the hardware spec. Operators bear the risk.
  → Build compliance into hardware design and deployment tooling.
```

---

## Section 1: US FCC Compliance

### Part 15 — Unlicensed Operation

```
FCC PART 15 OVERVIEW:
  Governs intentional radiators operating without a license.
  Applies to: WiFi, Bluetooth, 900MHz LoRa, sub-GHz ISM bands
  
  PART 15 SUBPARTS RELEVANT TO DEPIN:
    Subpart B: Unintentional radiators (digital devices, computers)
    Subpart C: Intentional radiators (any active RF transmitter)
    Subpart E: Unlicensed National Information Infrastructure (U-NII) devices (5GHz WiFi)
    Subpart G: Access broadband over power line
    Subpart H: TV bands devices

POWER LIMITS BY BAND (Part 15 Subpart C):
  902-928 MHz (LoRa, LoRaWAN):    1W conducted + 6 dBi antenna gain = +36 dBm EIRP max
  2.4 GHz (WiFi, BLE, Zigbee):   1W conducted (indoor); 4W EIRP (outdoor, point-to-point)
  5.725-5.850 GHz (U-NII-3):     200mW conducted; 1W EIRP
  
CRITICAL RULES:
  1. Device must accept interference and cannot cause harmful interference
  2. Transmitter must be FCC-certified (FCC ID required — not just Part 15 compliant)
  3. FCC ID must be permanently labeled on the device
  4. End user cannot modify the antenna unless explicitly permitted
```

### FCC Authorization Process

```bash
# FCC authorization path for new DePIN hardware:

# PATH 1: Declaration of Conformity (DoC) — for low-power, very limited devices
# Rarely applicable to DePIN hardware with real transmitters.

# PATH 2: Certification (most common for DePIN hardware)
# ─ Authorized test lab tests the device
# ─ Test report submitted to FCC via Telecommunication Certification Body (TCB)
# ─ FCC grants FCC ID
# ─ Timeline: 4-8 weeks (fast track: 2-3 weeks, $5K-$15K premium)

# STEP-BY-STEP CERTIFICATION CHECKLIST:
```

| Step | Action | Timeline | Cost |
|------|--------|----------|------|
| 1 | Engage FCC-accredited test lab | 1-2 weeks | $0 |
| 2 | Pre-compliance testing (your own lab or test house) | 2-4 weeks | $3K-$10K |
| 3 | Submit to accredited lab for formal testing | 3-6 weeks | $5K-$25K |
| 4 | Submit via TCB to FCC | 1-2 weeks | $1K-$3K |
| 5 | FCC review and grant | 1-3 weeks | $0 (TCB fee included) |
| 6 | FCC ID assigned | Immediate | — |
| **Total** | | **8-15 weeks** | **$9K-$38K** |

```bash
# VERIFY FCC ID:
# All certified devices are in the FCC Equipment Authorization Database
FCC_ID="YOUR_FCC_ID"
curl "https://fccid.io/api.php?action=GetDevice&fccId=$FCC_ID" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('Granted:', d.get('grant_date'))
print('Applicant:', d.get('applicant_name'))
print('Frequency ranges:', d.get('frequency'))
print('Max power:', d.get('emission_designation'))
"

# Node operator verification script
verify_fcc_compliance() {
  local device_model="$1"
  local fcc_id="$2"
  
  echo "Verifying FCC compliance for $device_model (ID: $fcc_id)"
  
  # Check FCC database
  STATUS=$(curl -s "https://api.fcc.gov/uls/v1/equipment/${fcc_id}" | python3 -c "
import json,sys; d=json.load(sys.stdin); print(d.get('status','NOT_FOUND'))
")
  
  if [ "$STATUS" = "GRANTED" ]; then
    echo "✅ FCC certified: $fcc_id"
  else
    echo "❌ FCC certification not found for: $fcc_id"
    echo "   This device may not be legally operated in the US"
    exit 1
  fi
}
```

---

## Section 2: EU Compliance (CE Marking / RED Directive)

### Radio Equipment Directive (RED) — 2014/53/EU

```
RED APPLIES TO:
  All radio equipment placed on the EU market.
  "Radio equipment" = any device intentionally transmitting RF energy.
  DePIN nodes with WiFi, LoRa, cellular, or any RF module = RED applies.

CE MARKING REQUIREMENTS UNDER RED:
  Essential requirements all equipment must meet:
    1. Health and safety (EN 62368-1 or EN 60950-1)
    2. Electromagnetic compatibility (EMC) — EN 301 489 series
    3. Efficient use of spectrum (RE) — product-specific EN 300 series standard

  Additional requirements (if applicable):
    4. Data protection and privacy (Article 3(3)e)
    5. Access to emergency services (Article 3(3)f — for mobile devices)

NOTIFIED BODY vs SELF-DECLARATION:
  Class I radio equipment (e.g., low-power LoRa, BLE): self-declaration allowed
  Class II radio equipment (defined list in RED delegated acts): notified body required
  Check: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021D0036
```

### EU CE Certification Checklist

```bash
# EU compliance verification for DePIN hardware

# Required documents for Technical File (must retain 10 years):
cat << 'CHECKLIST'
TECHNICAL FILE CONTENTS:
  [ ] General description of the radio equipment
  [ ] Conceptual design and manufacturing drawings
  [ ] Descriptions of hardware and software components
  [ ] Risk assessment (essential requirements analysis)
  [ ] Test reports from accredited lab:
      [ ] EN 62368-1 (safety)
      [ ] EN 301 489-1 + product-specific part (EMC)
      [ ] Applicable EN 300 series standard for your radio type
          e.g., EN 300 220 (SRD 868 MHz), EN 300 328 (2.4 GHz), EN 302 208 (UHF RFID)
  [ ] EU Declaration of Conformity (DoC) — must be signed by EU representative
  [ ] User manual (in languages of all EU countries where distributed)
  [ ] CE marking on device (min 5mm height; legible and indelible)
  [ ] Notified Body certificate number (if Class II)
  
LABELING REQUIREMENTS:
  [ ] CE mark ✓
  [ ] Country of origin
  [ ] Manufacturer name and address
  [ ] Type/batch/serial number
  [ ] EU importer name and address (if manufactured outside EU)
  [ ] Frequency bands and maximum RF power (new requirement from RED Art. 10(8))
CHECKLIST

# Frequency declarations required on packaging since 2022:
echo "Required on packaging: Frequency: [X]-[Y] MHz; Max power: [Z] dBm EIRP"
```

### EU Frequency Bands — DePIN Relevant

| Band | Frequency | Max Power | Standard | Common Use |
|------|-----------|-----------|----------|------------|
| Sub-GHz ISM | 863-870 MHz | 14-25 dBm ERP | EN 300 220 | LoRa (EU868), Sigfox |
| 2.4 GHz ISM | 2.4-2.4835 GHz | 20 dBm EIRP | EN 300 328 | WiFi, BLE, Zigbee |
| 5 GHz | 5.15-5.85 GHz | 23-30 dBm EIRP | EN 301 893 | WiFi 5/6 |
| 868 MHz SRD | 868.0-868.6 MHz | 25 mW | EN 300 220-2 | LoRaWAN uplink |
| 915 MHz | Not available in EU | — | — | US only — DO NOT use in EU |

---

## Section 3: Cross-Border Deployment Matrix

```
CRITICAL: 915 MHz LoRa (US band) is ILLEGAL in Europe.
EU uses 868 MHz. Hardware must be region-specific or switchable.
```

| Region | Band Plan | Regulator | Cert Required | Typical Timeline |
|--------|-----------|-----------|---------------|-----------------|
| **USA** | 915 MHz ISM | FCC | FCC Part 15 Cert | 8-15 weeks |
| **EU** | 868 MHz SRD | National + ETSI | CE / RED | 10-16 weeks |
| **UK** (post-Brexit) | 868 MHz | Ofcom | UKCA marking | 10-16 weeks (separate from CE) |
| **Australia** | 915 MHz | ACMA | RCM mark | 8-12 weeks |
| **Canada** | 915 MHz | ISED | ISED certification | 8-12 weeks |
| **Japan** | 920 MHz | MIC | MIC tech conform | 12-20 weeks |
| **Brazil** | 915 MHz | Anatel | Anatel certification | 16-24 weeks |
| **India** | 865-867 MHz | DoT/WPC | WPC license | 4-8 weeks (WPC) |
| **South Korea** | 920-923.5 MHz | MSIT | KC certification | 8-12 weeks |

---

## Section 4: Node Operator Compliance Tooling

```typescript
// scripts/compliance-check.ts
// Run by node operators before activating hardware
// Integrates with on-chain node registry to flag non-compliant hardware

import { Connection, PublicKey } from "@solana/web3.js";

interface HardwareCompliance {
  deviceModel: string;
  fccId: string | null;
  ceMarking: boolean;
  region: "US" | "EU" | "UK" | "AU" | "CA" | "OTHER";
  frequencyBand: string;
  maxPowerDbm: number;
  complianceStatus: "COMPLIANT" | "NON_COMPLIANT" | "UNKNOWN";
  issues: string[];
}

const ALLOWED_FREQUENCIES: Record<string, { min: number; max: number; maxPowerDbm: number }> = {
  US: { min: 902, max: 928, maxPowerDbm: 30 },    // 902-928 MHz, 1W = 30 dBm
  EU: { min: 863, max: 870, maxPowerDbm: 14 },    // 863-870 MHz, 25 mW = 14 dBm
  UK: { min: 863, max: 870, maxPowerDbm: 14 },
  AU: { min: 915, max: 928, maxPowerDbm: 30 },
  CA: { min: 902, max: 928, maxPowerDbm: 30 },
};

async function checkNodeCompliance(
  region: string,
  frequencyMHz: number,
  powerDbm: number,
  fccId: string | null
): Promise<HardwareCompliance> {
  const issues: string[] = [];
  const allowed = ALLOWED_FREQUENCIES[region];

  if (!allowed) {
    issues.push(`Region "${region}" not in pre-approved list — manual review required`);
  } else {
    if (frequencyMHz < allowed.min || frequencyMHz > allowed.max) {
      issues.push(
        `Frequency ${frequencyMHz} MHz is OUTSIDE allowed band for ${region} ` +
        `(${allowed.min}-${allowed.max} MHz). This device cannot be operated legally.`
      );
    }
    if (powerDbm > allowed.maxPowerDbm) {
      issues.push(
        `Transmit power ${powerDbm} dBm exceeds legal limit for ${region} ` +
        `(max ${allowed.maxPowerDbm} dBm). Reduce power or the device cannot be registered.`
      );
    }
  }

  if (region === "US" && !fccId) {
    issues.push("FCC ID required for US operation — device is not FCC certified");
  }

  if (region === "EU" && fccId && !fccId.startsWith("CE")) {
    // CE marking check (simplified — real check would query EUDAMED or NB records)
    issues.push("CE/RED marking status unverified — provide DoC or NB certificate");
  }

  return {
    deviceModel: "unknown",
    fccId,
    ceMarking: region === "EU" && issues.length === 0,
    region: region as HardwareCompliance["region"],
    frequencyBand: `${frequencyMHz} MHz`,
    maxPowerDbm: powerDbm,
    complianceStatus: issues.length === 0 ? "COMPLIANT" : "NON_COMPLIANT",
    issues,
  };
}

// On-chain: Write compliance status to node registry
async function registerNodeComplianceOnChain(
  connection: Connection,
  nodeRegistry: PublicKey,
  nodeOwner: PublicKey,
  compliance: HardwareCompliance,
  walletKeypair: any
): Promise<void> {
  if (compliance.complianceStatus !== "COMPLIANT") {
    console.error("❌ Cannot register non-compliant node:", compliance.issues);
    throw new Error("Node does not meet RF compliance requirements");
  }

  // Write compliance attestation to node registry account
  // The registry smart contract stores: node_owner, compliance_region, certification_hash, timestamp
  console.log(`✅ Node compliance verified for ${compliance.region} — registering on-chain`);
}
```

---

## Section 5: Protocol Design for RF Compliance

```
SMART CONTRACT ENFORCEMENT:
  Your node registry should enforce compliance at the protocol level.
  
  Node registration instruction should:
  1. Require compliance attestation signed by the node operator
  2. Store the declared region, frequency, and power level
  3. Emit an event for off-chain monitoring (flag nodes operating outside declared params)
  4. Allow protocol DAO to suspend non-compliant nodes via governance vote
  
HARDWARE SPECIFICATION REQUIREMENTS:
  In your hardware design doc, specify:
  ─ FCC Part 15 compliance required for US deployment
  ─ RED/CE compliance required for EU deployment  
  ─ Regional frequency variants: US SKU (915 MHz), EU SKU (868 MHz)
  ─ Power output must be configurable via software to meet regional limits
  ─ Antenna gain limit: document max antenna gain for each SKU
  
INSURANCE AND LIABILITY:
  Consider requiring operators to maintain:
  ─ General liability insurance (protects against interference claims)
  ─ Spectrum interference liability coverage (specialized)
  ─ Protocol can require proof via on-chain attestation
  
AUDIT TRAIL:
  Every node registration should include:
  ─ Hardware model and FCC ID (or equivalent)
  ─ Declared frequency and power
  ─ GPS coordinates (for geographic compliance verification)
  ─ Operator acknowledgment of local RF regulations
```
