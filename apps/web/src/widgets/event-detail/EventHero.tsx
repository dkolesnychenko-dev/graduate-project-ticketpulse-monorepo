import { CalendarDays, MapPin } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { buildExplorerUrl } from '@ticketpulse/sdk/config'
import { formatDateRange } from '@ticketpulse/sdk/formatting'
import type { RichEvent } from '@ticketpulse/sdk/types'

import { EventCoverImage, EventPhaseTimer, EventStatusBadge, PriceDisplay } from '@/entities/event'
import { AddressDisplay } from '@/entities/user'
import { Badge } from '@/shared/ui'
import { publicEnv } from '@/shared/env/public'

interface EventHeroProps {
  event: RichEvent
}

export async function EventHero({ event }: EventHeroProps) {
  const t = await getTranslations('events.detail')

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <EventCoverImage
        src={event.coverImageUrl}
        alt={event.title ?? ''}
        priority
        pulse={event.phase === 'active'}
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <EventStatusBadge phase={event.phase} />
          {event.ticketType ? <Badge variant="muted">{event.ticketType}</Badge> : null}
          <Badge variant="outline" className="font-tabular" data-numeric>
            {event.ticketSymbol}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
          {event.title}
        </h1>
        <div className="space-y-1 text-sm text-muted-foreground">
          {event.metadata?.location ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {event.metadata.location}
            </p>
          ) : null}
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatDateRange(event.startTime, event.endTime)}
          </p>
        </div>
        <EventPhaseTimer startTime={event.startTime} endTime={event.endTime} />
        <div className="mt-2 rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('primaryPriceLabel')}
          </p>
          <PriceDisplay wei={event.nominalPrice} size="xl" layout="inline" />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('organizerLabel')}: <AddressDisplay address={event.organizer.id} compact />
          <span className="mx-2">•</span>
          <a
            href={buildExplorerUrl(publicEnv.NEXT_PUBLIC_CHAIN_ID, 'address', event.id)}
            className="underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('contractLink')}
          </a>
        </p>
      </div>
    </section>
  )
}
