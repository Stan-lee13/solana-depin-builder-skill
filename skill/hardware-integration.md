# Hardware Integration — Firmware → Solana Pipeline

> This skill covers the full stack from physical device to on-chain proof.
> Most DePIN failures happen at this boundary — the firmware compiles, the device ships,
> and the proof pipeline is broken, gameable, or never tested on real hardware.

---

## Pipeline Overview

```
PHYSICAL DEVICE                    OFF-CHAIN SERVICES           ON-CHAIN SOLANA
     │                                     │                           │
     ├── Sensor / Radio / GPU              │                           │
     ├── Ed25519 device keypair            │                           │
     ├── Firmware (Rust embedded)          │                           │
     │                                     │                           │
     │  1. Sign proof with device key      │                           │
     │  ─────────────────────────────────► │                           │
     │                                     │ 2. Verify device sig      │
     │                                     │    Validate proof data    │
     │                                     │    Check anti-replay      │
     │                                     │ ──────────────────────►   │
     │                                     │                    3. Submit proof tx
     │                                     │                    4. Epoch reward
     │                                     │                    5. Node health event
     │◄────────────────────────────────────│◄──────────────────────────│
     │  6. Ack / reward notification       │                           │
```

---

## Pattern A: Connectivity Hardware (WiFi / LoRa / 5G Hotspots)

**Reference protocol:** Helium IoT / Helium Mobile

### Firmware Signing (Rust embedded)

```rust
// firmware/src/proof.rs
// Runs on ESP32 / Raspberry Pi CM4 / custom hardware

use ed25519_dalek::{SigningKey, Signature, Signer};
use sha2::{Sha256, Digest};

#[derive(serde::Serialize)]
pub struct BeaconProof {
    pub device_pubkey: [u8; 32],
    pub h3_index: u64,           // H3 hex at resolution 8 — encode as u64
    pub beacon_hash: [u8; 32],   // SHA256 of beacon payload
    pub timestamp_unix: i64,
    pub nonce: u64,              // Increments each beacon — replay protection
    pub rssi_dbm: i16,           // Signal strength (for witness validation)
    pub snr: f32,                // Signal-to-noise ratio
    pub signature: [u8; 64],     // Ed25519 signature of above fields
}

pub fn sign_beacon(
    signing_key: &SigningKey,
    h3_index: u64,
    beacon_payload: &[u8],
    nonce: u64,
) -> BeaconProof {
    let timestamp = get_unix_timestamp(); // from GPS/NTP
    let beacon_hash: [u8; 32] = {
        let mut hasher = Sha256::new();
        hasher.update(beacon_payload);
        hasher.finalize().into()
    };

    // Canonical message to sign: everything except the signature field
    let mut message = Vec::new();
    message.extend_from_slice(&h3_index.to_le_bytes());
    message.extend_from_slice(&beacon_hash);
    message.extend_from_slice(&timestamp.to_le_bytes());
    message.extend_from_slice(&nonce.to_le_bytes());

    let signature = signing_key.sign(&message);

    BeaconProof {
        device_pubkey: signing_key.verifying_key().to_bytes(),
        h3_index,
        beacon_hash,
        timestamp_unix: timestamp,
        nonce,
        rssi_dbm: get_current_rssi(),
        snr: get_current_snr(),
        signature: signature.to_bytes(),
    }
}
```

### Off-Chain Proof Validator (TypeScript)

```typescript
// services/proof-validator/connectivity.ts
import { verify } from "@noble/ed25519";
import * as h3 from "h3-js";
import { sha256 } from "@noble/hashes/sha256";

interface ConnectivityProof {
  device_pubkey: string;   // hex
  h3_index: string;        // "8826e1c4fffffff"
  beacon_hash: string;     // hex
  timestamp_unix: number;
  nonce: number;
  rssi_dbm: number;
  snr: number;
  signature: string;       // hex
}

const MAX_PROOF_AGE_SECONDS = 120;   // reject proofs older than 2 minutes
const MIN_RSSI_DBM = -130;           // minimum viable signal
const MAX_RSSI_DBM = -20;            // physically impossible to exceed

export async function validateConnectivityProof(
  proof: ConnectivityProof,
  registeredDeviceKey: string,
  usedNonces: Set<string>
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Device key matches registered key
  if (proof.device_pubkey !== registeredDeviceKey) {
    return { valid: false, reason: "Device key mismatch — not registered" };
  }

  // 2. Timestamp freshness
  const ageSec = Math.floor(Date.now() / 1000) - proof.timestamp_unix;
  if (ageSec > MAX_PROOF_AGE_SECONDS || ageSec < -30) {
    return { valid: false, reason: `Proof timestamp out of range: ${ageSec}s age` };
  }

  // 3. Nonce deduplication (replay protection)
  const nonceKey = `${proof.device_pubkey}:${proof.nonce}`;
  if (usedNonces.has(nonceKey)) {
    return { valid: false, reason: "Replay attack: nonce already used" };
  }

  // 4. RSSI sanity check (physics-based bounds)
  if (proof.rssi_dbm < MIN_RSSI_DBM || proof.rssi_dbm > MAX_RSSI_DBM) {
    return { valid: false, reason: `RSSI ${proof.rssi_dbm} dBm outside physical bounds` };
  }

  // 5. H3 index validity
  if (!h3.isValidCell(proof.h3_index)) {
    return { valid: false, reason: "Invalid H3 index" };
  }

  // 6. Signature verification
  const message = buildSigningMessage(proof);
  const sigBytes = Buffer.from(proof.signature, "hex");
  const pubkeyBytes = Buffer.from(proof.device_pubkey, "hex");
  const signatureValid = await verify(sigBytes, message, pubkeyBytes);
  if (!signatureValid) {
    return { valid: false, reason: "Invalid Ed25519 signature" };
  }

  // Mark nonce used
  usedNonces.add(nonceKey);
  return { valid: true };
}

function buildSigningMessage(proof: ConnectivityProof): Uint8Array {
  const buf = Buffer.alloc(8 + 32 + 8 + 8);
  const h3u64 = BigInt("0x" + proof.h3_index);
  buf.writeBigUInt64LE(h3u64, 0);
  Buffer.from(proof.beacon_hash, "hex").copy(buf, 8);
  buf.writeBigInt64LE(BigInt(proof.timestamp_unix), 40);
  buf.writeBigUInt64LE(BigInt(proof.nonce), 48);
  return new Uint8Array(buf);
}
```

---

## Pattern B: Sensor Hardware (Weather / Air Quality / GPS Base Stations)

**Reference protocol:** WeatherXM / GEODNET

```rust
// firmware/src/sensor_proof.rs
use serde::Serialize;

#[derive(Serialize)]
pub struct SensorProof {
    pub device_pubkey: [u8; 32],
    pub sensor_type: SensorType,    // Temperature, AirQuality, GpsRtk
    pub reading: SensorReading,
    pub gps_lat_e7: i32,            // Latitude × 10^7 (integer, no float on embedded)
    pub gps_lng_e7: i32,
    pub h3_index: u64,
    pub epoch: u32,
    pub sequence: u32,              // Sequence number within epoch (replay protection)
    pub signature: [u8; 64],
}

#[derive(Serialize)]
pub enum SensorType {
    Temperature,
    AirQuality,
    GpsRtk,
    WindSpeed,
    SolarIrradiance,
}

#[derive(Serialize)]
pub struct SensorReading {
    pub primary_value: i64,    // Scaled integer (e.g., temp × 100 = 2350 for 23.50°C)
    pub secondary_value: Option<i64>,
    pub quality_score: u8,     // 0-100, self-reported from sensor calibration
}
```

### Cross-Validation Against Neighbor Nodes

```typescript
// services/proof-validator/sensor.ts
// Sensor networks use statistical cross-validation — no single source of truth

interface SensorProofBatch {
  proofs: Array<{
    device_pubkey: string;
    h3_index: string;
    reading_value: number;
    timestamp: number;
    signature: string;
  }>;
  sensor_type: string;
  epoch: number;
}

export function crossValidateSensorReadings(
  batch: SensorProofBatch,
  maxDeviationPct = 15  // reject readings >15% from median
): Array<{ device: string; accepted: boolean; reason?: string }> {
  const readings = batch.proofs.map((p) => p.reading_value);
  const median = computeMedian(readings);
  const allowedDeviation = Math.abs(median) * (maxDeviationPct / 100);

  return batch.proofs.map((proof) => {
    const deviation = Math.abs(proof.reading_value - median);
    if (deviation > allowedDeviation) {
      return {
        device: proof.device_pubkey,
        accepted: false,
        reason: `Reading ${proof.reading_value} deviates ${(deviation / Math.abs(median) * 100).toFixed(1)}% from median ${median}`,
      };
    }
    return { device: proof.device_pubkey, accepted: true };
  });
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
```

---

## Pattern C: Compute Hardware (GPU / CPU / AI Inference)

**Reference protocol:** io.net / Render Network

```typescript
// services/proof-validator/compute.ts
// Compute networks can't use geographic proof — use execution verification

interface ComputeJobProof {
  worker_pubkey: string;
  job_id: string;
  job_hash: string;           // SHA256 of job parameters — binds proof to job
  output_hash: string;        // SHA256 of computation output
  gpu_model: string;          // e.g., "NVIDIA A100 80GB"
  compute_units_used: number; // GPU-hours or FLOPS
  execution_time_ms: number;
  tee_attestation?: string;   // TEE attestation report (Marlin Oyster / SGX)
  signature: string;
}

// For compute DePIN: TEE attestation is the gold standard
// Without TEE, use spot-check verification (re-run 5% of jobs independently)

export async function validateComputeProof(
  proof: ComputeJobProof,
  jobSpec: { expected_output_hash?: string; requires_tee: boolean }
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Job hash matches the job we assigned
  const expectedJobHash = computeJobHash(proof.job_id, /* job params */);
  if (proof.job_hash !== expectedJobHash) {
    return { valid: false, reason: "Job hash mismatch — proof not for this job" };
  }

  // 2. If TEE required, verify attestation
  if (jobSpec.requires_tee) {
    if (!proof.tee_attestation) {
      return { valid: false, reason: "TEE attestation required but not provided" };
    }
    const teeValid = await verifyMarlinAttestation(proof.tee_attestation);
    if (!teeValid) {
      return { valid: false, reason: "TEE attestation verification failed" };
    }
  }

  // 3. Output hash matches expected (spot-check jobs only)
  if (jobSpec.expected_output_hash && proof.output_hash !== jobSpec.expected_output_hash) {
    return { valid: false, reason: "Output hash mismatch — incorrect computation result" };
  }

  // 4. Execution time sanity check
  if (proof.execution_time_ms < 100 || proof.execution_time_ms > 24 * 60 * 60 * 1000) {
    return { valid: false, reason: "Execution time out of plausible range" };
  }

  return { valid: true };
}

async function verifyMarlinAttestation(attestation: string): Promise<boolean> {
  // Marlin Oyster TEE attestation verification
  // Docs: https://docs.marlin.org/oyster/attestation
  // In production: call Marlin's attestation verification endpoint
  const response = await fetch("https://attestation.marlin.org/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attestation }),
  });
  const { valid } = await response.json();
  return valid === true;
}
```

---

## Device Key Provisioning (All Hardware Types)

```typescript
// scripts/provision-device.ts
// Run during device manufacturing or first-boot setup

import { Keypair } from "@solana/web3.js";
import { createHmac } from "crypto";
import * as fs from "fs";

interface ProvisioningResult {
  device_pubkey: string;
  hardware_serial: string;
  provisioned_at: string;
  firmware_version: string;
}

export async function provisionDevice(
  hardwareSerial: string,
  masterSeed: string,   // from secure hardware HSM — never in code
  firmwareVersion: string
): Promise<ProvisioningResult> {
  // Deterministic derivation: same serial + seed always produces same key
  // This allows re-provisioning if device fails without changing on-chain identity
  const deviceSeed = createHmac("sha256", masterSeed)
    .update(`device:${hardwareSerial}`)
    .digest();

  const deviceKeypair = Keypair.fromSeed(deviceSeed.slice(0, 32));

  // In production: write to device secure storage, not to this script's output
  const result: ProvisioningResult = {
    device_pubkey: deviceKeypair.publicKey.toString(),
    hardware_serial: hardwareSerial,
    provisioned_at: new Date().toISOString(),
    firmware_version: firmwareVersion,
  };

  console.log(`[provision] Device ${hardwareSerial} → pubkey ${result.device_pubkey}`);
  return result;
}

// Firmware signature verification at device boot
export async function verifyFirmwareSignature(
  firmwareBinary: Buffer,
  signature: Buffer,
  manufacturerPublicKey: Buffer
): Promise<boolean> {
  const { verify } = await import("@noble/ed25519");
  const firmwareHash = require("crypto").createHash("sha256").update(firmwareBinary).digest();
  return verify(signature, firmwareHash, manufacturerPublicKey);
}
```

---

## Hardware Anti-Gaming Checklist

```text
BEFORE SHIPPING HARDWARE:
[ ] Device keypair generated in secure enclave or HSM — not software-only
[ ] Device pubkey burned to firmware — cannot be changed without flashing
[ ] Firmware signature verification at boot — rejects unsigned firmware
[ ] Nonce counter persisted across reboots — replay protection survives power cycles
[ ] GPS coordinates verified against IP geolocation (±50km tolerance)
[ ] RSSI/SNR bounds enforced server-side — physics-based rejection
[ ] Proof submission rate-limited per device — prevents burst attacks
[ ] Cross-validation against ≥3 neighbor devices before reward eligibility

POST-DEPLOYMENT:
[ ] Monitor for identical proofs from different device pubkeys
[ ] Monitor for geographic clusters exceeding physical density limits
[ ] Monitor for proof timestamps inconsistent with GPS time
[ ] Flag devices with 100% uptime — real hardware has occasional downtime
[ ] Audit devices claiming proofs from physically impossible locations
```
