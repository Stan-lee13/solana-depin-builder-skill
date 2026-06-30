# TypeScript Rules for DePIN SDKs and Scripts

## Type Safety

```typescript
// Strict tsconfig.json — always
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true  // forces undefined check on array access
  }
}

// NEVER use 'any' — define proper types for all Solana account data
// ❌ async function getDevice(id: string): Promise<any>
// ✅
interface DeviceAccount {
  deviceId:     string;
  owner:        string;        // base58 pubkey
  locationHash: Uint8Array;
  registeredAt: number;
  trustScore:   number;        // 0–10000 BPS
  totalRewards: bigint;        // use bigint for u64 — number loses precision above 2^53
}
async function getDevice(id: string): Promise<DeviceAccount | null>
```

## BigInt for Token Amounts

```typescript
// ALWAYS use bigint for lamports, token amounts, u64 values
// number can only represent integers up to 2^53 — token amounts routinely exceed this
// ❌ const amount: number = 1_000_000_000_000; // loses precision
// ✅ const amount: bigint = 1_000_000_000_000n;
// ✅ const amount = BigInt("1000000000000");

// Display helper — never display raw lamports to users
function formatTokenAmount(lamports: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = lamports / divisor;
  const fraction = lamports % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}
```

## Error Handling

```typescript
// NEVER silently swallow errors in production scripts
// ❌ try { await sendTx(tx); } catch {}
// ✅
try {
  const sig = await connection.sendTransaction(tx);
  await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, 'confirmed');
} catch (e) {
  if (e instanceof SendTransactionError) {
    const logs = await e.getLogs(connection);
    throw new Error(`Transaction failed:\n${logs.join('\n')}`);
  }
  throw e;
}
```

## Rate Limiting for Helius APIs

```typescript
// Helius free tier: 10 req/s. Paid: 50+ req/s
// Always add delays when batching API calls
const HELIUS_RATE_LIMIT_MS = 100; // 10 req/s = 100ms between requests

async function batchFetch<T>(
  items: string[],
  fetchFn: (item: string) => Promise<T>,
  delayMs = HELIUS_RATE_LIMIT_MS,
): Promise<T[]> {
  const results: T[] = [];
  for (const item of items) {
    results.push(await fetchFn(item));
    await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}
```

## Two-Strike Rule for Tests

- If a test fails twice → STOP. Do not loop-fix. Ask the user.
- Use **Vitest** (not Jest) — faster, better TypeScript support
- Mock Helius/Switchboard APIs in unit tests — no live network calls in CI
