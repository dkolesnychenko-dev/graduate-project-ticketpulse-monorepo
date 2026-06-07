import type { IpfsConfig } from '@ticketpulse/ipfs'

import { publicEnv } from '@/shared/env/public'

/**
 * Build the IPFS configuration used by client-side code (Image src,
 * cidToGatewayUrl helpers). Crucially this never touches PINATA_JWT —
 * uploads always go through `/api/ipfs/upload` so the secret stays
 * server-side.
 *
 * The gateway list is comma-separable via `NEXT_PUBLIC_IPFS_GATEWAY_URL`
 * — when set, the SDK's view-aggregator tries each in order.
 */
export function getClientIpfsConfig(): IpfsConfig {
  const gatewayUrl = publicEnv.NEXT_PUBLIC_IPFS_GATEWAY_URL

  // Local Kubo (http://127.0.0.1:8080) — use kubo provider
  if (gatewayUrl?.startsWith('http://127.0.0.1') || gatewayUrl?.startsWith('http://localhost')) {
    return {
      provider: 'kubo',
      gatewayUrl,
    }
  }

  // Production/staging — use pinata provider with fallbacks
  return {
    provider: 'pinata',
    pinataGateway: gatewayUrl?.replace(/^https?:\/\//, '') ?? 'ipfs.io',
  }
}
