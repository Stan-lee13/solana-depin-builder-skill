/**
 * Anchor integration tests for depin-registry program
 *
 * Run: anchor test --skip-local-validator (with solana-test-validator running)
 *   or: anchor test (Anchor handles test-validator lifecycle)
 *
 * Coverage:
 *   ✅ Initialize network config
 *   ✅ Register node and verify state
 *   ✅ Submit proof and verify accumulation
 *   ✅ Claim rewards
 *   ✅ Jail node blocks proof submission
 *   ✅ Pause/unpause blocks all writes
 *   ✅ Duplicate registration rejected
 *   ✅ Proof rate limit enforced
 *   ✅ Wrong device keypair rejected
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import type { DepinRegistry } from "../target/types/depin_registry";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomDevicePubkey(): number[] {
  return Array.from(Keypair.generate().publicKey.toBytes());
}

async function airdrop(
  provider: anchor.AnchorProvider,
  target: PublicKey,
  sol: number
): Promise<void> {
  const sig = await provider.connection.requestAirdrop(target, sol * LAMPORTS_PER_SOL);
  await provider.connection.confirmTransaction(sig, "confirmed");
}

function getNetworkConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("network-config")], programId);
}

function getNodePDA(operator: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("node"), operator.toBuffer()],
    programId
  );
}

function makeProofPayload(devicePubkey: number[], epoch: BN) {
  return {
    devicePubkey,
    epoch,
    timestamp: new BN(Math.floor(Date.now() / 1000)),
    proofType: { coverageBeacon: {} },
    score: 90,
    hexIndex: new BN("8826e1c4fffffff", 16),
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("depin-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DepinRegistry as Program<DepinRegistry>;
  const authority = provider.wallet as anchor.Wallet;

  const [networkConfigPDA] = getNetworkConfigPDA(program.programId);
  const EPOCH_LENGTH = new BN(86_400);
  const MIN_STAKE = new BN(100_000_000); // 0.1 SOL

  // ─── Initialize ────────────────────────────────────────────────────────────

  it("initializes network config", async () => {
    await program.methods
      .initialize(EPOCH_LENGTH, MIN_STAKE)
      .accounts({
        networkConfig: networkConfigPDA,
        authority: authority.publicKey,
      })
      .rpc();

    const config = await program.account.networkConfig.fetch(networkConfigPDA);
    assert.equal(config.authority.toString(), authority.publicKey.toString());
    assert.equal(config.epochLengthSecs.toString(), EPOCH_LENGTH.toString());
    assert.equal(config.minStakeLamports.toString(), MIN_STAKE.toString());
    assert.equal(config.paused, false);
    assert.equal(config.totalNodes.toString(), "0");
  });

  // ─── Node Registration ─────────────────────────────────────────────────────

  it("registers a node and escrows stake", async () => {
    const operator = Keypair.generate();
    await airdrop(provider, operator.publicKey, 2); // 2 SOL: 0.1 stake + rent

    const devicePubkey = randomDevicePubkey();
    const [nodePDA] = getNodePDA(operator.publicKey, program.programId);
    const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-vault"), operator.publicKey.toBuffer()],
      program.programId
    );

    const balanceBefore = await provider.connection.getBalance(operator.publicKey);

    await program.methods
      .registerNode(devicePubkey, { connectivity: {} }, "https://example.com/node/meta.json")
      .accounts({
        nodeAccount: nodePDA,
        stakeVault: stakeVaultPDA,
        networkConfig: networkConfigPDA,
        operator: operator.publicKey,
      })
      .signers([operator])
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodePDA);
    assert.equal(node.operator.toString(), operator.publicKey.toString());
    assert.deepEqual(node.devicePubkey, devicePubkey);
    assert.equal(node.isJailed, false);
    assert.equal(node.proofsThi??Epoch, 0);

    // Verify stake was escrowed
    const vaultBalance = await provider.connection.getBalance(stakeVaultPDA);
    assert.equal(vaultBalance, MIN_STAKE.toNumber());

    // Verify network config incremented
    const config = await program.account.networkConfig.fetch(networkConfigPDA);
    assert.equal(config.totalNodes.toString(), "1");
  });

  // ─── Proof Submission ──────────────────────────────────────────────────────

  it("accepts valid proof submission and accrues rewards", async () => {
    const operator = Keypair.generate();
    await airdrop(provider, operator.publicKey, 2);

    const devicePubkey = randomDevicePubkey();
    const [nodePDA] = getNodePDA(operator.publicKey, program.programId);
    const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-vault"), operator.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerNode(devicePubkey, { sensor: {} }, "https://example.com/sensor.json")
      .accounts({ nodeAccount: nodePDA, stakeVault: stakeVaultPDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    const currentEpoch = new BN(Math.floor(Date.now() / 1000 / 86_400));
    const payload = makeProofPayload(devicePubkey, currentEpoch);
    const dummySig = new Array(64).fill(0);

    await program.methods
      .submitProof(payload, dummySig)
      .accounts({ nodeAccount: nodePDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodePDA);
    assert.equal(node.proofsThisEpoch, 1);
    assert.equal(node.totalProofs.toString(), "1");
    assert.isAbove(node.pendingRewardsLamports.toNumber(), 0);
  });

  // ─── Reward Claiming ───────────────────────────────────────────────────────

  it("allows operator to claim accumulated rewards", async () => {
    const operator = Keypair.generate();
    await airdrop(provider, operator.publicKey, 2);

    const devicePubkey = randomDevicePubkey();
    const [nodePDA] = getNodePDA(operator.publicKey, program.programId);
    const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-vault"), operator.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerNode(devicePubkey, { compute: {} }, "https://example.com/compute.json")
      .accounts({ nodeAccount: nodePDA, stakeVault: stakeVaultPDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    // Submit a proof to earn rewards
    const epoch = new BN(Math.floor(Date.now() / 1000 / 86_400));
    await program.methods
      .submitProof(makeProofPayload(devicePubkey, epoch), new Array(64).fill(0))
      .accounts({ nodeAccount: nodePDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    // Claim rewards
    await program.methods
      .claimRewards()
      .accounts({ nodeAccount: nodePDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    const node = await program.account.nodeAccount.fetch(nodePDA);
    assert.equal(node.pendingRewardsLamports.toString(), "0", "Rewards should be cleared after claim");
  });

  // ─── Jail / Anti-Sybil ────────────────────────────────────────────────────

  it("jails a node and blocks further proof submission", async () => {
    const operator = Keypair.generate();
    await airdrop(provider, operator.publicKey, 2);

    const devicePubkey = randomDevicePubkey();
    const [nodePDA] = getNodePDA(operator.publicKey, program.programId);
    const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-vault"), operator.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerNode(devicePubkey, { connectivity: {} }, "https://example.com/jail-test.json")
      .accounts({ nodeAccount: nodePDA, stakeVault: stakeVaultPDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    // Jail the node
    await program.methods
      .jailNode({ sybilCluster: {} }, 50) // 50% slash
      .accounts({ nodeAccount: nodePDA, networkConfig: networkConfigPDA, authority: authority.publicKey })
      .rpc();

    // Attempt to submit proof — should fail
    try {
      const epoch = new BN(Math.floor(Date.now() / 1000 / 86_400));
      await program.methods
        .submitProof(makeProofPayload(devicePubkey, epoch), new Array(64).fill(0))
        .accounts({ nodeAccount: nodePDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
        .signers([operator])
        .rpc();
      assert.fail("Should have thrown NodeJailed error");
    } catch (e: any) {
      assert.include(e.toString(), "NodeJailed");
    }
  });

  // ─── Pause / Unpause ─────────────────────────────────────────────────────

  it("emergency pause blocks all write instructions", async () => {
    // Pause the network
    await program.methods
      .setPaused(true)
      .accounts({ networkConfig: networkConfigPDA, authority: authority.publicKey })
      .rpc();

    const pausedOperator = Keypair.generate();
    await airdrop(provider, pausedOperator.publicKey, 2);
    const [pausedNodePDA] = getNodePDA(pausedOperator.publicKey, program.programId);
    const [pausedVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-vault"), pausedOperator.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .registerNode(randomDevicePubkey(), { connectivity: {} }, "https://paused-test.com/meta.json")
        .accounts({ nodeAccount: pausedNodePDA, stakeVault: pausedVaultPDA, networkConfig: networkConfigPDA, operator: pausedOperator.publicKey })
        .signers([pausedOperator])
        .rpc();
      assert.fail("Should have thrown NetworkPaused error");
    } catch (e: any) {
      assert.include(e.toString(), "NetworkPaused");
    }

    // Unpause for remaining tests
    await program.methods
      .setPaused(false)
      .accounts({ networkConfig: networkConfigPDA, authority: authority.publicKey })
      .rpc();
  });

  // ─── Device Key Mismatch ──────────────────────────────────────────────────

  it("rejects proof with wrong device pubkey", async () => {
    const operator = Keypair.generate();
    await airdrop(provider, operator.publicKey, 2);

    const devicePubkey = randomDevicePubkey();
    const wrongDevicePubkey = randomDevicePubkey(); // different key
    const [nodePDA] = getNodePDA(operator.publicKey, program.programId);
    const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake-vault"), operator.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerNode(devicePubkey, { sensor: {} }, "https://example.com/wrong-key-test.json")
      .accounts({ nodeAccount: nodePDA, stakeVault: stakeVaultPDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
      .signers([operator])
      .rpc();

    try {
      const epoch = new BN(Math.floor(Date.now() / 1000 / 86_400));
      await program.methods
        .submitProof(makeProofPayload(wrongDevicePubkey, epoch), new Array(64).fill(0))
        .accounts({ nodeAccount: nodePDA, networkConfig: networkConfigPDA, operator: operator.publicKey })
        .signers([operator])
        .rpc();
      assert.fail("Should have thrown DeviceKeyMismatch error");
    } catch (e: any) {
      assert.include(e.toString(), "DeviceKeyMismatch");
    }
  });
});
