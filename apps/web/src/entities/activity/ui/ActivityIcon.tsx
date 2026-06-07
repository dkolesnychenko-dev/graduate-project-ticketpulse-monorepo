import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  CheckCircle2,
  Coins,
  PartyPopper,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

import type { ActivityType } from '@ticketpulse/sdk/graphql'

const ICONS: Record<ActivityType, LucideIcon> = {
  EVENT_CREATED: PartyPopper,
  TICKET_MINTED: Coins,
  SELL_ORDER_CREATED: ArrowDownToLine,
  SELL_ORDER_CANCELLED: Trash2,
  BUY_ORDER_CREATED: ArrowUpFromLine,
  BUY_ORDER_CANCELLED: Trash2,
  ORDER_MATCHED: ArrowLeftRight,
  ORGANIZER_PRIMARY_WITHDRAWAL: Banknote,
  ORGANIZER_ROYALTY_WITHDRAWAL: Banknote,
  SELLER_WITHDRAWAL: Banknote,
  QUEUE_BATCH_CLEANUP: CheckCircle2,
}

export function ActivityIcon({ type, className }: { type: ActivityType; className?: string }) {
  const Icon = ICONS[type]
  return <Icon className={className ?? 'size-4'} />
}
