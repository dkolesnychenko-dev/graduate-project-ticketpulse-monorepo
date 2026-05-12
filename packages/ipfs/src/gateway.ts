// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Gateway URL Resolver
// ═══════════════════════════════════════════════════════════════════════
//
// Converts IPFS CIDs and `ipfs://` URIs into HTTP URLs that browsers
// can fetch directly.
//
// Why is this needed?
//   The smart contract's `tokenURI()` returns JSON with:
//     "image": "ipfs://QmYwABCDEF..."
//   Browsers don't understand `ipfs://` natively.
//   We need to convert it to:
//     "image": "http://127.0.0.1:8080/ipfs/QmYwABCDEF..."  (local)
//     "image": "https://gateway.pinata.cloud/ipfs/QmYwABCDEF..."  (prod)
//
// The same logic applies to ipfsMetadataCid and ipfsCoverImageCid
// stored in the subgraph's Event entity.
// ═══════════════════════════════════════════════════════════════════════

import { LOCAL_IPFS_CONFIG } from './client.js'
import type { IpfsConfig } from './types.js'

/**
 * Convert a raw CID string into a full HTTP gateway URL.
 *
 * @param cid    - IPFS Content Identifier (e.g. "QmYwABCDEF..." or "bafybeig...")
 * @param config - IPFS configuration with gatewayUrl
 * @returns Full HTTP URL, e.g. "http://127.0.0.1:8080/ipfs/QmYwABCDEF..."
 *
 * @example
 * ```ts
 * const url = cidToGatewayUrl("QmYwABCDEF...");
 * // → "http://127.0.0.1:8080/ipfs/QmYwABCDEF..."
 *
 * // In Next.js <Image> component:
 * <Image src={cidToGatewayUrl(event.ipfsCoverImageCid)} alt={event.title} />
 * ```
 */
/**
 * Get an array of HTTP gateway URLs for a CID, sorted by priority.
 *
 * Local: Returns only the configured local gateway.
 * Production: Returns [IPFS.io, Infura (if configured)]
 */
export function getGatewayUrls(
  cid: string,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): string[] {
  if (!cid || cid.trim().length === 0) {
    throw new Error('[IPFS] Cannot create gateway URL: CID is empty.')
  }

  const cleanCid = stripIpfsPrefix(cid)

  if (config.provider === 'kubo') {
    const gateway = (
      config.gatewayUrl || LOCAL_IPFS_CONFIG.gatewayUrl!
    ).replace(/\/+$/, '')
    return [`${gateway}/ipfs/${cleanCid}`]
  }

  // Production fallbacks
  const gateways: string[] = ['https://ipfs.io']

  if (config.provider === 'pinata' && config.pinataGateway) {
    const pinataDomain = config.pinataGateway
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
    gateways.push(`https://${pinataDomain}`)
  }

  if (config.infuraGatewayUrl) {
    gateways.push(config.infuraGatewayUrl.replace(/\/+$/, ''))
  }

  return gateways.map((g) => `${g}/ipfs/${cleanCid}`)
}

/**
 * Convert a raw CID string into a single HTTP gateway URL (the highest priority one).
 *
 * @param cid    - IPFS Content Identifier
 * @param config - IPFS configuration
 * @returns Full HTTP URL
 */
export function cidToGatewayUrl(
  cid: string,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): string {
  return getGatewayUrls(cid, config)[0]
}

/**
 * Convert an `ipfs://` URI to an HTTP gateway URL.
 *
 * This is the inverse of what the smart contract does in `tokenURI()`:
 *   Contract stores: `ipfs://QmYwABCDEF...`
 *   Frontend needs:  `http://127.0.0.1:8080/ipfs/QmYwABCDEF...`
 *
 * @param ipfsUri - Full IPFS URI (e.g. "ipfs://QmYwABCDEF...")
 * @param config  - IPFS configuration
 * @returns HTTP gateway URL
 *
 * @example
 * ```ts
 * // When parsing tokenURI JSON from the smart contract:
 * const tokenData = JSON.parse(atob(tokenURI.split(",")[1]));
 * const imageUrl = ipfsUriToGatewayUrl(tokenData.image);
 * // tokenData.image = "ipfs://QmXyz..."
 * // imageUrl = "http://127.0.0.1:8080/ipfs/QmXyz..."
 * ```
 */
export function ipfsUriToGatewayUrl(
  ipfsUri: string,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    throw new Error(
      `[IPFS] Expected URI starting with "ipfs://", got: "${ipfsUri}"`,
    )
  }

  const cid = ipfsUri.slice('ipfs://'.length)
  return cidToGatewayUrl(cid, config)
}

/**
 * Strip `ipfs://` prefix if present, returning just the CID.
 * Handles both "ipfs://Qm..." and raw "Qm..." inputs.
 */
export function stripIpfsPrefix(input: string): string {
  if (input.startsWith('ipfs://')) {
    return input.slice('ipfs://'.length)
  }
  return input
}

/**
 * Build an `ipfs://` URI from a raw CID.
 * Useful when constructing data for smart contract calls.
 *
 * @param cid - Raw CID string
 * @returns `ipfs://` prefixed URI
 *
 * @example
 * ```ts
 * const uri = cidToIpfsUri("QmYwABCDEF...");
 * // → "ipfs://QmYwABCDEF..."
 * ```
 */
export function cidToIpfsUri(cid: string): string {
  const cleanCid = stripIpfsPrefix(cid)
  return `ipfs://${cleanCid}`
}
