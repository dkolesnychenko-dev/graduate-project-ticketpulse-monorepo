import { parsePublicEnv, type PublicEnv } from '@ticketpulse/sdk/config'

/**
 * Strictly-typed public env, validated once at module load.
 *
 * Why we wrap the SDK's `parsePublicEnv`: Next.js requires that every
 * `NEXT_PUBLIC_*` variable be referenced *literally* in client-bundled
 * code to be inlined at build time. The destructuring below makes the
 * static analyser happy.
 */
const source = {
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_SUBGRAPH_URL: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
  NEXT_PUBLIC_IPFS_GATEWAY_URL: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL,
  NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED: process.env.NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED,
  NEXT_PUBLIC_BASE_EXTERNAL_URL: process.env.NEXT_PUBLIC_BASE_EXTERNAL_URL,
}

export const publicEnv: PublicEnv = parsePublicEnv(source)

/**
 * Helper: parse the comma-separated `NEXT_PUBLIC_IPFS_GATEWAY_URL` into
 * a list of clean gateway origins. Returns `undefined` when the variable
 * is empty — the SDK then falls back to its built-in public list.
 */
export function getIpfsGatewayList(): string[] | undefined {
  const raw = publicEnv.NEXT_PUBLIC_IPFS_GATEWAY_URL
  if (!raw) return undefined
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return list.length > 0 ? list : undefined
}
