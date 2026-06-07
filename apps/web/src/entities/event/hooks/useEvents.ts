'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import type { RichEvent } from '@ticketpulse/sdk/types'

import { BUYER_PAGE_SIZE } from '@ticketpulse/sdk/constants'

interface UseRichEventsArgs {
  /** Comma-separated cursor params understood by /api/events. */
  searchParams?: Record<string, string | undefined>
  /** Disable the query entirely (e.g. while the user types into the search box). */
  enabled?: boolean
}

/**
 * Buyer-facing infinite list (F-5).
 *
 *   • Talks to `/api/events`, our aggregated `RichEvent[]` Edge endpoint.
 *   • Uses the same SDK type as the RSC version, so cards never need to
 *     branch between "first 20" (from the server) and "next 20" (from
 *     the client).
 */
export function useRichEventsInfinite({ searchParams, enabled = true }: UseRichEventsArgs) {
  return useInfiniteQuery({
    queryKey: ['events', 'list', searchParams],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ first: String(BUYER_PAGE_SIZE) })
      if (pageParam) params.set('createdAt_lt', pageParam)
      for (const [k, v] of Object.entries(searchParams ?? {})) {
        if (v) params.set(k, v)
      }
      const res = await fetch(`/api/events?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { events: RichEvent[] }
      return json.events
    },
    getNextPageParam: (last) => {
      // Subgraph rows come back ordered by startTime asc — cursor is
      // the smallest `createdAt` in the page (i.e. last item).
      if (!last.length || last.length < BUYER_PAGE_SIZE) return undefined
      const cursorEvent = last[last.length - 1]
      return cursorEvent?.createdAt
    },
    enabled,
    staleTime: 60_000,
  })
}

/**
 * One-shot fetcher used by the event-detail page when the RSC payload
 * was rendered with stale Chainlink data and the user just toggled into
 * a section that needs the current rate.
 */
export function useRichEvent(id: string | undefined) {
  return useQuery<RichEvent | null>({
    queryKey: ['event', id],
    enabled: Boolean(id),
    queryFn: async () => {
      // Re-uses the same Edge endpoint with `first: 1, where: { id }`.
      // We could add a dedicated `/api/events/[id]` route later if this
      // shape proves limiting.
      const params = new URLSearchParams({ first: '1' })
      params.set('where[id]', id!)
      const res = await fetch(`/api/events?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { events: RichEvent[] }
      return json.events[0] ?? null
    },
  })
}
