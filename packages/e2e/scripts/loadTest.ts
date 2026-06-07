import {
  createPublicClient,
  createWalletClient,
  http,
  Address,
  parseEther,
  keccak256,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RPC_URL = 'http://localhost:8545';

// Use the first Anvil account as the main load generator
const ACCOUNT_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = privateKeyToAccount(ACCOUNT_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC_URL, {
    batch: true, // Enable batching for high concurrency
  }),
});

const walletClient = createWalletClient({
  account,
  chain: foundry,
  transport: http(RPC_URL),
});

// Load Contracts
const getFactoryAddress = (): Address => {
  const networksPath = path.resolve(__dirname, '../../subgraph/networks.json');
  if (!fs.existsSync(networksPath)) {
    throw new Error(`networks.json not found! Have you deployed the contracts?`);
  }
  const networks = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
  return networks.localhost.TicketPulseFactory.address as Address;
};

const getAbi = (contractName: string) => {
  const p = path.resolve(
    __dirname,
    `../../contracts/out/${contractName}.sol/${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(p, 'utf8')).abi;
};

async function getFirstEventAddress(factoryAddress: Address, factoryAbi: any): Promise<Address> {
  const total = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: 'totalEvents',
  }) as bigint;

  if (total === 0n) {
    throw new Error('No events found! Please run the seed script first.');
  }

  const firstEvent = await publicClient.readContract({
    address: factoryAddress,
    abi: factoryAbi,
    functionName: 'allEvents',
    args: [0n],
  }) as Address;

  return firstEvent;
}

// ============================================================================
// Load Testing Logic
// ============================================================================

/**
 * Executes a simulated load test.
 * Note: Real 100k concurrent write transactions will crash a local Anvil node.
 * This script chunks the requests and can be configured to run in "Read-only" 
 * or "Write" mode to demonstrate how 100k concurrency is achieved.
 */
async function runLoadTest() {
  const TARGET_REQUESTS = parseInt(process.env.TARGET_REQUESTS || '10000', 10);
  const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '500', 10);
  const MODE = process.env.MODE || 'read'; // 'read' or 'write'

  console.log(`🧨 Starting Load Test...`);
  console.log(`   Target Requests: ${TARGET_REQUESTS}`);
  console.log(`   Chunk Size:      ${CHUNK_SIZE}`);
  console.log(`   Mode:            ${MODE.toUpperCase()}`);
  
  const factoryAddress = getFactoryAddress();
  const factoryAbi = getAbi('TicketPulseFactory');
  const eventAbi = getAbi('TicketPulseEvent');
  
  const eventAddress = await getFirstEventAddress(factoryAddress, factoryAbi);
  console.log(`   Target Event:    ${eventAddress}`);
  console.log('----------------------------------------------------');

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  // Process in chunks to avoid Node.js memory exhaustion and RPC timeouts
  for (let i = 0; i < TARGET_REQUESTS; i += CHUNK_SIZE) {
    const chunkPromises = [];
    const currentChunkSize = Math.min(CHUNK_SIZE, TARGET_REQUESTS - i);

    for (let j = 0; j < currentChunkSize; j++) {
      if (MODE === 'read') {
        // High-concurrency READ: Fetching available ticket supply
        chunkPromises.push(
          publicClient.readContract({
            address: eventAddress,
            abi: eventAbi,
            functionName: 'maxSupply', // Example read function
          }).catch(() => { failed++; })
        );
      } else {
        // High-concurrency WRITE: Simulating ticket mints (Requires funding and gas!)
        // In a real test, you'd use multiple private keys to avoid nonce collisions.
        const dummyHash = keccak256(toHex(`load_test_${Date.now()}_${i}_${j}`));
        chunkPromises.push(
          walletClient.writeContract({
            address: eventAddress,
            abi: eventAbi,
            functionName: 'mintTickets',
            args: [[dummyHash]],
            value: parseEther('0.05'), // Assuming event price is 0.05 ETH
          }).catch((err) => { 
            failed++; 
            if (failed === 1) {
              console.warn(`   ⚠️ First Write Failure Reason: ${err.message || err}`);
            }
          })
        );
      }
    }

    await Promise.all(chunkPromises);
    completed += currentChunkSize;

    // Progress Logging
    const progress = ((completed / TARGET_REQUESTS) * 100).toFixed(2);
    console.log(`   [${progress}%] Completed ${completed} requests... (Failures: ${failed})`);
  }

  const endTime = Date.now();
  const durationSec = (endTime - startTime) / 1000;
  const requestsPerSec = TARGET_REQUESTS / durationSec;

  console.log('----------------------------------------------------');
  console.log(`✅ Load Test Completed in ${durationSec.toFixed(2)} seconds.`);
  console.log(`📊 Performance: ${requestsPerSec.toFixed(2)} req/sec`);
  console.log(`❌ Failures: ${failed} / ${TARGET_REQUESTS}`);
}

runLoadTest().catch((err) => {
  console.error('❌ Load Test failed:', err);
  process.exit(1);
});
