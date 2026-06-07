import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'

import { EventHero, EventInfoPanel, MarketplacePanel } from '@/widgets/event-detail'
import { fetchRichEventByIdForRSC } from '@/shared/lib/rsc/fetchRichEventById'

interface PageProps {
  params: Promise<{ locale: string; address: string }>
}

/**
 * Event detail (F-23).
 *
 * RSC body:
 *   • Loads the event server-side (15 s data-cache).
 *   • Renders hero + info panel synchronously.
 *
 * Client islands:
 *   • `MarketplacePanel` (mint / buy / queues).
 *   • A future `<ActivityTimeline />` widget (cursor pagination via
 *     `useQuery('EventActivity')`) — placeholder for now to keep the
 *     route compile-clean while we iterate.
 */
export const revalidate = 15

export default async function EventDetailPage({ params }: PageProps) {
  const { locale, address } = await params
  setRequestLocale(locale)

  const event = await fetchRichEventByIdForRSC(address)
  if (!event) notFound()

  return (
    <div className="container space-y-6 py-8">
      <EventHero event={event} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
        <EventInfoPanel event={event} />
        <MarketplacePanel event={event} alreadyOwned={0} hasActiveBuyOrder={false} />
      </div>
    </div>
  )
}
