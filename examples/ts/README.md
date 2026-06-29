# DePIN TypeScript Examples

Runnable TypeScript demos for `solana-depin-builder-skill` patterns.

## Contents

| File | What it demos |
|------|---------------|
| `src/roi-calculator.ts` | Node operator ROI calculation, emission schedule design, breakeven analysis |
| `tests/roi-calculator.test.ts` | 10 unit tests covering edge cases |

## Quick Start

```bash
# Install
npm install

# Run the ROI calculator (prints table + writes roi-output.json)
npm run roi

# Run tests
npm test
```

## Sample Output

```
══════════════════════════════════════════════════
  DePIN Node Economics — Sample Output
══════════════════════════════════════════════════

Total reward pool:  4,000,000,000 tokens
Total epochs:       1,825
Verdict:            ✅ Good — breakeven within 24 months
Breakeven:          18 months
Year 1 ROI:         -12.4%

Year-by-Year Summary:
┌──────┬─────────────┬─────────────────┬────────────────┬───────────────┐
│ Year │ Nodes       │ USD/Node/Month  │ Monthly Profit │ Cumulative ROI│
├──────┼─────────────┼─────────────────┼────────────────┼───────────────┤
│  1   │ 500         │ $52.38          │ $44.38         │ -24%          │
│  2   │ 2,000       │ $38.12          │ $30.12         │ 12%           │
│  3   │ 5,000       │ $19.44          │ $11.44         │ 78%           │
│  4   │ 8,000       │ $12.08          │ $4.08          │ 126%          │
│  5   │ 12,000      │ $8.05           │ $0.05          │ 158%          │
└──────┴─────────────┴─────────────────┴────────────────┴───────────────┘
```

## Loading Into Your DePIN Design

These examples are used with `commands/node-economics.md`. When a user runs `/node-economics`, the agent uses this same logic to:

1. Model emission schedules for their specific token supply
2. Calculate operator ROI at launch price
3. Identify if economics support node acquisition
4. Warn about mercenary-capital traps and death spirals
