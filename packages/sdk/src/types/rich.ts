import type { EventMetadata } from '@ticketpulse/ipfs'

import type { EventPhase } from './phase'

/**
 * Subgraph projection — kept here as a hand-written contract so that consumers
 * that don't run GraphQL codegen still have a working type. Generated code
 * extends this in `src/graphql/__generated__`.
 *
 * Wei values are kept as `string` because they round-trip through GraphQL as
 * `BigInt` scalars (serialised to JSON as decimal strings).
 */
export interface SubgraphEvent {
  id: string
  organizer: { id: string }
  createdAt: string
  startTime: string
  endTime: string

  nominalPrice: string
  maxSupply: number
  maxTicketsPerWallet: number
  totalMinted: number

  royaltyPercentage: number
  markupPercentage: number
  secondaryMarketPrice: string

  title: string | null
  ticketType: string | null
  ticketSymbol: string | null
  ipfsCoverImageCid: string | null
  ipfsMetadataCid: string | null

  totalPrimaryVolume: string
  totalSecondaryVolume: string
  totalRoyaltiesCollected: string
  totalResales: number

  activeSellOrdersCount: number
  activeBuyOrdersCount: number
}

/**
 * Event enriched with IPFS metadata + derived display fields.
 *
 * Assembled by `services/rich-event.ts` (shared between RSC and Edge routes):
 *
 *   ┌──────────────┐    ┌────────────────────┐
 *   │   Subgraph   │ +  │ IPFS (description, │ = RichEvent
 *   │ (on-chain    │    │   location)        │
 *   │  + counters) │    └────────────────────┘
 *   └──────────────┘
 *
 * `metadata` is `null` if the IPFS gateway is unreachable — UI must degrade
 * gracefully (show on-chain title + a "Description unavailable" fallback).
 */
export interface RichEvent extends SubgraphEvent {
  metadata: EventMetadata | null
  /** Public HTTP URL of the cover image, resolved through the view-aggregator gateway list. */
  coverImageUrl: string | null
  /** Current lifecycle phase, computed against the current timestamp. */
  phase: EventPhase
  /** Number of tickets still available on the primary market. */
  remainingSupply: number
  /** Progress of primary sale as a percentage in [0, 100], rounded to one decimal. */
  soldProgress: number
  /** Convenience: secondary price === nominalPrice when markup is 0. */
  secondaryMarkupApplied: boolean
}
