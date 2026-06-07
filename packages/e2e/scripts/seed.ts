import {
  createPublicClient,
  createWalletClient,
  http,
  Address,
  parseEther,
  decodeEventLog,
  keccak256,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import {
  uploadFile,
  uploadEventMetadata,
  LOCAL_IPFS_CONFIG,
} from '@ticketpulse/ipfs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================
const RPC_URL = 'http://localhost:8545';

// Pre-funded Anvil accounts
const ANVIL_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Organizer (Account 0)
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Buyer 1 (Account 1)
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Buyer 2 (Account 2)
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // Buyer 3 (Account 3)
];

const accounts = ANVIL_KEYS.map((k) => privateKeyToAccount(k as `0x${string}`));

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC_URL),
});

const getWalletClient = (accountIndex: number) => {
  return createWalletClient({
    account: accounts[accountIndex],
    chain: foundry,
    transport: http(RPC_URL),
  });
};

// ============================================================================
// Contract Data Loaders
// ============================================================================
const getFactoryAddress = (): Address => {
  const networksPath = path.resolve(__dirname, '../../subgraph/networks.json');
  if (!fs.existsSync(networksPath)) {
    throw new Error(`networks.json not found at ${networksPath}! Have you deployed the contracts?`);
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

// ============================================================================
// Data Models for Seeding
// ============================================================================
interface SeedEvent {
  organizerIdx: number;
  title: string;
  ticketType: string;
  ticketSymbol: string;
  description: string;
  location: string;
  priceEth: string;
  maxSupply: number;
  maxPerWallet: number;
  royaltyPct: number;
  markupPct: number;
  coverImageName: string;
  daysToStart: number;
  durationHours: number;
}

const EVENTS_TO_SEED: SeedEvent[] = [
  {
    organizerIdx: 0,
    title: 'Blockchain Summit 2026',
    ticketType: 'VIP Pass',
    ticketSymbol: 'BS26',
    description: 'The premier blockchain and Web3 conference in Europe. Join founders, developers, and investors for 2 days of deep dives.',
    location: 'Kyiv International Convention Center',
    priceEth: '0.05',
    maxSupply: 1000,
    maxPerWallet: 6,
    royaltyPct: 10,
    markupPct: 20,
    coverImageName: 'blockchain_summit.jpg',
    daysToStart: 30,
    durationHours: 48,
  },
  {
    organizerIdx: 0,
    title: 'Summer Music Festival',
    ticketType: 'General Admission',
    ticketSymbol: 'SMF',
    description: 'A massive 3-day outdoor music festival featuring top international artists and DJs.',
    location: 'Hyde Park, London',
    priceEth: '0.02',
    maxSupply: 5000,
    maxPerWallet: 6,
    royaltyPct: 5,
    markupPct: 50,
    coverImageName: 'music_festival.jpg',
    daysToStart: 60,
    durationHours: 72,
  },
  {
    organizerIdx: 0,
    title: 'Tech Startup Pitch Night',
    ticketType: 'Attendee',
    ticketSymbol: 'PITCH',
    description: 'Watch the top 10 local startups pitch to world-class venture capitalists.',
    location: 'Innovation Hub, Berlin',
    priceEth: '0.01',
    maxSupply: 200,
    maxPerWallet: 6,
    royaltyPct: 15,
    markupPct: 10,
    coverImageName: 'pitch_night.jpg',
    daysToStart: 5,
    durationHours: 4,
  },
  {
    organizerIdx: 0,
    title: 'Modern Art Exhibition',
    ticketType: 'Entry Ticket',
    ticketSymbol: 'ART',
    description: 'Exclusive gallery opening for contemporary digital and physical art.',
    location: 'Metropolitan Art Space, New York',
    priceEth: '0.015',
    maxSupply: 500,
    maxPerWallet: 6,
    royaltyPct: 10,
    markupPct: 25,
    coverImageName: 'art_exhibition.jpg',
    daysToStart: 15,
    durationHours: 8,
  }
];

// ============================================================================
// Helpers
// ============================================================================
const getOrCreateImage = async (filename: string): Promise<Uint8Array> => {
  const assetsDir = path.join(__dirname, '../assets/events');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const filePath = path.join(assetsDir, filename);
  if (fs.existsSync(filePath)) {
    return new Uint8Array(fs.readFileSync(filePath));
  } else {
    console.warn(`⚠️  Image ${filename} not found in assets/events. Using dummy data.`);
    console.warn(`   Tip: Place real images in packages/e2e/assets/events/ for better data!`);
    // Return a valid dummy 1x1 PNG so IPFS and the browser won't crash
    const dummyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    return new Uint8Array(dummyPng);
  }
};

const generateDummyHashes = (count: number): `0x${string}`[] => {
  return Array.from({ length: count }).map((_, i) =>
    keccak256(toHex(`dummy_hash_${Date.now()}_${i}`))
  );
};

// ============================================================================
// Main Execution
// ============================================================================
async function runSeed() {
  console.log('🌱 Starting TicketPulse Seeding Process...');

  const factoryAddress = getFactoryAddress();
  const factoryAbi = getAbi('TicketPulseFactory');
  const eventAbi = getAbi('TicketPulseEvent');

  console.log(`🏭 Factory Address: ${factoryAddress}`);
  console.log('----------------------------------------------------');

  for (const [index, evt] of EVENTS_TO_SEED.entries()) {
    console.log(`\n🚀 Seeding Event ${index + 1}: ${evt.title}`);

    // 1. Upload IPFS Data
    const imageBytes = await getOrCreateImage(evt.coverImageName);
    const coverRes = await uploadFile(imageBytes, LOCAL_IPFS_CONFIG);
    console.log(`   ✅ Cover Image CID: ${coverRes.cid}`);

    const metadataRes = await uploadEventMetadata(
      {
        schemaVersion: '1.0.0',
        description: evt.description,
        location: evt.location,
      },
      LOCAL_IPFS_CONFIG
    );
    console.log(`   ✅ Metadata CID: ${metadataRes.cid}`);

    // 2. Create Event on-chain
    const startTime = Math.floor(Date.now() / 1000) + evt.daysToStart * 86400;
    const endTime = startTime + evt.durationHours * 3600;

    const organizerWallet = getWalletClient(evt.organizerIdx);
    
    const txHash = await organizerWallet.writeContract({
      address: factoryAddress,
      abi: factoryAbi,
      functionName: 'createEvent',
      args: [
        {
          organizer: accounts[evt.organizerIdx].address,
          startTime: BigInt(startTime),
          endTime: BigInt(endTime),
          nominalPrice: parseEther(evt.priceEth),
          maxSupply: evt.maxSupply,
          maxTicketsPerWallet: evt.maxPerWallet,
          royaltyPct: evt.royaltyPct,
          markupPct: evt.markupPct,
          title: evt.title,
          ticketType: evt.ticketType,
          ticketSymbol: evt.ticketSymbol,
          ipfsCoverImageCid: coverRes.cid,
          ipfsMetadataCid: metadataRes.cid,
          location: evt.location,
        },
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    
    // Parse the event address
    const eventCreatedLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === factoryAddress.toLowerCase()
    );
    if (!eventCreatedLog) throw new Error('EventCreated log not found');
    
    const decodedLog = decodeEventLog({
      abi: factoryAbi,
      data: eventCreatedLog.data,
      topics: eventCreatedLog.topics,
    }) as any;

    const eventAddress = decodedLog.args.eventContract as Address;
    console.log(`   ✅ Event Contract Created: ${eventAddress}`);

    // 3. Mint Tickets (Primary Market)
    console.log(`   🎟️  Minting tickets for buyers...`);
    
    // Buyer 1 mints 2 tickets
    const b1Qty = 2;
    const b1Wallet = getWalletClient(1);
    await b1Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'mintTickets',
      args: [generateDummyHashes(b1Qty)],
      value: parseEther(evt.priceEth) * BigInt(b1Qty),
    });

    // Buyer 2 mints 3 tickets
    const b2Qty = 3;
    const b2Wallet = getWalletClient(2);
    await b2Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'mintTickets',
      args: [generateDummyHashes(b2Qty)],
      value: parseEther(evt.priceEth) * BigInt(b2Qty),
    });
    
    // Buyer 3 mints 1 ticket
    const b3Qty = 1;
    const b3Wallet = getWalletClient(3);
    await b3Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'mintTickets',
      args: [generateDummyHashes(b3Qty)],
      value: parseEther(evt.priceEth) * BigInt(b3Qty),
    });

    console.log(`   ✅ Minted 6 tickets across 3 buyers.`);

    // 4. Secondary Market: Listing
    // Buyer 1 lists their 1st ticket (tokenId: 1)
    console.log(`   📈 Secondary Market Activity...`);
    await b1Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'listForSale',
      args: [1n],
    });
    console.log(`      - Buyer 1 (Acc 1) listed Token #1 for sale.`);

    // Buyer 2 lists their 1st ticket (tokenId: 3)
    await b2Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'listForSale',
      args: [3n],
    });
    console.log(`      - Buyer 2 (Acc 2) listed Token #3 for sale.`);

    // 5. Secondary Market: Buying
    // Get secondary price
    const secondaryPrice = (parseEther(evt.priceEth) * (100n + BigInt(evt.markupPct))) / 100n;
    
    // Buyer 3 buys a ticket (will pop the first listing which is Token #1 from Buyer 1)
    await b3Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'placeBuyOrder',
      args: [keccak256(toHex(`new_identity_hash_buyer3`))],
      value: secondaryPrice,
    });
    console.log(`      - Buyer 3 (Acc 3) placed a buy order and bought Token #1!`);

    // 6. Secondary Market: Unmatched Buy Order
    // Buyer 1 places a buy order (but only Token #3 is listed, so it will match with Token #3)
    await b1Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'placeBuyOrder',
      args: [keccak256(toHex(`new_identity_hash_buyer1`))],
      value: secondaryPrice,
    });
    console.log(`      - Buyer 1 (Acc 1) placed a buy order and bought Token #3!`);

    // Let's create an unmatched buy order
    // We need Buyer 2 to place a buy order, since there are no more sell listings, it will remain in queue
    await b2Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'placeBuyOrder',
      args: [keccak256(toHex(`queued_identity_hash_buyer2`))],
      value: secondaryPrice,
    });
    console.log(`      - Buyer 2 (Acc 2) placed a buy order. It is now queued.`);
    
    // Buyer 3 lists Token #6 so the event has an active sell listing too
    await b3Wallet.writeContract({
      address: eventAddress,
      abi: eventAbi,
      functionName: 'listForSale',
      args: [6n],
    });
    // Wait! Since Buyer 2 is in buy queue, if Buyer 3 lists, it will match immediately!
    // That's fine, let's just observe.
    console.log(`      - Buyer 3 (Acc 3) listed Token #6. Matched with Buyer 2!`);

  }

  console.log('\n🎉 All events seeded successfully!');
  console.log('You can now interact with the data on the local frontend.');
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
