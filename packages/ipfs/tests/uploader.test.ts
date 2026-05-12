// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Unit Tests: Uploader validation
// ═══════════════════════════════════════════════════════════════════════
//
// Tests the validation logic in uploadEventMetadata().
// These tests mock the IPFS client so they don't need a running node.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventMetadata } from '../src/types.js'

// Mock kubo-rpc-client
vi.mock('kubo-rpc-client', () => ({
  create: vi.fn(() => ({
    add: vi.fn(async () => ({
      cid: { toString: () => 'QmMockedCID12345678901234567890123456789012' },
    })),
    id: vi.fn(async () => ({ id: 'mock-peer-id' })),
  })),
}))

// Mock pinata SDK
vi.mock('pinata', () => ({
  PinataSDK: vi.fn(() => ({
    upload: {
      public: {
        file: vi.fn(async () => ({
          cid: 'QmMockedPinataCID',
        })),
      },
    },
    testAuthentication: vi.fn(async () => true),
  })),
}))

// Now import our code (after mocks are set up)
const { uploadEventMetadata } = await import('../src/uploader.js')
const { resetClient } = await import('../src/client.js')
const { cidToGatewayUrl } = await import('../src/gateway.js')

/** Valid test metadata conforming to EventMetadata */
function validMetadata(): EventMetadata {
  return {
    schemaVersion: '1.0.0',
    ipfsCoverImageCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    description: 'Annual tech meetup featuring top speakers',
    location: 'Fabrika.space, Харків',
  }
}

describe('uploadEventMetadata — validation', () => {
  beforeEach(() => {
    resetClient()
  })

  it('succeeds with valid metadata', async () => {
    const result = await uploadEventMetadata(validMetadata())
    expect(result.cid).toBe('QmMockedCID12345678901234567890123456789012')
    expect(result.gatewayUrl).toContain('/ipfs/QmMockedCID')
  })

  it('rejects invalid schema version', async () => {
    const metadata = validMetadata()
    // @ts-expect-error — intentionally setting wrong version
    metadata.schemaVersion = '2.0.0'
    await expect(uploadEventMetadata(metadata)).rejects.toThrow(
      'schema version',
    )
  })
  it('rejects empty description', async () => {
    const metadata = validMetadata()
    metadata.description = ''
    await expect(uploadEventMetadata(metadata)).rejects.toThrow('description')
  })

  it('rejects whitespace-only location', async () => {
    const metadata = validMetadata()
    metadata.location = '   '
    await expect(uploadEventMetadata(metadata)).rejects.toThrow('location')
  })

  it('rejects invalid CID format for ipfsCoverImageCid', async () => {
    const metadata = validMetadata()
    metadata.ipfsCoverImageCid = 'not-a-cid'
    await expect(uploadEventMetadata(metadata)).rejects.toThrow(
      'ipfsCoverImageCid',
    )
  })

  it("accepts CIDv1 format (starts with 'b')", async () => {
    const metadata = validMetadata()
    metadata.ipfsCoverImageCid =
      'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    const result = await uploadEventMetadata(metadata)
    expect(result.cid).toBeTruthy()
  })

  it('succeeds with valid metadata using Pinata provider', async () => {
    const config = {
      provider: 'pinata' as const,
      pinataJwt: 'mock-jwt',
      pinataGateway: 'mock-gateway.mypinata.cloud',
    }
    const result = await uploadEventMetadata(validMetadata(), config)
    expect(result.cid).toBe('QmMockedPinataCID')
  })
})
