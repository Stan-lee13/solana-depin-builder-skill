/**
 * Performance benchmarks for ROI calculator
 * Run: npx ts-node benchmarks/performance.ts
 */

import { calculateNodeEconomics, designEmissionSchedule } from "../src/roi-calculator";

// ── Benchmark Utilities ─────────────────────────────────────────────────

function benchmark(name: string, fn: () => void, iterations: number = 1000): void {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const avgMs = (end - start) / iterations;
  const opsPerSec = 1000 / avgMs;
  
  console.log(`${name}:`);
  console.log(`  Average: ${avgMs.toFixed(4)}ms`);
  console.log(`  Ops/sec: ${opsPerSec.toFixed(0)}`);
  console.log();
}

// ── Benchmarks ───────────────────────────────────────────────────────────

console.log("=== Performance Benchmarks ===\n");

// Benchmark: Emission Schedule Calculation
benchmark("Emission Schedule (Constant, 10 years)", () => {
  designEmissionSchedule(4_000_000_000n, 10, 24, "constant");
});

benchmark("Emission Schedule (Halving, 10 years)", () => {
  designEmissionSchedule(4_000_000_000n, 10, 24, "halving", 2);
});

benchmark("Emission Schedule (Linear Decay, 10 years)", () => {
  designEmissionSchedule(4_000_000_000n, 10, 24, "linear_decay", 2, 1000);
});

// Benchmark: Node Economics Calculation
const BASE_INPUT = {
  total_supply: 10_000_000_000n,
  node_reward_pct: 40,
  duration_years: 10,
  epoch_length_hours: 24,
  schedule_type: "halving" as const,
  halving_interval_years: 2,
  target_nodes_by_year: [500, 2000, 5000, 8000, 12000, 15000, 18000, 20000, 20000, 20000],
  hardware_cost_usd: 400,
  monthly_opex_usd: 8,
  token_launch_price_usd: 0.05,
};

benchmark("Node Economics (10 years, 10 nodes)", () => {
  calculateNodeEconomics(BASE_INPUT);
});

benchmark("Node Economics (5 years, 5 nodes)", () => {
  calculateNodeEconomics({
    ...BASE_INPUT,
    duration_years: 5,
    target_nodes_by_year: [500, 2000, 5000, 8000, 12000],
  });
});

// Benchmark: Large-scale calculation
benchmark("Node Economics (20 years, 20 nodes)", () => {
  calculateNodeEconomics({
    ...BASE_INPUT,
    duration_years: 20,
    target_nodes_by_year: Array(20).fill(20000),
  });
});

console.log("=== Benchmark Complete ===");
