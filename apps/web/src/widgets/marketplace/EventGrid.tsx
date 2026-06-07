'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import type { RichEvent } from '@ticketpulse/sdk/types'

import { EventCard } from '@/entities/event'
import { Button, Skeleton } from '@/shared/ui'
import { useEthEurRate } from '@/shared/hooks/useEthEurRate'
import { useRichEventsInfinite } from '@/entities/event'
import { useUiStore } from '@/shared/stores'

interface EventGridProps {
  /** RSC-rendered initial page, hydrated into the React Query cache. */
  initialEvents: RichEvent[]
}

/**
 * The marketplace grid (F-5).
 *
 * Strategy:
 *   • RSC renders the first page so the user gets a fast LCP.
 *   • Client takes over with `useRichEventsInfinite` for "Load more".
 *   • The search term lives in the UI store (`useUiStore`) and is
 *     applied client-side because the Subgraph doesn't accept ILIKE
 *     filters — the SDK fetches a wide page and we filter in JS.
 *
 * `useEthEurRate` is read once at the grid level so every card shares
 * the same EUR price, avoiding row-by-row visual drift (NFR-UI stability).
 */
export function EventGrid({ initialEvents }: EventGridProps) {
  const tList = useTranslations('events.list')
  const tCommon = useTranslations('common')
  const { data: rateData } = useEthEurRate()
  const search = useUiStore((s) => s.globalSearch).trim().toLowerCase()

  const query = useRichEventsInfinite({
    enabled: initialEvents.length > 0,
  })

  // Flatten paged data; fall back to the initial RSC payload while
  // the client query bootstraps.
  const allEvents = useMemo(() => {
    if (!query.data) return initialEvents
    const flat = query.data.pages.flat()
    const seen = new Set<string>()
    return [...initialEvents, ...flat].filter((e) =>
      seen.has(e.id) ? false : (seen.add(e.id), true),
    )
  }, [initialEvents, query.data])

  const filtered = useMemo(() => {
    if (!search) return allEvents
    return allEvents.filter((e) => (e.title ?? '').toLowerCase().includes(search))
  }, [allEvents, search])

  if (filtered.length === 0 && !query.isPending) {
    return (
      <div className="rounded-xl border bg-muted/30 p-12 text-center text-muted-foreground">
        {tList('empty')}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} ethEurRate={rateData?.rate ?? null} />
        ))}
        {query.isFetching
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={`sk-${i}`} className="h-80 w-full rounded-xl" />
            ))
          : null}
      </div>

      {query.hasNextPage ? (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? tCommon('loading') : tCommon('loadMore')}
          </Button>
        </div>
      ) : null}
    </>
  )
}
