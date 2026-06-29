/**
 * DePIN ROI Calculator + Emission Schedule Demo
 *
 * Demonstrates the economics patterns from:
 *   skill/reward-system.md
 *   commands/node-economics.md
 *
 * Run:
 *   npm install
 *   npx ts-node src/roi-calculator.ts
 *
 * Output: console table + roi-output.json
 */

import * as fs from "fs";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NodeEconomicsInput {
  total_supply: bigint;
  node_reward_pct: number;         // % of total supply (e.g. 40)
  duration_years: number;
  epoch_length_hours: number;
  schedule_type: "halving" | "linear_decay" | "constant";
  halving_interval_years?: number;
  decay_rate_annual_bps?: number;  // basis points per year (e.g. 1000 = 10%)
  target_nodes_by_year: number[];  // nodes at end of each year
  hardware_cost_usd: number;
  monthly_opex_usd: number;        // electricity + internet
  token_launch_price_usd: number;
}

export interface YearSummary {
  year: number;
  annual_emission: bigint;
  epoch_emission: bigint;
  total_nodes: number;
  tokens_per_node_per_epoch: number;
  usd_per_node_per_epoch: number;
  usd_per_node_per_month: number;
  monthly_opex_usd: number;
  monthly_profit_usd: number;
  cumulative_roi_pct: number;
}

export interface NodeEconomicsOutput {
  input: NodeEconomicsInput;
  total_reward_allocation: bigint;
  epochs_total: number;
  year_summaries: YearSummary[];
  breakeven_months: number | null;
  year1_roi_pct: number;
  verdict: string;
  warnings: string[];
}

// ── Emission Schedule Calculator ──────────────────────────────────────────────

export function designEmissionSchedule(
  total_rewards: bigint,
  duration_years: number,
  epoch_length_hours: number,
  schedule_type: "halving" | "linear_decay" | "constant",
  halving_interval_years: number = 2,
  decay_rate_annual_bps: number = 1000
): bigint[] {
  const epochs_per_year = Math.round((365 * 24) / epoch_length_hours);
  const total_epochs = epochs_per_year * duration_years;
  const epoch_emissions: bigint[] = [];

  if (schedule_type === "constant") {
    const per_epoch = total_rewards / BigInt(total_epochs);
    for (let i = 0; i < total_epochs; i++) epoch_emissions.push(per_epoch);

  } else if (schedule_type === "halving") {
    const epochs_per_halving = epochs_per_year * halving_interval_years;
    let current_rate = total_rewards / BigInt(total_epochs);
    for (let i = 0; i < total_epochs; i++) {
      if (i > 0 && i % epochs_per_halving === 0) current_rate = current_rate / 2n;
      epoch_emissions.push(current_rate);
    }

  } else { // linear_decay
    // Start high, decay by decay_rate_annual_bps each year
    const initial_epoch_rate = (total_rewards * 2n) / BigInt(total_epochs);
    for (let epoch = 0; epoch < total_epochs; epoch++) {
      const year = Math.floor(epoch / epochs_per_year);
      const decay = Math.pow(1 - decay_rate_annual_bps / 10000, year);
      epoch_emissions.push(BigInt(Math.round(Number(initial_epoch_rate) * decay)));
    }
  }

  return epoch_emissions;
}

// ── ROI Calculator ────────────────────────────────────────────────────────────

export function calculateNodeEconomics(input: NodeEconomicsInput): NodeEconomicsOutput {
  const warnings: string[] = [];

  const total_reward_allocation =
    (input.total_supply * BigInt(input.node_reward_pct)) / 100n;

  const epochs_per_year = Math.round((365 * 24) / input.epoch_length_hours);
  const total_epochs = epochs_per_year * input.duration_years;

  const epoch_emissions = designEmissionSchedule(
    total_reward_allocation,
    input.duration_years,
    input.epoch_length_hours,
    input.schedule_type,
    input.halving_interval_years,
    input.decay_rate_annual_bps
  );

  const year_summaries: YearSummary[] = [];
  let cumulative_hardware_cost = input.hardware_cost_usd;
  let cumulative_earnings_usd = 0;
  let breakeven_months: number | null = null;

  for (let year = 1; year <= input.duration_years; year++) {
    const year_nodes = input.target_nodes_by_year[year - 1] ?? input.target_nodes_by_year.at(-1)!;

    // Get annual emission for this year
    const year_start_epoch = (year - 1) * epochs_per_year;
    const year_end_epoch = Math.min(year * epochs_per_year, epoch_emissions.length);
    const annual_emission = epoch_emissions
      .slice(year_start_epoch, year_end_epoch)
      .reduce((a, b) => a + b, 0n);

    const epoch_emission = annual_emission / BigInt(epochs_per_year || 1);
    const tokens_per_node_per_epoch =
      year_nodes > 0 ? Number(epoch_emission) / year_nodes : 0;
    const usd_per_node_per_epoch = tokens_per_node_per_epoch * input.token_launch_price_usd;
    const usd_per_node_per_month = usd_per_node_per_epoch * (epochs_per_year / 12);
    const monthly_profit_usd = usd_per_node_per_month - input.monthly_opex_usd;

    cumulative_earnings_usd += usd_per_node_per_month * 12;

    if (!breakeven_months && cumulative_earnings_usd >= cumulative_hardware_cost) {
      breakeven_months = (year - 1) * 12 + Math.ceil(cumulative_hardware_cost / (usd_per_node_per_month || 1));
    }

    const cumulative_roi_pct =
      ((cumulative_earnings_usd - cumulative_hardware_cost - input.monthly_opex_usd * year * 12) /
        cumulative_hardware_cost) *
      100;

    year_summaries.push({
      year,
      annual_emission,
      epoch_emission,
      total_nodes: year_nodes,
      tokens_per_node_per_epoch,
      usd_per_node_per_epoch,
      usd_per_node_per_month,
      monthly_opex_usd: input.monthly_opex_usd,
      monthly_profit_usd,
      cumulative_roi_pct,
    });
  }

  // Warnings
  if (input.node_reward_pct > 60)
    warnings.push(`Node reward allocation ${input.node_reward_pct}% is very high — leaves little for treasury and ecosystem`);
  if (input.token_launch_price_usd === 0)
    warnings.push("Token price $0 — all USD projections will be zero");
  if (!breakeven_months)
    warnings.push("⚠ Operators never break even at current projections — verify node count and token price assumptions");
  if (year_summaries[0]?.monthly_profit_usd < 0)
    warnings.push(`Year 1 monthly profit is negative ($${year_summaries[0].monthly_profit_usd.toFixed(2)}) — nodes are not profitable at launch, operator acquisition will be difficult`);

  const year1 = year_summaries[0];
  const year1_roi_pct =
    year1 ? ((year1.usd_per_node_per_month * 12 - input.monthly_opex_usd * 12 - input.hardware_cost_usd) / input.hardware_cost_usd) * 100 : 0;

  const verdict =
    !breakeven_months ? "❌ Economics do not support operator acquisition" :
    breakeven_months <= 12 ? "✅ Excellent — breakeven within 12 months" :
    breakeven_months <= 24 ? "✅ Good — breakeven within 24 months" :
    breakeven_months <= 36 ? "⚠ Marginal — 2-3 year breakeven" :
    "❌ Poor — >3 year breakeven will deter operators";

  return {
    input,
    total_reward_allocation,
    epochs_total: total_epochs,
    year_summaries,
    breakeven_months,
    year1_roi_pct,
    verdict,
    warnings,
  };
}

// ── Sample Output ─────────────────────────────────────────────────────────────

const SAMPLE_INPUT: NodeEconomicsInput = {
  total_supply: 10_000_000_000n,        // 10B tokens
  node_reward_pct: 40,                  // 40% to node operators
  duration_years: 10,
  epoch_length_hours: 24,
  schedule_type: "halving",
  halving_interval_years: 2,
  target_nodes_by_year: [500, 2000, 5000, 8000, 12000, 15000, 18000, 20000, 20000, 20000],
  hardware_cost_usd: 400,               // $400 hotspot/sensor device
  monthly_opex_usd: 8,                  // $8/month electricity + internet
  token_launch_price_usd: 0.05,         // $0.05 launch price
};

const result = calculateNodeEconomics(SAMPLE_INPUT);

// Console output
console.log("\n══════════════════════════════════════════════════");
console.log("  DePIN Node Economics — Sample Output");
console.log("══════════════════════════════════════════════════\n");
console.log(`Total reward pool:  ${result.total_reward_allocation.toLocaleString()} tokens`);
console.log(`Total epochs:       ${result.epochs_total.toLocaleString()}`);
console.log(`Verdict:            ${result.verdict}`);
if (result.breakeven_months) console.log(`Breakeven:          ${result.breakeven_months} months`);
console.log(`Year 1 ROI:         ${result.year1_roi_pct.toFixed(1)}%`);

if (result.warnings.length > 0) {
  console.log("\nWarnings:");
  result.warnings.forEach((w) => console.log(`  ${w}`));
}

console.log("\nYear-by-Year Summary:");
console.table(
  result.year_summaries.map((y) => ({
    Year: y.year,
    "Nodes": y.total_nodes.toLocaleString(),
    "USD/Node/Month": `$${y.usd_per_node_per_month.toFixed(2)}`,
    "Monthly Profit": `$${y.monthly_profit_usd.toFixed(2)}`,
    "Cumulative ROI": `${y.cumulative_roi_pct.toFixed(0)}%`,
  }))
);

// Write output JSON
const outputPath = "roi-output.json";
fs.writeFileSync(outputPath, JSON.stringify(result, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
console.log(`\nFull output written to ${outputPath}\n`);
