import 'server-only'

import { NextResponse } from 'next/server'

import { isLocalChainId, type SupportedChainId } from '@ticketpulse/sdk/config'
import { readEthEurRate } from '@ticketpulse/sdk/services'

import { publicEnv } from '@/shared/env/public'
import { serverEnv } from '@/shared/env/server'

/**
 * Chainlink ETH/EUR proxy.
 *
 * Three resolution paths (first match wins):
 *
 *   1. **Mock**       — `MOCK_CHAINLINK_EUR_RATE` set ⇒ return it
 *                       verbatim. Required for local Anvil dev where
 *                       Chainlink contracts don't exist.
 *   2. **Local chain** without a mock ⇒ 503 with a helpful hint pointing
 *                       at the env var. Stops the UI from spamming the
 *                       endpoint with no chance of success.
 *   3. **Real RPC**    — `SERVER_RPC_URL` + a known Chainlink feed
 *                       address. Cached for 60 s at the Edge so each
 *                       chain only hits Chainlink once per minute.
 *
 * The Edge runtime gives us global low-latency caching at no extra cost.
 */
export const runtime = 'edge'
export const revalidate = 60

export async function GET() {
  // ── Path 1: explicit mock (local dev or controlled tests) ───────────
  if (serverEnv.MOCK_CHAINLINK_EUR_RATE != null) {
    return NextResponse.json(
      {
        rate: serverEnv.MOCK_CHAINLINK_EUR_RATE,
        updatedAt: Math.floor(Date.now() / 1000),
        decimals: 8,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  }

  // ── Path 2: local chain, no mock — explain how to fix ───────────────
  if (isLocalChainId(publicEnv.NEXT_PUBLIC_CHAIN_ID)) {
    return NextResponse.json(
      {
        error:
          'Local chain has no Chainlink feed. Set MOCK_CHAINLINK_EUR_RATE in .env.local (e.g. MOCK_CHAINLINK_EUR_RATE=2800) to enable EUR display in dev.',
      },
      { status: 503 },
    )
  }

  // ── Path 3: real RPC + Chainlink aggregator ─────────────────────────
  if (!serverEnv.SERVER_RPC_URL) {
    return NextResponse.json(
      {
        error:
          'Server-side RPC URL not configured. Set SERVER_RPC_URL (Alchemy / Infura / QuickNode) for production Chainlink reads.',
      },
      { status: 503 },
    )
  }

  try {
    const result = await readEthEurRate({
      chainId: publicEnv.NEXT_PUBLIC_CHAIN_ID as SupportedChainId,
      rpcUrl: serverEnv.SERVER_RPC_URL,
      feedAddress: publicEnv.NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED as
        | `0x${string}`
        | undefined,
    })
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chainlink read failed' },
      { status: 502 },
    )
  }
}
