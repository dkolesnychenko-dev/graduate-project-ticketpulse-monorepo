import 'server-only'

import type { IpfsConfig } from '@ticketpulse/ipfs'

import { serverEnv } from '@/shared/env/server'

/**
 * Build the IPFS configuration used by server-side code (Edge routes,
 * RSC). Always reads the Pinata credentials from `serverEnv` so they
 * cannot leak into the client bundle.
 *
 * Read gateway fallback chain — controlled by `@ticketpulse/ipfs`:
 *
 *   1. Pinata dedicated gateway (when `PINATA_GATEWAY` is set)
 *   2. `https://ipfs.io` (free public gateway, always present)
 *   3. Infura dedicated gateway (when `INFURA_GATEWAY_URL` is set)
 *
 * The view-aggregator `/api/ipfs/[cid]` iterates this list until one
 * gateway responds successfully — so a single throttled provider never
 * brings the marketplace down.
 */
export function getServerIpfsConfig(): IpfsConfig {
  if (serverEnv.PINATA_JWT && serverEnv.PINATA_GATEWAY) {
    return {
      provider: 'pinata',
      pinataJwt: serverEnv.PINATA_JWT,
      pinataGateway: serverEnv.PINATA_GATEWAY,
      infuraGatewayUrl: serverEnv.INFURA_GATEWAY_URL,
    }
  }
  // Default: local Kubo container — used during the Zero-to-Hero flow.
  return {
    provider: 'kubo',
    apiUrl: 'http://127.0.0.1:5001',
    gatewayUrl: 'http://127.0.0.1:8080',
  }
}
