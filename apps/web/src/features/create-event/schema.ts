import { z } from 'zod'

import {
  COVER_IMAGE,
  EVENT_FORM_LIMITS,
  MAX_BATCH_SIZE,
  MAX_MARKUP_PCT,
  MAX_ROYALTY_PCT,
  MAX_SUPPLY_CAP,
  MAX_WALLET_CAP,
} from '@ticketpulse/sdk/constants'

/**
 * Form schema for `Create Event`.
 *
 * Notes on the type design:
 *   • Dates are stored as ISO strings (input-friendly), converted to
 *     bigint Unix-seconds at submit time.
 *   • Prices are stored as decimal strings to preserve user input
 *     exactly — `parseEthToWei` runs only on the way out.
 *   • Cover image is a transient `File` (not in zod's runtime), so we
 *     extend the resolved type below.
 */
const NOW_PLUS_15_MIN = () =>
  new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16)

export const createEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Required')
      .max(EVENT_FORM_LIMITS.titleMaxChars, `Max ${EVENT_FORM_LIMITS.titleMaxChars} chars`),
    description: z
      .string()
      .trim()
      .min(1, 'Required')
      .max(EVENT_FORM_LIMITS.descriptionMaxChars),
    location: z.string().trim().min(1, 'Required').max(EVENT_FORM_LIMITS.locationMaxChars),

    /** `datetime-local` value — converted to bigint Unix at submit. */
    startTime: z
      .string()
      .min(1, 'Required')
      .refine((v) => {
        const t = Date.parse(v)
        return Number.isFinite(t) && t > Date.now()
      }, 'Start must be in the future'),
    endTime: z.string().min(1, 'Required'),

    ticketType: z
      .string()
      .trim()
      .min(1, 'Required')
      .max(EVENT_FORM_LIMITS.ticketTypeMaxChars),
    ticketSymbol: z
      .string()
      .trim()
      .min(EVENT_FORM_LIMITS.ticketSymbolMinChars)
      .max(EVENT_FORM_LIMITS.ticketSymbolMaxChars)
      .regex(/^[A-Z0-9]+$/, 'Uppercase letters and digits only'),

    maxSupply: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_SUPPLY_CAP),
    maxTicketsPerWallet: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_WALLET_CAP),
    nominalPriceEth: z
      .string()
      .trim()
      .regex(/^\d+(\.\d+)?$/u, 'Use a positive decimal like 0.05'),
    royaltyPct: z.coerce.number().int().min(0).max(MAX_ROYALTY_PCT),
    markupPct: z.coerce.number().int().min(0).max(MAX_MARKUP_PCT),
  })
  .superRefine((data, ctx) => {
    if (Date.parse(data.endTime) <= Date.parse(data.startTime)) {
      ctx.addIssue({
        path: ['endTime'],
        code: 'custom',
        message: 'End must be after start',
      })
    }
    if (data.maxTicketsPerWallet > MAX_BATCH_SIZE) {
      ctx.addIssue({
        path: ['maxTicketsPerWallet'],
        code: 'custom',
        message: `Max ${MAX_BATCH_SIZE} per wallet`,
      })
    }
    if (data.maxTicketsPerWallet > data.maxSupply) {
      ctx.addIssue({
        path: ['maxTicketsPerWallet'],
        code: 'custom',
        message: 'Cannot exceed total supply',
      })
    }
  })

export type CreateEventForm = z.infer<typeof createEventSchema>

export const createEventDefaults: CreateEventForm = {
  title: '',
  description: '',
  location: '',
  startTime: NOW_PLUS_15_MIN(),
  endTime: '',
  ticketType: 'General Admission',
  ticketSymbol: 'EVENT',
  maxSupply: 100,
  maxTicketsPerWallet: 4,
  nominalPriceEth: '0.05',
  royaltyPct: 10,
  markupPct: 20,
}

export const coverImageRules = {
  maxBytes: COVER_IMAGE.maxSizeBytes,
  minWidth: COVER_IMAGE.minWidthPx,
  minHeight: COVER_IMAGE.minHeightPx,
  acceptedMimeTypes: COVER_IMAGE.acceptedMimeTypes,
} as const
