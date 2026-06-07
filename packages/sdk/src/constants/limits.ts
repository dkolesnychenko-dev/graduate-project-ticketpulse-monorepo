/**
 * Hard limits mirroring `TicketPulseEvent.sol`. Keep these in lockstep with
 * the contract constants — drift here causes UX rejections to surface as
 * confusing on-chain reverts.
 */

/** Maximum tickets minted per call to `mintTickets()`. */
export const MAX_BATCH_SIZE = 6

/** Maximum royalty percentage (organizer takes from every resale). */
export const MAX_ROYALTY_PCT = 20

/** Maximum markup percentage (resale price = nominal × (1 + markup/100)). */
export const MAX_MARKUP_PCT = 100

/** Maximum total ticket supply per event. */
export const MAX_SUPPLY_CAP = 10_000_000

/** Hard ceiling on the per-wallet cap an organizer can set. */
export const MAX_WALLET_CAP = 6

/** QR Sig_B (ownership-proof) validity window in seconds — see F-9 / F-25. */
export const OWNERSHIP_PROOF_TTL_SECONDS = 5 * 60

/** Page size for cursor-paginated buyer-facing lists (F-5, F-7, F-13). */
export const BUYER_PAGE_SIZE = 20

/** Page size for offset-paginated organizer-facing lists (F-2). */
export const ORGANIZER_PAGE_SIZE = 10

/** IPFS cover image upload constraints (F-1). */
export const COVER_IMAGE = {
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB
  minWidthPx: 1200,
  minHeightPx: 630,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const

/** Hard limits for the create-event form (mirror contract `InvalidParams`). */
export const EVENT_FORM_LIMITS = {
  titleMaxChars: 200,
  descriptionMaxChars: 2000,
  locationMaxChars: 300,
  ticketTypeMaxChars: 50,
  ticketSymbolMinChars: 2,
  ticketSymbolMaxChars: 10,
} as const
