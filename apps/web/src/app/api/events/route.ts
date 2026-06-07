import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import { cidToGatewayUrl, fetchEventMetadata } from '@ticketpulse/ipfs'
import { buildRichEvents } from '@ticketpulse/sdk/services'
import type { SubgraphEvent } from '@ticketpulse/sdk/types'

import { publicEnv } from '@/shared/env/public'
import { serverEnv } from '@/shared/env/server'
import { getServerIpfsConfig } from '@/shared/lib/ipfs/config'

/**
 * Aggregated `RichEvent[]` endpoint used by the "Load more" infinite
 * scroll on the marketplace (F-5) — the Shared Service Pattern in
 * action. Both this route and the RSC list page call
 * `buildRichEvents()`, so row shape never drifts.
 *
 *   GET /api/events?first=20&createdAt_lt=1716998400
 *
 * Returns: `{ events: RichEvent[], ethEurRate: number | null }`
 * The rate is bundled so the client can keep the dual-price display
 * consistent across "first 20" + "next 20" batches even if the
 * Chainlink update fell between the two calls.
 */
export const runtime = 'edge'

const EVENTS_QUERY = /* GraphQL */ `
  query EventsList(
    $first: Int!
    $where: Event_filter
    $orderBy: Event_orderBy = startTime
  ) {
    events(
      first: $first
      where: $where
      orderBy: $orderBy
      orderDirection: asc
    ) {
      id
      organizer {
        id
      }
      createdAt
      startTime
      endTime
      nominalPrice
      secondaryMarketPrice
      maxSupply
      maxTicketsPerWallet
      totalMinted
      royaltyPercentage
      markupPercentage
      title
      ticketType
      ticketSymbol
      ipfsCoverImageCid
      ipfsMetadataCid
      totalPrimaryVolume
      totalSecondaryVolume
      totalRoyaltiesCollected
      totalResales
      activeSellOrdersCount
      activeBuyOrdersCount
    }
  }
`

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const first = Math.min(Number(url.searchParams.get('first') ?? '20'), 100)
  const startTime_gte = url.searchParams.get('startTime_gte') ?? undefined

  const variables: Record<string, unknown> = {
    first,
    where: startTime_gte ? { startTime_gte } : undefined,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (serverEnv.GRAPH_API_KEY) {
    headers['Authorization'] = `Bearer ${serverEnv.GRAPH_API_KEY}`
  }

  const res = await fetch(publicEnv.NEXT_PUBLIC_SUBGRAPH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: EVENTS_QUERY, variables }),
    cache: 'no-store',
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: `Subgraph returned HTTP ${res.status}` },
      { status: 502 },
    )
  }

  const json = (await res.json()) as {
    data?: { events: SubgraphEvent[] }
    errors?: unknown[]
  }
  if (json.errors || !json.data) {
    return NextResponse.json(
      { error: 'Subgraph returned errors', detail: json.errors },
      { status: 502 },
    )
  }

  const ipfsConfig = getServerIpfsConfig()
  const richEvents = await buildRichEvents(json.data.events, {
    ipfsConfig,
    fetchMetadata: fetchEventMetadata,
    cidToUrl: cidToGatewayUrl,
  })

  return NextResponse.json(
    { events: richEvents },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    },
  )
}
