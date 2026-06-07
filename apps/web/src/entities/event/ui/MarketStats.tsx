'use client'

import { ArrowDownToLine, ArrowUpFromLine, Users2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'

interface MarketStatsProps {
  activeSellOrdersCount: number
  activeBuyOrdersCount: number
  remainingSupply: number
  className?: string
}

/**
 * Three-cell quick-stats strip used on the event-detail page header
 * (F-23 §3). Numbers come straight from the Subgraph denormalised
 * counters so the rendering cost is constant regardless of the event's
 * historical volume.
 */
export function MarketStats({
  activeSellOrdersCount,
  activeBuyOrdersCount,
  remainingSupply,
  className,
}: MarketStatsProps) {
  const t = useTranslations('events.marketStats')
  return (
    <dl className={cn('grid grid-cols-3 gap-3', className)}>
      <Stat
        icon={<ArrowDownToLine className="size-4" />}
        label={t('sellQueue')}
        value={activeSellOrdersCount}
      />
      <Stat
        icon={<ArrowUpFromLine className="size-4" />}
        label={t('buyQueue')}
        value={activeBuyOrdersCount}
      />
      <Stat
        icon={<Users2 className="size-4" />}
        label={t('available')}
        value={remainingSupply}
      />
    </dl>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-tabular text-lg font-semibold" data-numeric>
        {value.toLocaleString('en-US')}
      </dd>
    </div>
  )
}
