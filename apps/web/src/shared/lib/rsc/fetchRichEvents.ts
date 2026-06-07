import 'server-only'

import { cidToGatewayUrl, fetchEventMetadata } from '@ticketpulse/ipfs'
import { buildRichEvents } from '@ticketpulse/sdk/services'
import type { SubgraphEvent, RichEvent } from '@ticketpulse/sdk/types'

import { publicEnv } from '@/shared/env/public'
import { serverEnv } from '@/shared/env/server'
import { getServerIpfsConfig } from '@/shared/lib/ipfs/config'

/**
 * Shared "fetch + enrich" entry-point for Server Components.
 *
 * Mirrors the logic in `/api/events`, but called *directly* from RSCs —
 * no internal HTTP round-trip ("Shared Service" pattern from F-Notes).
 *
 * Results are cached at the Next.js Data Cache layer via `revalidate`.
 */
export async function fetchRichEventsForRSC(args: {
  first?: number
  startTimeGte?: string
  signal?: AbortSignal
}): Promise<RichEvent[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (serverEnv.GRAPH_API_KEY) {
    headers['Authorization'] = `Bearer ${serverEnv.GRAPH_API_KEY}`
  }

  const variables: Record<string, unknown> = {
    first: args.first ?? 20,
    where: args.startTimeGte ? { startTime_gte: args.startTimeGte } : undefined,
  }

  try {
    const res = await fetch(publicEnv.NEXT_PUBLIC_SUBGRAPH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: /* GraphQL */ `
          query EventsListRSC($first: Int!, $where: Event_filter) {
            events(first: $first, where: $where, orderBy: startTime, orderDirection: asc) {
              id
              organizer { id }
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
        `,
        variables,
      }),
      next: { revalidate: 60, tags: ['events:list'] },
      signal: args.signal,
    })

    if (!res.ok) {
      console.error(`[RSC] subgraph returned HTTP ${res.status}`)
      return []
    }
    const json = (await res.json()) as { data?: { events: SubgraphEvent[] }; errors?: unknown[] }
    if (json.errors || !json.data) {
      console.error(`[RSC] subgraph errors: ${JSON.stringify(json.errors ?? [])}`)
      return []
    }

    return buildRichEvents(json.data.events, {
      ipfsConfig: getServerIpfsConfig(),
      fetchMetadata: fetchEventMetadata,
      cidToUrl: cidToGatewayUrl,
    })
  } catch (err) {
    console.error(`[RSC] fetchRichEventsForRSC failed:`, err)
    return []
  }
}
