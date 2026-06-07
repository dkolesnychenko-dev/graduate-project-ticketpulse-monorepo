'use client'

import { gql, useQuery } from '@apollo/client'
import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useTranslations } from 'next-intl'
import type { Address } from 'viem'

import { cidToGatewayUrl } from '@ticketpulse/ipfs'
import { computeEventPhase } from '@ticketpulse/sdk/services'
import { loadIdentityArtifacts } from '@ticketpulse/sdk/identity'

import { TicketCard, type TicketCardData } from '@/widgets/ticket-detail'
import {
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui'
import { ConnectFlow } from '@/features/wallet-connect'
import { getClientIpfsConfig } from '@/shared/lib/ipfs/client'

interface RawTicket {
  id: string
  tokenId: number
  isOnSale: boolean
  mintPrice: string
  lastResalePrice: string | null
  mintedAt: string
  event: {
    id: string
    title: string | null
    ticketType: string | null
    ticketSymbol: string | null
    ipfsCoverImageCid: string | null
    startTime: string
    endTime: string
  }
}

interface MyBalance {
  id: string
  sellerBalance: string
  event: { id: string }
}

const MY_TICKETS_QUERY = gql`
  query MyTicketsPage($owner: String!) {
    tickets(where: { currentOwner: $owner }, orderBy: mintedAt, orderDirection: desc, first: 200) {
      id
      tokenId
      isOnSale
      mintPrice
      lastResalePrice
      mintedAt
      event {
        id
        title
        ticketType
        ticketSymbol
        ipfsCoverImageCid
        startTime
        endTime
      }
    }
    balances(where: { user: $owner }) {
      id
      sellerBalance
      event {
        id
      }
    }
  }
`

/**
 * F-7 — My tickets, all five sections.
 *
 * The Subgraph returns a flat list; we bucket client-side using
 * `isOnSale`, the event's `phase`, and (for sold-pending vs
 * sold-withdrawn) the user's `sellerBalance` for that event.
 *
 * Local identity artifacts are joined in here so the QR generator
 * dialog has the holder's name ready without re-prompting them.
 */
export default function MyTicketsPage() {
  const { address, isConnected } = useAccount()
  const t = useTranslations('tickets')
  const ipfsConfig = useMemo(() => getClientIpfsConfig(), [])

  const { data, loading } = useQuery<{
    tickets: RawTicket[]
    balances: MyBalance[]
  }>(MY_TICKETS_QUERY, {
    variables: { owner: address?.toLowerCase() ?? '' },
    skip: !address,
    pollInterval: 30_000,
  })

  // Pull identity artifacts once per render.
  const artifactsByKey = useMemo(() => {
    if (!address) return new Map<string, string>()
    const list = loadIdentityArtifacts(address)
    const map = new Map<string, string>()
    for (const a of list) {
      map.set(`${a.eventContract.toLowerCase()}:${a.tokenId}`, `${a.ownerFirstName} ${a.ownerLastName}`)
    }
    return map
  }, [address])

  const buckets = useMemo(() => {
    const tickets = data?.tickets ?? []
    const balances = new Map(data?.balances.map((b) => [b.event.id.toLowerCase(), BigInt(b.sellerBalance)]) ?? [])

    const ready: TicketCardData[] = []
    const onSale: TicketCardData[] = []
    const collectible: TicketCardData[] = []

    for (const raw of tickets) {
      const enriched: TicketCardData = {
        id: raw.id,
        tokenId: raw.tokenId,
        isOnSale: raw.isOnSale,
        mintPrice: raw.mintPrice,
        lastResalePrice: raw.lastResalePrice,
        mintedAt: raw.mintedAt,
        ownerFullName: artifactsByKey.get(`${raw.event.id.toLowerCase()}:${raw.tokenId}`),
        event: {
          id: raw.event.id as Address,
          title: raw.event.title,
          ticketType: raw.event.ticketType,
          ticketSymbol: raw.event.ticketSymbol,
          coverImageUrl: raw.event.ipfsCoverImageCid
            ? cidToGatewayUrl(raw.event.ipfsCoverImageCid, ipfsConfig)
            : null,
          startTime: raw.event.startTime,
          endTime: raw.event.endTime,
        },
      }
      const phase = computeEventPhase({
        startTime: raw.event.startTime,
        endTime: raw.event.endTime,
      })
      if (phase === 'completed') {
        collectible.push(enriched)
      } else if (raw.isOnSale) {
        onSale.push(enriched)
      } else {
        ready.push(enriched)
      }
    }

    // Sold-pending / sold-withdrawn — we infer these from non-zero
    // `sellerBalance` per event. Showing a placeholder card per event
    // would require an extra query for the original ticket details; for
    // MVP we simply surface a banner row when balance > 0.
    const soldPending = Array.from(balances.entries())
      .filter(([, bal]) => bal > 0n)
      .map(([eventId]) => eventId)

    return { ready, onSale, soldPending, collectible }
  }, [data, artifactsByKey, ipfsConfig])

  if (!isConnected) return <ConnectFlow />

  return (
    <div className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">{t('page.title')}</h1>
        <p className="text-muted-foreground">{t('page.subtitle')}</p>
      </header>

      <Tabs defaultValue="ready">
        <TabsList>
          <TabsTrigger value="ready">
            {t('tabs.ready', { count: buckets.ready.length })}
          </TabsTrigger>
          <TabsTrigger value="on-sale">
            {t('tabs.onSale', { count: buckets.onSale.length })}
          </TabsTrigger>
          <TabsTrigger value="sold-pending">
            {t('tabs.soldPending', { count: buckets.soldPending.length })}
          </TabsTrigger>
          <TabsTrigger value="collectible">
            {t('tabs.collectible', { count: buckets.collectible.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready">
          {loading ? (
            <Skeletons />
          ) : (
            <Grid
              tickets={buckets.ready}
              section="ready"
              emptyHint={t('empty.ready')}
            />
          )}
        </TabsContent>
        <TabsContent value="on-sale">
          {loading ? (
            <Skeletons />
          ) : (
            <Grid
              tickets={buckets.onSale}
              section="on-sale"
              emptyHint={t('empty.onSale')}
            />
          )}
        </TabsContent>
        <TabsContent value="sold-pending">
          {buckets.soldPending.length === 0 ? (
            <Empty>{t('empty.soldPending')}</Empty>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {buckets.soldPending.map((eventId) => (
                <li
                  key={eventId}
                  className="rounded-md border bg-card p-4 font-tabular text-sm"
                  data-numeric
                >
                  {t('soldPendingHint', { eventId })}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="collectible">
          {loading ? (
            <Skeletons />
          ) : (
            <Grid
              tickets={buckets.collectible}
              section="collectible"
              emptyHint={t('empty.collectible')}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Grid({
  tickets,
  section,
  emptyHint,
}: {
  tickets: TicketCardData[]
  section: 'ready' | 'on-sale' | 'collectible'
  emptyHint: string
}) {
  if (tickets.length === 0) return <Empty>{emptyHint}</Empty>
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} section={section} />
      ))}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function Skeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-72 w-full rounded-xl" />
      ))}
    </div>
  )
}
