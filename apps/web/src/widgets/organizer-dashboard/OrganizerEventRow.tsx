'use client'

import { useTranslations } from 'next-intl'

import { formatDateTime, formatEth } from '@ticketpulse/sdk/formatting'
import { computeEventPhase } from '@ticketpulse/sdk/services'

import { EventStatusBadge } from '@/entities/event'
import { Link } from '@/shared/i18n/navigation'
import { Button, Card, CardContent } from '@/shared/ui'
import { useWithdraw } from '@/features/withdraw'
import type { Address } from 'viem'

export interface OrganizerEventRowData {
  id: string
  title: string | null
  startTime: string
  endTime: string
  totalMinted: number
  maxSupply: number
  totalPrimaryVolume: string
  totalRoyaltiesCollected: string
  totalResales: number
}

export function OrganizerEventRow({ row }: { row: OrganizerEventRowData }) {
  const t = useTranslations('organizer.row')
  const phase = computeEventPhase({ startTime: row.startTime, endTime: row.endTime })
  const eventContract = row.id as Address
  const { withdraw, activeAction } = useWithdraw(eventContract)

  const canWithdraw = phase === 'completed'

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <EventStatusBadge phase={phase} />
            <Link
              href={`/events/${row.id}`}
              className="text-base font-semibold hover:underline"
            >
              {row.title}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('startsAt', { when: formatDateTime(row.startTime) })}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm sm:max-w-sm">
          <Stat label={t('soldStatLabel')} value={`${row.totalMinted}/${row.maxSupply}`} />
          <Stat
            label={t('primaryStatLabel')}
            value={formatEth(BigInt(row.totalPrimaryVolume))}
            tabular
          />
          <Stat
            label={t('royaltyStatLabel')}
            value={formatEth(BigInt(row.totalRoyaltiesCollected))}
            tabular
          />
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            disabled={!canWithdraw || activeAction !== null}
            onClick={() => withdraw('all-organizer').catch(() => null)}
          >
            {t('withdrawAll')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd
        className={tabular ? 'font-tabular text-sm font-medium' : 'text-sm font-medium'}
        data-numeric={tabular ? '' : undefined}
      >
        {value}
      </dd>
    </div>
  )
}
