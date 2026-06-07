import { Suspense } from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Skeleton } from '@/shared/ui'
import { EventGrid, SearchBar } from '@/widgets/marketplace'
import { fetchRichEventsForRSC } from '@/shared/lib/rsc/fetchRichEvents'

/**
 * Buyer-facing event catalog (F-5).
 *
 *   • RSC fetches the first 20 events (60 s data-cache revalidation).
 *   • The list is hydrated into the client grid which then drives
 *     "Load more" + search filtering.
 *
 * The Suspense boundary around `<EventListSection />` lets the rest of
 * the layout paint immediately while the subgraph query resolves.
 */
export const revalidate = 60

interface EventsPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: EventsPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'events.list' })
  return { title: t('title') }
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('events.list')

  return (
    <div className="container py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <SearchBar />
      </header>

      <Suspense fallback={<EventListSkeleton />}>
        <EventListSection />
      </Suspense>
    </div>
  )
}

async function EventListSection() {
  const now = Math.floor(Date.now() / 1000)
  const events = await fetchRichEventsForRSC({
    first: 20,
    startTimeGte: String(now - 60 * 60 * 24),
  })
  return <EventGrid initialEvents={events} />
}

function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full rounded-xl" />
      ))}
    </div>
  )
}
