/**
 * ROI Calculator unit tests
 * Run: npx jest tests/roi-calculator.test.ts
 */

import {
  calculateNodeEconomics,
  designEmissionSchedule,
  NodeEconomicsInput,
} from "../src/roi-calculator";

// ── Emission Schedule Tests ───────────────────────────────────────────────────

describe("designEmissionSchedule", () => {
  const TOTAL = 4_000_000_000n;
  const YEARS = 4;
  const EPOCH_HOURS = 24;

  it("constant schedule distributes evenly across all epochs", () => {
    const emissions = designEmissionSchedule(TOTAL, YEARS, EPOCH_HOURS, "constant");
    const epochs_per_year = Math.round((365 * 24) / EPOCH_HOURS);
    const total_epochs = epochs_per_year * YEARS;
    expect(emissions.length).toBe(total_epochs);

    const sum = emissions.reduce((a, b) => a + b, 0n);
    // Sum should be approximately equal to total (rounding may cause slight diff)
    expect(Number(sum)).toBeCloseTo(Number(TOTAL), -3);

    // All epochs equal in constant schedule
    expect(emissions[0]).toBe(emissions[1]);
    expect(emissions[0]).toBe(emissions[emissions.length - 1]);
  });

  it("halving schedule cuts emission in half at each interval", () => {
    const emissions = designEmissionSchedule(TOTAL, YEARS, EPOCH_HOURS, "halving", 2);
    const epochs_per_year = Math.round((365 * 24) / EPOCH_HOURS);
    const epochs_per_halving = epochs_per_year * 2;

    const rate_year1 = emissions[0];
    const rate_year3 = emissions[epochs_per_halving + 1];

    // Year 3 rate should be half of year 1 rate
    expect(rate_year3).toBe(rate_year1 / 2n);
  });

  it("linear decay schedule reduces emission each year", () => {
    const emissions = designEmissionSchedule(TOTAL, YEARS, EPOCH_HOURS, "linear_decay", 2, 2000);
    const epochs_per_year = Math.round((365 * 24) / EPOCH_HOURS);

    const year1_avg = emissions.slice(0, epochs_per_year).reduce((a, b) => a + b, 0n) / BigInt(epochs_per_year);
    const year2_avg = emissions.slice(epochs_per_year, epochs_per_year * 2).reduce((a, b) => a + b, 0n) / BigInt(epochs_per_year);

    expect(year2_avg).toBeLessThan(year1_avg);
  });
});

// ── ROI Calculator Tests ──────────────────────────────────────────────────────

describe("calculateNodeEconomics", () => {
  const BASE_INPUT: NodeEconomicsInput = {
    total_supply: 10_000_000_000n,
    node_reward_pct: 40,
    duration_years: 5,
    epoch_length_hours: 24,
    schedule_type: "halving",
    halving_interval_years: 2,
    target_nodes_by_year: [500, 2000, 5000, 8000, 12000],
    hardware_cost_usd: 400,
    monthly_opex_usd: 8,
    token_launch_price_usd: 0.05,
  };

  it("calculates correct total reward allocation", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    expect(result.total_reward_allocation).toBe(4_000_000_000n);
  });

  it("returns year summaries for each year", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    expect(result.year_summaries.length).toBe(5);
    expect(result.year_summaries[0].year).toBe(1);
    expect(result.year_summaries[4].year).toBe(5);
  });

  it("year summaries have correct node count from input", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    expect(result.year_summaries[0].total_nodes).toBe(500);
    expect(result.year_summaries[2].total_nodes).toBe(5000);
  });

  it("monthly profit decreases as nodes increase (dilution)", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    // More nodes = same rewards split more ways = lower individual earnings
    expect(result.year_summaries[0].usd_per_node_per_month)
      .toBeGreaterThan(result.year_summaries[2].usd_per_node_per_month);
  });

  it("warns when operators never break even", () => {
    const badInput: NodeEconomicsInput = {
      ...BASE_INPUT,
      token_launch_price_usd: 0.000001, // negligible price
    };
    const result = calculateNodeEconomics(badInput);
    expect(result.warnings.some((w) => w.includes("never break even"))).toBe(true);
    expect(result.breakeven_months).toBeNull();
  });

  it("warns when node reward allocation is very high", () => {
    const result = calculateNodeEconomics({ ...BASE_INPUT, node_reward_pct: 70 });
    expect(result.warnings.some((w) => w.includes("very high"))).toBe(true);
  });

  it("breakeven months is a reasonable number for viable economics", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    if (result.breakeven_months !== null) {
      expect(result.breakeven_months).toBeGreaterThan(0);
      expect(result.breakeven_months).toBeLessThan(120); // < 10 years
    }
  });

  it("verdict string is non-empty", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    expect(result.verdict.length).toBeGreaterThan(0);
  });

  it("handles zero token price gracefully", () => {
    const result = calculateNodeEconomics({ ...BASE_INPUT, token_launch_price_usd: 0 });
    expect(result.warnings.some((w) => w.includes("$0"))).toBe(true);
    // Should not throw
    expect(result.year_summaries.length).toBe(5);
  });

  it("total epochs matches expected calculation", () => {
    const result = calculateNodeEconomics(BASE_INPUT);
    const expected_epochs = Math.round((365 * 24) / BASE_INPUT.epoch_length_hours) * BASE_INPUT.duration_years;
    expect(result.epochs_total).toBe(expected_epochs);
  });
});
