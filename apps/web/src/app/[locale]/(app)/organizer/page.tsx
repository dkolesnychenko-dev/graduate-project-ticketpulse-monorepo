'use client'

import { gql, useQuery } from '@apollo/client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useTranslations } from 'next-intl'

import { ORGANIZER_PAGE_SIZE } from '@ticketpulse/sdk/constants'

import { ConnectFlow } from '@/features/wallet-connect'
import { Link } from '@/shared/i18n/navigation'
import { OrganizerEventRow, type OrganizerEventRowData } from '@/widgets/organizer-dashboard'
import { Button, Skeleton } from '@/shared/ui'

const ORGANIZER_EVENTS = gql`
  query OrganizerEventsPage($skip: Int!, $first: Int!, $organizer: String!) {
    events(
      skip: $skip
      first: $first
      where: { organizer: $organizer }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      title
      startTime
      endTime
      totalMinted
      maxSupply
      totalPrimaryVolume
      totalRoyaltiesCollected
      totalResales
    }
  }
`

/**
 * F-2 — Organiser dashboard with classic offset pagination (10/page).
 *
 * Why offset here while buyer pages use cursor pagination: organisers
 * typically want to jump to a specific page when reviewing historical
 * events (e.g. "Q3 2026 portfolio"). Buyer browse is timeline-shaped
 * and benefits from continuous scroll.
 */
export default function OrganizerDashboardPage() {
  const { address, isConnected } = useAccount()
  const t = useTranslations('organizer')
  const params = useSearchParams()
  const initialPage = Math.max(0, Number(params.get('page') ?? 0))
  const [page, setPage] = useState(initialPage)

  const { data, loading, previousData } = useQuery<{ events: OrganizerEventRowData[] }>(
    ORGANIZER_EVENTS,
    {
      variables: {
        skip: page * ORGANIZER_PAGE_SIZE,
        first: ORGANIZER_PAGE_SIZE,
        organizer: address?.toLowerCase() ?? '',
      },
      skip: !address,
    },
  )

  if (!isConnected) return <ConnectFlow />

  const events = data?.events ?? previousData?.events ?? []
  const hasNext = events.length === ORGANIZER_PAGE_SIZE

  return (
    <div className="container py-10">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t('page.title')}</h1>
          <p className="text-muted-foreground">{t('page.subtitle')}</p>
        </div>
        <Button asChild variant="brand">
          <Link href="/events/create">{t('page.createCta')}</Link>
        </Button>
      </header>

      {loading && events.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border bg-muted/30 p-12 text-center">
          <p className="mb-3 text-muted-foreground">{t('empty.headline')}</p>
          <Button asChild variant="brand">
            <Link href="/events/create">{t('empty.cta')}</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {events.map((row) => (
            <OrganizerEventRow key={row.id} row={row} />
          ))}
        </ul>
      )}

      <nav className="mt-6 flex items-center justify-center gap-2" aria-label={t('pagination.label')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          {t('pagination.previous')}
        </Button>
        <span className="text-sm font-tabular" data-numeric>
          {t('pagination.page', { page: page + 1 })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNext}
        >
          {t('pagination.next')}
        </Button>
      </nav>
    </div>
  )
}
