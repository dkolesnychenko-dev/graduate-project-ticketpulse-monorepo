import { useTranslations } from 'next-intl'

import type { EventPhase } from '@ticketpulse/sdk/types'

import { Badge, type BadgeProps } from '@/shared/ui'

interface EventStatusBadgeProps {
  phase: EventPhase
  /** Override visual variant when the surrounding card colour demands it. */
  className?: string
}

/**
 * Single source of truth for the "where is this event in its lifecycle"
 * badge. Reused on cards, on detail headers, and inside organiser tables.
 */
export function EventStatusBadge({ phase, className }: EventStatusBadgeProps) {
  const t = useTranslations('events.statuses')

  const variant: BadgeProps['variant'] =
    phase === 'sale' ? 'success' : phase === 'active' ? 'live' : 'muted'

  const label =
    phase === 'sale'
      ? t('available')
      : phase === 'active'
        ? t('happeningNow')
        : t('completed')
  // Note: SDK enum is `sale` / `active` / `completed`. We map directly to
  // translation keys — adding "Sold out" would require an upstream signal
  // (remainingSupply), which lives on the parent component.

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
