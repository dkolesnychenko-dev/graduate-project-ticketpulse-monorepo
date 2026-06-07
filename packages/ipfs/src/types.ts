// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Types
// ═══════════════════════════════════════════════════════════════════════
//
// Canonical TypeScript interfaces for all IPFS-stored data in TicketPulse.
//
// These types are the single source of truth for:
//   1. Frontend (apps/frontend) — when creating an event and uploading metadata
//   2. Subgraph mapping — the schema field `ipfsMetadataCid` points to JSON
//      conforming to EventMetadata
//   3. Deploy scripts — for test event seeding
//
// The structure mirrors what the smart contract expects:
//   - `ipfsCoverImageCid` is stored ON-CHAIN (in contract state)
//   - `ipfsMetadataCid` is emitted in EventInitialized (logged only, NOT in state)
//   - The JSON at `ipfsMetadataCid` conforms to EventMetadata
// ═══════════════════════════════════════════════════════════════════════

/**
 * Current schema version for off-chain EventMetadata stored in IPFS.
 *
 * Increment this string when the `EventMetadata` shape changes in a
 * backward-incompatible way so the upload route can reject stale clients.
 */
export const EVENT_METADATA_SCHEMA_VERSION = '1.0.0' as const

/**
 * Off-chain event metadata stored in IPFS.
 *
 * This JSON is uploaded BEFORE calling `TicketPulseFactory.createEvent()`.
 * The resulting CID is passed as `InitParams.ipfsMetadataCid`.
 *
 * Fields marked "on-chain" are also stored in the smart contract but
 * duplicated here for convenience (so a single IPFS fetch gives all data
 * without needing an RPC call).
 */
export interface EventMetadata {
  /** Schema version for forward compatibility */
  schemaVersion: typeof EVENT_METADATA_SCHEMA_VERSION

  /** Detailed event description (Markdown allowed) */
  description: string

  /** Human-readable location string, e.g. "National Palace of Arts 'Ukraina', Kyiv" */
  location: string
}

/**
 * Result of uploading a file to IPFS.
 * Contains both the raw CID and pre-built gateway URL.
 */
export interface UploadResult {
  /** The Content Identifier (CID) returned by the IPFS node, e.g. "Qm..." or "bafy..." */
  cid: string

  /** Full gateway URL for browser access, e.g. "http://localhost:8080/ipfs/Qm..." */
  gatewayUrl: string
}

/**
 * Configuration for the IPFS client.
 *
 * For local development, you can simply use the exported `LOCAL_IPFS_CONFIG` constant.
 *
 * In production (Pinata), pass:
 *   {
 *     provider: "pinata",
 *     pinataJwt: "...",
 *     infuraGatewayUrl: "https://your-project.infura-ipfs.io" // Optional fallback
 *   }
 */
export interface IpfsConfig {
  /** IPFS API endpoint — for Kubo local node */
  apiUrl?: string

  /** IPFS HTTP Gateway base URL. For local dev, this is http://127.0.0.1:8080. */
  gatewayUrl?: string

  /** Provider name */
  provider?: 'kubo' | 'pinata'

  /** JWT token for Pinata API (required when provider === "pinata" for uploads) */
  pinataJwt?: string

  /** Pinata Gateway domain (required for Pinata V3 SDK, e.g. "example-gateway.mypinata.cloud") */
  pinataGateway?: string

  /** Optional Infura dedicated gateway URL (e.g. https://my-project.infura-ipfs.io) used as fallback */
  infuraGatewayUrl?: string
}
