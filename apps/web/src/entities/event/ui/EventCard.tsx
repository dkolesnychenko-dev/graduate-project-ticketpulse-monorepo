'use client'

import { CalendarDays, MapPin, Users2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatDateTime } from '@ticketpulse/sdk/formatting'
import type { RichEvent } from '@ticketpulse/sdk/types'

import { Link } from '@/shared/i18n/navigation'
import { Card, CardContent, CardFooter, CardHeader, Progress } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

import { EventCoverImage } from './EventCoverImage'
import { EventStatusBadge } from './EventStatusBadge'
import { PriceDisplay } from './PriceDisplay'

interface EventCardProps {
  event: RichEvent
  /** Pass a known rate when rendering inside a list to keep all cards aligned. */
  ethEurRate?: number | null
  className?: string
}

/**
 * Default presentation for an event in any list (marketplace, organiser
 * dashboard, "my buy requests" detail). Composed from the entity's UI
 * primitives so widgets/features can swap pieces without forking.
 */
export function EventCard({ event, ethEurRate, className }: EventCardProps) {
  const tCard = useTranslations('events.card')
  const tStatus = useTranslations('events.statuses')
  const isCompleted = event.phase === 'completed'
  const isLive = event.phase === 'active'

  const activeOrders = event.activeSellOrdersCount + event.activeBuyOrdersCount

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg',
        isCompleted && 'opacity-75',
        className,
      )}
    >
      <Link href={`/events/${event.id}`} className="contents">
        <EventCoverImage
          src={event.coverImageUrl}
          alt={event.title ?? ''}
          pulse={isLive}
          aspect="video"
          className="rounded-none"
        />

        <CardHeader className="gap-2 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug">
              {event.title}
            </h3>
            <EventStatusBadge phase={event.phase} />
          </div>

          {event.metadata?.location ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              <span className="line-clamp-1">{event.metadata.location}</span>
            </p>
          ) : null}

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {formatDateTime(event.startTime)}
          </p>
        </CardHeader>

        <CardContent className="flex-1 space-y-3 pb-3">
          {!isCompleted ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {tCard('ticketsRatio', {
                    minted: event.totalMinted,
                    total: event.maxSupply,
                  })}
                </span>
                <span>{event.soldProgress.toFixed(1)}%</span>
              </div>
              <Progress value={event.soldProgress} />
            </div>
          ) : null}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users2 className="size-3.5" />
              {tCard('activeOrders', { count: activeOrders })}
            </span>
            <span>{event.remainingSupply > 0 ? tStatus('available') : tStatus('soldOut')}</span>
          </div>
        </CardContent>

        <CardFooter className="justify-between border-t pt-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {tCard('fromLabel')}
          </span>
          <PriceDisplay
            wei={event.nominalPrice}
            ethEurRate={ethEurRate}
            size="md"
            layout="stack"
          />
        </CardFooter>
      </Link>
    </Card>
  )
}
