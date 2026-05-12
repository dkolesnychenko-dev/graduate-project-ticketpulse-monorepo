// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Unit Tests: Gateway URL helpers
// ═══════════════════════════════════════════════════════════════════════
//
// These tests don't need a running IPFS node — they test pure functions.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  cidToGatewayUrl,
  ipfsUriToGatewayUrl,
  getGatewayUrls,
  stripIpfsPrefix,
  cidToIpfsUri,
} from '../src/gateway.js'
import type { IpfsConfig } from '../src/types.js'

const localConfig: IpfsConfig = {
  gatewayUrl: 'http://127.0.0.1:8080',
  provider: 'kubo',
}

const pinataConfig: IpfsConfig = {
  gatewayUrl: 'https://gateway.pinata.cloud',
  provider: 'pinata',
}

// ─── cidToGatewayUrl ────────────────────────────────────────────────

describe('cidToGatewayUrl', () => {
  it('converts CIDv0 to local gateway URL', () => {
    const cid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const url = cidToGatewayUrl(cid, localConfig)
    expect(url).toBe(`http://127.0.0.1:8080/ipfs/${cid}`)
  })

  it('converts CIDv1 to local gateway URL', () => {
    const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
    const url = cidToGatewayUrl(cid, localConfig)
    expect(url).toBe(`http://127.0.0.1:8080/ipfs/${cid}`)
  })

  it('converts CID to production (IPFS.io) gateway URL by default', () => {
    const cid = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
    const url = cidToGatewayUrl(cid, pinataConfig)
    expect(url).toBe(`https://ipfs.io/ipfs/${cid}`)
  })

  it('strips trailing slash from gateway URL', () => {
    const config: IpfsConfig = {
      gatewayUrl: 'http://127.0.0.1:8080/',
      provider: 'kubo',
    }
    const cid = 'QmTest123'
    const url = cidToGatewayUrl(cid, config)
    expect(url).toBe('http://127.0.0.1:8080/ipfs/QmTest123')
  })

  it('handles ipfs:// prefix in CID gracefully', () => {
    const url = cidToGatewayUrl('ipfs://QmTest123', localConfig)
    expect(url).toBe('http://127.0.0.1:8080/ipfs/QmTest123')
  })

  it('throws on empty CID', () => {
    expect(() => cidToGatewayUrl('', localConfig)).toThrow('CID is empty')
  })

  it('throws on whitespace-only CID', () => {
    expect(() => cidToGatewayUrl('   ', localConfig)).toThrow('CID is empty')
  })
})

// ─── getGatewayUrls ─────────────────────────────────────────────────

describe('getGatewayUrls', () => {
  const cid = 'QmTest123'

  it('returns only local gateway for Kubo provider', () => {
    const urls = getGatewayUrls(cid, localConfig)
    expect(urls).toHaveLength(1)
    expect(urls[0]).toBe(`http://127.0.0.1:8080/ipfs/${cid}`)
  })

  it('returns sorted fallback gateways for Pinata provider', () => {
    const urls = getGatewayUrls(cid, pinataConfig)
    expect(urls).toHaveLength(1) // IPFS.io
    expect(urls[0]).toBe(`https://ipfs.io/ipfs/${cid}`)
  })

  it('prioritizes IPFS.io over dedicated Pinata gateway', () => {
    const config: IpfsConfig = {
      provider: 'pinata',
      pinataGateway: 'my-gateway.mypinata.cloud',
    }
    const urls = getGatewayUrls(cid, config)
    expect(urls).toHaveLength(2) // IPFS.io + Pinata Gateway
    expect(urls[0]).toBe(`https://ipfs.io/ipfs/${cid}`)
    expect(urls[1]).toBe(`https://my-gateway.mypinata.cloud/ipfs/${cid}`)
  })

  it('includes Infura in fallbacks when configured', () => {
    const config: IpfsConfig = {
      ...pinataConfig,
      infuraGatewayUrl: 'https://tp-project.infura-ipfs.io',
    }
    const urls = getGatewayUrls(cid, config)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe(`https://ipfs.io/ipfs/${cid}`)
    expect(urls[1]).toBe(`https://tp-project.infura-ipfs.io/ipfs/${cid}`)
  })
})

// ─── ipfsUriToGatewayUrl ────────────────────────────────────────────

describe('ipfsUriToGatewayUrl', () => {
  it('converts ipfs:// URI to gateway URL', () => {
    const url = ipfsUriToGatewayUrl(
      'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
      localConfig,
    )
    expect(url).toBe(
      'http://127.0.0.1:8080/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    )
  })

  it('throws on non-ipfs:// URI', () => {
    expect(() =>
      ipfsUriToGatewayUrl('https://example.com/image.png', localConfig),
    ).toThrow('Expected URI starting with "ipfs://"')
  })
})

// ─── stripIpfsPrefix ────────────────────────────────────────────────

describe('stripIpfsPrefix', () => {
  it('strips ipfs:// prefix', () => {
    expect(stripIpfsPrefix('ipfs://QmTest123')).toBe('QmTest123')
  })

  it('returns raw CID unchanged', () => {
    expect(stripIpfsPrefix('QmTest123')).toBe('QmTest123')
  })
})

// ─── cidToIpfsUri ───────────────────────────────────────────────────

describe('cidToIpfsUri', () => {
  it('wraps CID in ipfs:// URI', () => {
    expect(cidToIpfsUri('QmTest123')).toBe('ipfs://QmTest123')
  })

  it("doesn't double-wrap", () => {
    expect(cidToIpfsUri('ipfs://QmTest123')).toBe('ipfs://QmTest123')
  })
})
