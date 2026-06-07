// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Public API
// ═══════════════════════════════════════════════════════════════════════
//
// Single entry point for all IPFS functionality.
//
// Usage in other packages:
//   import { uploadFile, uploadEventMetadata, cidToGatewayUrl } from "@ticketpulse/ipfs";
//
// ═══════════════════════════════════════════════════════════════════════

// --- Types & Constants ---
export { EVENT_METADATA_SCHEMA_VERSION } from './types'
export type { EventMetadata, UploadResult, IpfsConfig } from './types'

// --- Client ---
export {
  getClient,
  isIpfsAvailable,
  resetClient,
  LOCAL_IPFS_CONFIG,
} from './client'

// --- Upload (Write) ---
export { uploadFile, uploadEventMetadata } from './uploader'

// --- Fetch (Read) ---
export { fetchEventMetadata, fetchFile } from './fetcher'

// --- Gateway URL helpers ---
export {
  getGatewayUrls,
  cidToGatewayUrl,
  ipfsUriToGatewayUrl,
  stripIpfsPrefix,
  cidToIpfsUri,
} from './gateway'
