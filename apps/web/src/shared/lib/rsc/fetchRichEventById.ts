import 'server-only'

import { cidToGatewayUrl, fetchEventMetadata } from '@ticketpulse/ipfs'
import { buildRichEvent } from '@ticketpulse/sdk/services'
import type { RichEvent, SubgraphEvent } from '@ticketpulse/sdk/types'

import { publicEnv } from '@/shared/env/public'
import { serverEnv } from '@/shared/env/server'
import { getServerIpfsConfig } from '@/shared/lib/ipfs/config'

/**
 * Fetch + enrich one event for the RSC detail page. Lower revalidate
 * window (15 s) so price + queue counters look fresh while still
 * benefiting from the Edge cache on hot events.
 */
export async function fetchRichEventByIdForRSC(id: string): Promise<RichEvent | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (serverEnv.GRAPH_API_KEY) {
    headers['Authorization'] = `Bearer ${serverEnv.GRAPH_API_KEY}`
  }
  const res = await fetch(publicEnv.NEXT_PUBLIC_SUBGRAPH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: /* GraphQL */ `
        query EventByIdRSC($id: ID!) {
          event(id: $id) {
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
      variables: { id: id.toLowerCase() },
    }),
    next: { revalidate: 15, tags: [`event:${id.toLowerCase()}`] },
  })
  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status}`)
  const json = (await res.json()) as {
    data?: { event: SubgraphEvent | null }
    errors?: unknown[]
  }
  if (json.errors || !json.data?.event) return null

  return buildRichEvent(json.data.event, {
    ipfsConfig: getServerIpfsConfig(),
    fetchMetadata: fetchEventMetadata,
    cidToUrl: cidToGatewayUrl,
  })
}
