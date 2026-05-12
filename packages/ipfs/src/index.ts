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

// --- Types ---
export type { EventMetadata, UploadResult, IpfsConfig } from './types.js'

// --- Client ---
export {
  getClient,
  isIpfsAvailable,
  resetClient,
  LOCAL_IPFS_CONFIG,
} from './client.js'

// --- Upload (Write) ---
export { uploadFile, uploadEventMetadata } from './uploader.js'

// --- Fetch (Read) ---
export { fetchEventMetadata, fetchFile } from './fetcher.js'

// --- Gateway URL helpers ---
export {
  cidToGatewayUrl,
  ipfsUriToGatewayUrl,
  stripIpfsPrefix,
  cidToIpfsUri,
} from './gateway.js'
