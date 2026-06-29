# /depin-hardware — Hardware Cost Estimation

Provides detailed cost estimates for DePIN hardware based on network type and scale.

## Usage

```
/depin-hardware
```

## Intake

The command will ask:

```
1. What type of DePIN are you building?
   (Connectivity / Sensor / Compute / Storage / Energy)

2. What is your target deployment scale?
   (Prototype: 10-50 nodes / Pilot: 50-500 nodes / Production: 500-5000 nodes / Scale: 5000+ nodes)

3. What is your target geographic scope?
   (Single city / Regional / National / Global)

4. What is your power availability?
   (Mains available / Solar required / Battery only / Mixed)

5. What is your connectivity requirement?
   (WiFi / LoRaWAN / Cellular / Ethernet / Satellite)

6. What is your target BOM cost per unit?
   (<$25 / $25-50 / $50-100 / $100-250 / $250+)

7. What is your expected deployment timeline?
   (Immediate / 3 months / 6 months / 12 months)

8. Do you need regulatory certification?
   (Yes, specify regions / No / Not sure)
```

## Output

The command provides:

### 1. Hardware Bill of Materials (BOM)

Detailed component list with:
- Microcontroller/board
- Sensors/modules
- Connectivity hardware
- Power supply
- Enclosure
- Per-unit cost

### 2. Total Cost Breakdown

- Hardware cost per unit
- Manufacturing cost
- Certification cost
- Shipping/logistics
- Total landed cost

### 3. Scale Economics

- Volume pricing tiers
- Manufacturing setup costs
- Inventory holding costs
- Total investment by deployment phase

### 4. Power Analysis

- Power consumption per unit
- Annual energy cost
- Solar panel sizing (if applicable)
- Battery requirements (if applicable)

### 5. Procurement Timeline

- Component lead times
- Manufacturing time
- Certification timeline
- Deployment schedule

## Example Output

### Connectivity DePIN (WiFi Hotspot) - 1,000 Units

#### BOM Per Unit
| Component | Specification | Qty | Unit Cost | Total |
|-----------|---------------|-----|-----------|-------|
| ESP32-S3 | WiFi + BLE, 8MB flash | 1 | $3.50 | $3.50 |
| External Antenna | 5dBi Omni-directional | 1 | $2.00 | $2.00 |
| Power Supply | 12V 2A | 1 | $4.00 | $4.00 |
| Enclosure | IP65 ABS plastic | 1 | $3.00 | $3.00 |
| PCB | Custom 2-layer | 1 | $1.50 | $1.50 |
| Connectors | SMA, DC jack | 1 | $0.50 | $0.50 |
| **Subtotal** | | | | **$14.50** |
| Assembly | Labor + overhead | | | $3.00 |
| **Total BOM** | | | | **$17.50** |

#### Scale Economics
| Volume | Unit Cost | Setup Cost | Total Investment |
|--------|-----------|------------|------------------|
| 100 (Prototype) | $22.50 | $5,000 | $7,250 |
| 500 (Pilot) | $19.50 | $10,000 | $19,750 |
| 1,000 (Production) | $17.50 | $15,000 | $32,500 |
| 5,000 (Scale) | $15.50 | $25,000 | $102,500 |

#### Power Analysis
- Power consumption: 3W average
- Annual energy cost: $3.50/year (mains)
- Solar panel: 10W panel + 10Ah battery
- Solar cost adder: $25/unit

#### Certification
- FCC Part 15: $2,000 + 8 weeks
- CE RED: $3,000 + 10 weeks
- Total: $5,000 + 10 weeks

#### Procurement Timeline
- Component sourcing: 4 weeks
- PCB fabrication: 2 weeks
- Assembly: 2 weeks
- Certification: 10 weeks (parallel)
- Total: 10 weeks

### Sensor DePIN (Weather Station) - 500 Units

#### BOM Per Unit
| Component | Specification | Qty | Unit Cost | Total |
|-----------|---------------|-----|-----------|-------|
| ESP32-S3 | WiFi + BLE | 1 | $3.50 | $3.50 |
| BME280 | Temp, humidity, pressure | 1 | $4.00 | $4.00 |
| GPS Module | u-blox NEO-6M | 1 | $8.00 | $8.00 |
| Solar Panel | 5W | 1 | $6.00 | $6.00 |
| Battery | 18650 Li-ion 3000mAh | 2 | $3.00 | $6.00 |
| Enclosure | IP65 weatherproof | 1 | $5.00 | $5.00 |
| **Subtotal** | | | | **$32.50** |
| Assembly | | | | $4.00 |
| **Total BOM** | | | | **$36.50** |

#### Scale Economics
| Volume | Unit Cost | Setup Cost | Total Investment |
|--------|-----------|------------|------------------|
| 50 (Prototype) | $45.00 | $3,000 | $5,250 |
| 250 (Pilot) | $40.00 | $7,500 | $17,500 |
| 500 (Production) | $36.50 | $12,000 | $30,250 |

#### Power Analysis
- Power consumption: 0.5W average (sleep mode)
- Solar sufficient for continuous operation
- Battery backup: 3 days without sun

## Follow-up Commands

After hardware estimation:
- `/depin-design` — Full network design
- Load `agents/hardware-engineer.md` — Detailed hardware integration
- `/depin-deploy` — Deployment planning
