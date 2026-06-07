// ═══════════════════════════════════════════════════════════════════════
// @ticketpulse/ipfs — Client Factory
// ═══════════════════════════════════════════════════════════════════════
//
// Creates and manages the connection to the IPFS node.
//
// Local development: uses `kubo-rpc-client` to talk to a local Kubo
// node running at http://127.0.0.1:5001 (typically via Docker).
//
// The graph-node also connects to this same IPFS node on port 5001,
// but for a DIFFERENT purpose: graph-node uses IPFS to store the
// compiled subgraph WASM + ABI + manifest during `graph deploy`.
// Our package uses the same node to store EVENT metadata and images.
// ═══════════════════════════════════════════════════════════════════════

import { create, type KuboRPCClient } from 'kubo-rpc-client'
import type { IpfsConfig } from './types'

/** Default configuration for local development with Docker Kubo */
export const LOCAL_IPFS_CONFIG: IpfsConfig = {
  apiUrl: 'http://127.0.0.1:5001',
  gatewayUrl: 'http://127.0.0.1:8080',
  provider: 'kubo',
}

/**
 * Singleton client instance.
 * We reuse a single connection to avoid opening multiple HTTP connections
 * to the same Kubo node.
 */
let _client: KuboRPCClient | null = null
let _currentConfig: IpfsConfig | null = null

/**
 * Get or create a Kubo RPC client.
 *
 * @param config - IPFS configuration. Defaults to local Docker Kubo.
 * @returns Configured KuboRPCClient instance
 *
 * @example
 * ```ts
 * import { getClient } from "@ticketpulse/ipfs";
 *
 * const client = getClient(); // uses local Kubo at 127.0.0.1:5001
 * const { cid } = await client.add("hello world");
 * ```
 */
export function getClient(
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): KuboRPCClient {
  // Return cached client if config hasn't changed
  if (_client && _currentConfig && _currentConfig.apiUrl === config.apiUrl) {
    return _client
  }

  if (config.provider === 'pinata') {
    throw new Error(
      '[IPFS] getClient() returns a KuboRPCClient which is not used for Pinata. ' +
        'Pinata uploads use direct REST API calls via fetch.',
    )
  }

  const apiUrl = config.apiUrl ?? LOCAL_IPFS_CONFIG.apiUrl!

  _client = create({ url: apiUrl })
  _currentConfig = config

  return _client
}

/**
 * Test connectivity to the IPFS node.
 * Useful during application startup to fail fast if Docker isn't running.
 *
 * @param config - IPFS configuration
 * @returns true if the node is reachable, false otherwise
 *
 * @example
 * ```ts
 * const ok = await isIpfsAvailable();
 * if (!ok) {
 *   console.error("Start IPFS: docker compose up ipfs");
 * }
 * ```
 */
export async function isIpfsAvailable(
  config: IpfsConfig = LOCAL_IPFS_CONFIG,
): Promise<boolean> {
  try {
    if (config.provider === 'pinata') {
      if (!config.pinataJwt || !config.pinataGateway) return false
      // Test Pinata authentication using the SDK
      const { PinataSDK } = await import('pinata')
      const pinata = new PinataSDK({
        pinataJwt: config.pinataJwt,
        pinataGateway: config.pinataGateway,
      })
      try {
        await pinata.testAuthentication()
        return true
      } catch {
        return false
      }
    }

    const client = getClient(config)
    // `id()` is the lightest RPC call — returns the node's peer ID
    await client.id()
    return true
  } catch {
    return false
  }
}

/**
 * Reset the cached client. Useful in tests.
 */
export function resetClient(): void {
  _client = null
  _currentConfig = null
}
