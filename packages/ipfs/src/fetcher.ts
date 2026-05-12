// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Fetcher (Read from IPFS)
// ═══════════════════════════════════════════════════════════════════════
//
// Retrieves content from IPFS via the HTTP Gateway.
//
// Used by the frontend to:
//   1. Fetch EventMetadata JSON from `ipfsMetadataCid` (stored in subgraph)
//   2. Display cover images via `ipfsCoverImageCid`
//
// Note: We fetch via the HTTP gateway (port 8080), NOT via the RPC API
// (port 5001). The gateway is designed for read-only access and is
// what browsers can reach directly. The RPC API is for writes (uploads).
// ═══════════════════════════════════════════════════════════════════════

import { getGatewayUrls } from './gateway.js'
import { LOCAL_IPFS_CONFIG } from './client.js'
import type { IpfsConfig, EventMetadata } from './types.js'

/**
 * Fetch EventMetadata JSON from IPFS by CID.
 *
 * This is the primary way the frontend loads event details:
 *   1. Query subgraph for `event.ipfsMetadataCid`
 *   2. Call `fetchEventMetadata(cid)` to get the full metadata
 *   3. Display description, location, gallery images, etc.
 *
 * @param cid    - The CID stored in `Event.ipfsMetadataCid` (from subgraph)
 * @param config - IPFS configuration
 * @returns Parsed EventMetadata object
 *
 * @example
 * ```ts
 * // In a Next.js page/component:
 * const { data } = useQuery(GET_EVENT, { variables: { id: eventAddress } });
 * const metadata = await fetchEventMetadata(data.event.ipfsMetadataCid);
 * // metadata.description → "Annual tech meetup..."
 * // metadata.location → "Fabrika.space, Харків"
 * ```
 */
export async function fetchEventMetadata(
  cid: string,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): Promise<EventMetadata> {
  const urls = getGatewayUrls(cid, config)
  let lastError: Error | null = null

  for (const url of urls) {
    try {
      let data: any

      // Use Pinata SDK for reading if it's a Pinata URL and we have credentials
      const isPinataUrl =
        config.pinataGateway && url.includes(config.pinataGateway)
      if (isPinataUrl && config.pinataJwt && config.provider === 'pinata') {
        const { PinataSDK } = await import('pinata')
        const pinata = new PinataSDK({
          pinataJwt: config.pinataJwt,
          pinataGateway: config.pinataGateway,
        })
        const response = await pinata.gateways.get(cid)
        data = response.data
      } else {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(
            `[IPFS] HTTP ${response.status} ${response.statusText}`,
          )
        }
        data = await response.json()
      }

      // Basic runtime validation
      if (
        typeof data !== 'object' ||
        data === null ||
        !('schemaVersion' in data) ||
        !('description' in data)
      ) {
        throw new Error(
          `[IPFS] Content at CID "${cid}" is not a valid EventMetadata JSON.`,
        )
      }

      return data as EventMetadata
    } catch (err: any) {
      lastError = err
      // Continue to next URL
    }
  }

  throw new Error(
    `[IPFS] Failed to fetch metadata for CID ${cid} from all gateways. Last error: ${lastError?.message}`,
  )
}

/**
 * Fetch raw bytes from IPFS (e.g. for downloading an image as a buffer).
 *
 * In most cases, you don't need this — just use `cidToGatewayUrl()` and
 * pass the URL directly to an `<img>` tag. This function is useful for
 * server-side processing or when you need the raw bytes.
 *
 * @param cid    - Content Identifier
 * @param config - IPFS configuration
 * @returns Raw file content as Uint8Array
 */
export async function fetchFile(
  cid: string,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): Promise<Uint8Array> {
  const urls = getGatewayUrls(cid, config)
  let lastError: Error | null = null

  for (const url of urls) {
    try {
      // Use Pinata SDK for reading if it's a Pinata URL and we have credentials
      const isPinataUrl =
        config.pinataGateway && url.includes(config.pinataGateway)
      if (isPinataUrl && config.pinataJwt && config.provider === 'pinata') {
        const { PinataSDK } = await import('pinata')
        const pinata = new PinataSDK({
          pinataJwt: config.pinataJwt,
          pinataGateway: config.pinataGateway,
        })
        const response = await pinata.gateways.get(cid)

        // Pinata SDK returns data as string, object, or Blob/Buffer depending on content
        if (response.data instanceof Blob) {
          return new Uint8Array(await response.data.arrayBuffer())
        } else if (typeof response.data === 'string') {
          return new TextEncoder().encode(response.data)
        } else if (response.data instanceof Uint8Array) {
          return response.data
        } else {
          // Fallback for objects/JSON
          return new TextEncoder().encode(JSON.stringify(response.data))
        }
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`[IPFS] HTTP ${response.status} ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      return new Uint8Array(buffer)
    } catch (err: any) {
      lastError = err
      // Continue to next URL
    }
  }

  throw new Error(
    `[IPFS] Failed to fetch file for CID ${cid} from all gateways. Last error: ${lastError?.message}`,
  )
}
