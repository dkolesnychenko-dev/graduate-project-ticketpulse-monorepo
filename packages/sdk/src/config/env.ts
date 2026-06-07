import { z } from 'zod'

import { supportedChains } from './chains'

/**
 * Public (NEXT_PUBLIC_*) env — bundled into the client, MUST NOT contain secrets.
 *
 * Validated once at module load on both server and client so that a missing
 * variable fails fast with a readable error instead of crashing deep inside
 * Wagmi / Apollo.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.coerce
    .number()
    .refine(
      (id) => supportedChains.some((c) => c.id === id),
      `NEXT_PUBLIC_CHAIN_ID must be one of: ${supportedChains.map((c) => c.id).join(', ')}`,
    ),
  /** TicketPulseFactory clone address on the active chain. */
  NEXT_PUBLIC_FACTORY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a 0x-prefixed 20-byte hex address'),
  /** WalletConnect Cloud project id (RainbowKit requirement). */
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1),
  /** Public Subgraph endpoint — used by RSC where revealing it is safe. */
  NEXT_PUBLIC_SUBGRAPH_URL: z.string().url(),
  /**
   * Public IPFS gateway URL used by the client (`<Image src>`,
   * `cidToGatewayUrl`). Defaults to `https://ipfs.io` when omitted.
   * The server-side view-aggregator combines this with `PINATA_GATEWAY`
   * and an optional `INFURA_GATEWAY_URL` for fallback reads.
   */
  NEXT_PUBLIC_IPFS_GATEWAY_URL: z.string().min(1).optional(),
  /** Optional ETH/EUR Chainlink aggregator address — overrides the built-in default. */
  NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  /** Public-facing base URL used to build ticket external_url metadata links. */
  NEXT_PUBLIC_BASE_EXTERNAL_URL: z.string().url().optional(),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

/**
 * Server-only env — never exposed to the browser. Read inside Edge / API routes.
 */
export const serverEnvSchema = z.object({
  /** Pinata JWT used by the IPFS upload proxy. Required for production uploads. */
  PINATA_JWT: z.string().min(1).optional(),
  /** Pinata dedicated gateway domain (e.g. "your-id.mypinata.cloud"). */
  PINATA_GATEWAY: z.string().min(1).optional(),
  /**
   * Optional Infura dedicated IPFS gateway URL. Appended after Pinata + ipfs.io
   * in the view-aggregator fallback chain — useful when Pinata is rate-limited.
   * Recognised by `@ticketpulse/ipfs` via `IpfsConfig.infuraGatewayUrl`.
   */
  INFURA_GATEWAY_URL: z.string().url().optional(),
  /**
   * Authenticated RPC URL used for server-side Chainlink reads.
   * In local development this can be left empty — the Chainlink route
   * falls back to `MOCK_CHAINLINK_EUR_RATE`.
   */
  SERVER_RPC_URL: z.string().url().optional(),
  /** Optional authenticated Subgraph URL when running through The Graph Network. */
  GRAPH_API_KEY: z.string().min(1).optional(),
  /**
   * Bypass Chainlink for local development.
   *
   * When set (e.g. `MOCK_CHAINLINK_EUR_RATE=2800`) the `/api/chainlink`
   * route returns this rate directly without making an RPC call. Useful
   * when developing against an Anvil node that has no Chainlink feeds.
   */
  MOCK_CHAINLINK_EUR_RATE: z.coerce.number().positive().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Parse and validate a record of env values. Throws a single aggregated error
 * listing every problem so the developer doesn't have to fix → re-run → fix
 * one issue at a time.
 */
export function parsePublicEnv(source: Record<string, unknown>): PublicEnv {
  const result = publicEnvSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `[@ticketpulse/sdk] Invalid public env:\n${issues}\n\n` +
        `Hint: copy apps/web/.env.example to apps/web/.env.local and fill in the values.`,
    )
  }
  return result.data
}

export function parseServerEnv(source: Record<string, unknown>): ServerEnv {
  const result = serverEnvSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`[@ticketpulse/sdk] Invalid server env:\n${issues}`)
  }
  return result.data
}
