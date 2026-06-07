import type { EventMetadata, IpfsConfig } from '@ticketpulse/ipfs'

import type { EventPhase } from '../types/phase'
import type { RichEvent, SubgraphEvent } from '../types/rich'

/**
 * Shared "Rich Event" builder — the heart of the Shared Service Pattern.
 *
 * The same function runs in two places:
 *
 *   1. React Server Components & Next.js Edge routes (server side):
 *      called directly, no HTTP hop. Apollo result + IPFS fetch are
 *      stitched into `RichEvent[]` for the page.
 *
 *   2. Client side `/api/events?cursor=…` (load more): the route handler
 *      reuses this exact function so list rows look identical whether
 *      they came from the initial render or a follow-up request.
 *
 * Knowing the function is shared lets us cache aggressively (Next.js
 * `revalidate`) without worrying about result-shape drift.
 *
 * IPFS calls are batched with `Promise.allSettled` so a single broken
 * gateway does NOT take the whole list down — the affected events fall
 * back to `metadata: null` and the UI displays a graceful skeleton.
 */
export interface BuildRichEventOptions {
  ipfsConfig: IpfsConfig
  /** Function used to fetch metadata from IPFS. Injected so tests can mock it. */
  fetchMetadata: (cid: string, config: IpfsConfig) => Promise<EventMetadata>
  /** Function that turns a raw CID into a public HTTP gateway URL. */
  cidToUrl: (cid: string, config: IpfsConfig) => string
  /** Allows callers to freeze `now` for deterministic tests. */
  nowSeconds?: number
}

export function computeEventPhase(
  event: Pick<SubgraphEvent, 'startTime' | 'endTime'>,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): EventPhase {
  const start = Number(event.startTime)
  const end = Number(event.endTime)
  if (nowSeconds < start) return 'sale'
  if (nowSeconds < end) return 'active'
  return 'completed'
}

/** Build a single rich event — primarily a helper for detail pages. */
export async function buildRichEvent(
  event: SubgraphEvent,
  options: BuildRichEventOptions,
): Promise<RichEvent> {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)
  const phase = computeEventPhase(event, now)

  let metadata: EventMetadata | null = null
  if (event.ipfsMetadataCid) {
    try {
      metadata = await options.fetchMetadata(event.ipfsMetadataCid, options.ipfsConfig)
    } catch {
      metadata = null
    }
  }

  const coverImageUrl = event.ipfsCoverImageCid
    ? options.cidToUrl(event.ipfsCoverImageCid, options.ipfsConfig)
    : null

  const remainingSupply = event.maxSupply - event.totalMinted
  const soldProgress =
    event.maxSupply === 0
      ? 0
      : Math.round((event.totalMinted / event.maxSupply) * 1000) / 10

  return {
    ...event,
    metadata,
    coverImageUrl,
    phase,
    remainingSupply,
    soldProgress,
    secondaryMarkupApplied: event.markupPercentage > 0,
  }
}

/**
 * Bulk version used by list pages (RSC + `/api/events`).
 *
 * Performance notes:
 *   • IPFS fetches are parallelised with `Promise.allSettled` (N events
 *     ⇒ ≤ N concurrent gateway requests; the IPFS gateway is the
 *     bottleneck, not us).
 *   • If a metadata fetch fails the event still appears, just without
 *     description/location (UX requirement F-23 fallback image).
 */
export async function buildRichEvents(
  events: readonly SubgraphEvent[],
  options: BuildRichEventOptions,
): Promise<RichEvent[]> {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)

  const metadataResults = await Promise.allSettled(
    events.map((e) =>
      e.ipfsMetadataCid
        ? options.fetchMetadata(e.ipfsMetadataCid, options.ipfsConfig)
        : Promise.resolve<EventMetadata | null>(null),
    ),
  )

  return events.map((event, idx) => {
    const result = metadataResults[idx]
    const metadata =
      result && result.status === 'fulfilled' ? (result.value as EventMetadata | null) : null

    const coverImageUrl = event.ipfsCoverImageCid
      ? options.cidToUrl(event.ipfsCoverImageCid, options.ipfsConfig)
      : null

    const remainingSupply = event.maxSupply - event.totalMinted
    const soldProgress =
      event.maxSupply === 0
        ? 0
        : Math.round((event.totalMinted / event.maxSupply) * 1000) / 10

    return {
      ...event,
      metadata,
      coverImageUrl,
      phase: computeEventPhase(event, now),
      remainingSupply,
      soldProgress,
      secondaryMarkupApplied: event.markupPercentage > 0,
    }
  })
}
