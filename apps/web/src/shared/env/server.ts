import 'server-only'

import { parseServerEnv, type ServerEnv } from '@ticketpulse/sdk/config'

/**
 * Server-only env (never bundled to the client thanks to `import 'server-only'`).
 *
 * Edge / API route handlers import this file directly. Pages can't —
 * which is exactly the boundary we want.
 */
export const serverEnv: ServerEnv = parseServerEnv({
  PINATA_JWT: process.env.PINATA_JWT,
  PINATA_GATEWAY: process.env.PINATA_GATEWAY,
  INFURA_GATEWAY_URL: process.env.INFURA_GATEWAY_URL,
  SERVER_RPC_URL: process.env.SERVER_RPC_URL,
  GRAPH_API_KEY: process.env.GRAPH_API_KEY,
  MOCK_CHAINLINK_EUR_RATE: process.env.MOCK_CHAINLINK_EUR_RATE,
})
