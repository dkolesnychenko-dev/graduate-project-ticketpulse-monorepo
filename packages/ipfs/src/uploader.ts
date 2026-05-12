// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Uploader
// ═══════════════════════════════════════════════════════════════════════
//
// High-level upload functions used by the frontend and deploy scripts.
//
// Upload flow when creating an event:
//   1. User selects cover image in the frontend form
//   2. Frontend calls `uploadFile(imageBuffer)` → returns { cid, gatewayUrl }
//   3. Frontend calls `uploadEventMetadata({...})` → returns { cid, gatewayUrl }
//   4. Frontend calls `TicketPulseFactory.createEvent()` with:
//        - InitParams.ipfsMetadataCid   = step 3 cid
//   5. The smart contract stores ipfsCoverImageCid in state
//   6. The smart contract emits ipfsMetadataCid in EventInitialized log
//   7. The subgraph handler saves ipfsMetadataCid as a string in the Event entity
//   8. The frontend reads ipfsMetadataCid from the subgraph via GraphQL,
//      then fetches the full JSON from the gateway for display
// ═══════════════════════════════════════════════════════════════════════

import { getClient, LOCAL_IPFS_CONFIG } from './client.js'
import { cidToGatewayUrl } from './gateway.js'
import type { IpfsConfig, EventMetadata, UploadResult } from './types.js'

/**
 * Upload a raw file (image, PDF, etc.) to IPFS.
 *
 * @param content - File content as Uint8Array or Buffer
 * @param config  - IPFS configuration (defaults to local Kubo)
 * @returns Upload result with CID and gateway URL
 *
 * @example
 * ```ts
 * // In a browser (Next.js frontend):
 * const file = inputElement.files[0];
 * const buffer = new Uint8Array(await file.arrayBuffer());
 * const result = await uploadFile(buffer);
 * // result.cid → "QmYwA..."
 * // result.gatewayUrl → "http://127.0.0.1:8080/ipfs/QmYwA..."
 * ```
 *
 * @example
 * ```ts
 * // In Node.js (deploy scripts):
 * import { readFileSync } from "fs";
 * const buffer = readFileSync("cover.png");
 * const result = await uploadFile(new Uint8Array(buffer));
 * ```
 */
export async function uploadFile(
  content: Uint8Array,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): Promise<UploadResult> {
  let cid: string

  if (config.provider === 'pinata') {
    if (!config.pinataJwt || !config.pinataGateway) {
      throw new Error(
        "[IPFS] pinataJwt and pinataGateway are required in config when provider is 'pinata'.",
      )
    }

    const { PinataSDK } = await import('pinata')
    const pinata = new PinataSDK({
      pinataJwt: config.pinataJwt,
      pinataGateway: config.pinataGateway,
    })

    const file = new File([content as any], 'upload.bin', {
      type: 'application/octet-stream',
    })
    const upload = await pinata.upload.file(file)
    cid = upload.cid
  } else {
    // Default to Kubo (local)
    const client = getClient(config)

    // `client.add()` accepts Uint8Array, Buffer, string, etc.
    // We pin immediately so the local node won't garbage-collect it.
    const result = await client.add(content, { pin: true })
    cid = result.cid.toString()
  }

  return {
    cid,
    gatewayUrl: cidToGatewayUrl(cid, config),
  }
}

/**
 * Upload the full EventMetadata JSON to IPFS.
 *
 * This is the JSON that `ipfsMetadataCid` points to.
 * It contains all off-chain event details (description, location, etc.)
 * plus duplicates of on-chain fields for convenience.
 *
 * @param metadata - Structured event metadata
 * @param config   - IPFS configuration (defaults to local Kubo)
 * @returns Upload result with CID and gateway URL
 *
 * @example
 * ```ts
 * const coverResult = await uploadFile(coverImageBuffer);
 *
 * const metadataResult = await uploadEventMetadata({
 *   schemaVersion: "1.0.0",
 *   title: "Tech Night Kharkiv 2026",
 *   ticketType: "General Admission",
 *   ticketSymbol: "TNKH26",
 *   description: "Annual tech meetup...",
 *   location: "Fabrika.space, Харків",
 *   startDate: "2026-06-15T18:00:00+03:00",
 *   endDate: "2026-06-15T23:00:00+03:00",
 *   organizerName: "TicketPulse Team",
 * });
 *
 * // Now call createEvent() with:
 * //   ipfsCoverImageCid = coverResult.cid
 * //   ipfsMetadataCid   = metadataResult.cid
 * ```
 */
export async function uploadEventMetadata(
  metadata: EventMetadata,
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): Promise<UploadResult> {
  // Validate required fields before uploading
  validateEventMetadata(metadata)

  const json = JSON.stringify(metadata, null, 2)
  const bytes = new TextEncoder().encode(json)

  return uploadFile(bytes, config)
}

/**
 * Validate EventMetadata before upload.
 * Throws descriptive errors for missing/invalid fields.
 */
function validateEventMetadata(metadata: EventMetadata): void {
  if (metadata.schemaVersion !== '1.0.0') {
    throw new Error(
      `[IPFS] Unsupported schema version: "${metadata.schemaVersion}". Expected "1.0.0".`,
    )
  }

  const requiredStrings: (keyof EventMetadata)[] = [
    'description',
    'location',
  ]

  for (const field of requiredStrings) {
    const value = metadata[field]
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(
        `[IPFS] EventMetadata.${field} is required and must be a non-empty string.`,
      )
    }
  }

}
