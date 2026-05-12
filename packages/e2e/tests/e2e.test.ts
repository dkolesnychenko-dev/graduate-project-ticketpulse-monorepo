import { expect, describe, it } from 'vitest'
import {
  createPublicClient,
  createWalletClient,
  http,
  Address,
  parseEther,
  decodeEventLog,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'
import { request, gql } from 'graphql-request'
import {
  uploadFile,
  uploadEventMetadata,
  fetchEventMetadata,
  LOCAL_IPFS_CONFIG,
} from '@ticketpulse/ipfs'
import * as fs from 'fs'
import * as path from 'path'

// ═══════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════

const RPC_URL = 'http://localhost:8545'
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/ticketpulse/subgraph'

// Dynamically read the latest local deployment address from networks.json
const networks = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../subgraph/networks.json'), 'utf8'),
)
const FACTORY_ADDRESS = networks.localhost.TicketPulseFactory.address as Address

// Path to Contract ABIs
const CONTRACTS_DIR = path.join(__dirname, '../../contracts/out')
const FACTORY_ABI = JSON.parse(
  fs.readFileSync(
    path.join(CONTRACTS_DIR, 'TicketPulseFactory.sol/TicketPulseFactory.json'),
    'utf8',
  ),
).abi

// Standard Anvil Account #0
const ANVIL_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const account = privateKeyToAccount(ANVIL_KEY)

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(RPC_URL),
})

const walletClient = createWalletClient({
  account,
  chain: foundry,
  transport: http(RPC_URL),
})

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Polls the subgraph until the predicate is met or timeout is reached.
 */
async function waitForSubgraph(
  query: string,
  variables: any,
  predicate: (data: any) => boolean,
  timeout = 30000,
) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const data = await request(SUBGRAPH_URL, query, variables)
      if (predicate(data)) return data
    } catch (e) {
      // Ignore query errors during sync
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Timeout waiting for subgraph indexing')
}

// ═══════════════════════════════════════════════════════════════════════
// E2E Test Suite
// ═══════════════════════════════════════════════════════════════════════

describe('TicketPulse Subgraph E2E Integration', () => {
  it('should index a new event created via the Factory', async () => {
    // 0. Upload IPFS Metadata
    // Load a real image from assets if it exists, otherwise use a dummy
    const assetPath = path.join(__dirname, '../assets/test-cover.png')
    let coverImage: Uint8Array

    if (fs.existsSync(assetPath)) {
      coverImage = new Uint8Array(fs.readFileSync(assetPath))
      console.log('\n🖼️  Using real image from assets/test-cover.png')
    } else {
      coverImage = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
      console.log('\n⚠️  Assets not found, using dummy image')
    }

    console.log('⏳ Uploading cover image to IPFS...')
    const coverResult = await uploadFile(coverImage, LOCAL_IPFS_CONFIG)
    console.log(`✅ Cover Image uploaded. CID: ${coverResult.cid}`)

    const metadataToUpload = {
      schemaVersion: '1.0.0' as const,
      description: 'E2E Test Description for Concert',
      location: 'Test Arena',
    }
    console.log('⏳ Uploading event metadata to IPFS...')
    const metadataResult = await uploadEventMetadata(
      metadataToUpload,
      LOCAL_IPFS_CONFIG,
    )
    console.log(`✅ Metadata uploaded. CID: ${metadataResult.cid}`)

    // 1. Setup event parameters
    const startTime = Math.floor(Date.now() / 1000) + 86400 // 1 day from now
    const endTime = startTime + 7200 // 2 hours duration

    const params = {
      organizer: account.address,
      startTime: BigInt(startTime),
      endTime: BigInt(endTime),
      nominalPrice: parseEther('0.01'),
      maxSupply: 1000,
      maxTicketsPerWallet: 5,
      royaltyPct: 10,
      markupPct: 20,
      title: 'E2E Test Concert',
      ticketType: 'General',
      ticketSymbol: 'E2E',
      ipfsCoverImageCid: coverResult.cid,
      ipfsMetadataCid: metadataResult.cid,
      location: 'Test Arena',
    }

    // 2. Create Event on-chain
    console.log('⏳ Sending createEvent transaction...')
    const hash = await walletClient.writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'createEvent',
      args: [params],
    })
    console.log(`✅ Transaction sent. Hash: ${hash}`)

    console.log('⏳ Waiting for transaction receipt...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ Transaction mined.')

    // Find and decode the EventCreated log
    const eventCreatedLog = receipt.logs.find(
      (log) => log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase(),
    )

    if (!eventCreatedLog) throw new Error('EventCreated log not found')

    const decodedLog = decodeEventLog({
      abi: FACTORY_ABI,
      data: eventCreatedLog.data,
      topics: eventCreatedLog.topics,
    })

    const eventAddress = (decodedLog as any).args.eventContract.toLowerCase()
    console.log(`\n🎫 Event Created at: ${eventAddress}`)

    // 3. Wait for Subgraph to index the new event
    const query = gql`
      query GetEvent($id: ID!) {
        event(id: $id) {
          id
          organizer
          totalMinted
          ipfsMetadataCid
          ipfsCoverImageCid
        }
      }
    `

    const data: any = await waitForSubgraph(
      query,
      { id: eventAddress },
      (res: any) => res.event !== null,
    )

    // 4. Assertions on Subgraph Indexing
    expect(data.event).toBeDefined()
    expect(data.event.id).toBe(eventAddress)
    expect(data.event.totalMinted).toBe(0)
    expect(data.event.ipfsMetadataCid).toBe(metadataResult.cid)
    expect(data.event.ipfsCoverImageCid).toBe(coverResult.cid)

    // 5. IPFS Fetch Verification
    // We simulate what the frontend does: reading CID from subgraph and fetching it
    const fetchedMetadata = await fetchEventMetadata(
      data.event.ipfsMetadataCid,
      LOCAL_IPFS_CONFIG,
    )
    expect(fetchedMetadata.schemaVersion).toBe('1.0.0')
    expect(fetchedMetadata.description).toBe(metadataToUpload.description)
    expect(fetchedMetadata.location).toBe(metadataToUpload.location)
  })
})
