import { z } from 'zod'

import { MAX_BATCH_SIZE } from '@ticketpulse/sdk/constants'

/**
 * Per-ticket personalisation row.
 *
 * The "Latin alphabet only" rule comes straight from F-6 — venue staff
 * type these into their terminal, and Cyrillic/Latin layout drift on
 * Ukrainian keyboards is a known source of false rejections at the door.
 */
const LATIN_NAME = /^[A-Za-z][A-Za-z\-' ]*$/u

export const ticketPersonalizationSchema = z.object({
  ownerFirstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50)
    .regex(LATIN_NAME, 'Latin alphabet only — match the spelling on your ID'),
  ownerLastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(50)
    .regex(LATIN_NAME, 'Latin alphabet only — match the spelling on your ID'),
})

export const mintTicketsSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(MAX_BATCH_SIZE),
  acknowledgeImmutable: z.literal<boolean>(true).refine((v) => v, {
    message: 'You must acknowledge that personalisation is immutable.',
  }),
  tickets: z.array(ticketPersonalizationSchema).min(1).max(MAX_BATCH_SIZE),
})

export type MintTicketsForm = z.infer<typeof mintTicketsSchema>
export type TicketPersonalization = z.infer<typeof ticketPersonalizationSchema>
