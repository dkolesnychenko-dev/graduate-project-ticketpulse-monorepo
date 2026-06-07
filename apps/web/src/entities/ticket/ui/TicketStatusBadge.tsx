'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  CheckCircle2,
  Clock4,
  Sparkles,
  TicketCheck,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge, type BadgeProps } from '@/shared/ui'

export type TicketSection =
  | 'ready' // F-7 §1
  | 'on-sale' // F-7 §2
  | 'sold-pending' // F-7 §3
  | 'sold-withdrawn' // F-7 §4
  | 'collectible' // F-7 §5

const VISUAL: Record<TicketSection, { variant: BadgeProps['variant']; icon: LucideIcon }> = {
  ready: { variant: 'success', icon: TicketCheck },
  'on-sale': { variant: 'warning', icon: Clock4 },
  'sold-pending': { variant: 'default', icon: Banknote },
  'sold-withdrawn': { variant: 'muted', icon: CheckCircle2 },
  collectible: { variant: 'secondary', icon: Sparkles },
}

const LABEL_KEY = {
  ready: 'ready',
  'on-sale': 'onSale',
  'sold-pending': 'soldPending',
  'sold-withdrawn': 'soldWithdrawn',
  collectible: 'collectible',
} as const satisfies Record<TicketSection, string>

export function TicketStatusBadge({ section }: { section: TicketSection }) {
  const t = useTranslations('tickets.statuses')
  const visual = VISUAL[section]
  const Icon = visual.icon
  return (
    <Badge variant={visual.variant} className="gap-1">
      <Icon className="size-3" />
      {t(LABEL_KEY[section])}
    </Badge>
  )
}
