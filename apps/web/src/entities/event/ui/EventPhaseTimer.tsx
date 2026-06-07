'use client'

import { useTranslations } from 'next-intl'

import { useCountdown } from '@/shared/hooks/useCountdown'
import { cn } from '@/shared/lib/utils'

interface EventPhaseTimerProps {
  startTime: string | bigint | number
  endTime: string | bigint | number
  className?: string
}

/**
 * Headline countdown shown on the event-detail hero (F-23 §6).
 *
 *   • Before start  → counts down to `startTime`.
 *   • During event  → animated "Live now" pill.
 *   • After event   → returns null so callers can render nothing.
 *
 * The "d/h/m/s" suffixes are kept literal because they're universally
 * abbreviated single characters; if a future locale needs different
 * abbreviations, move them to `events.phaseTimer.units.*`.
 */
export function EventPhaseTimer({ startTime, endTime, className }: EventPhaseTimerProps) {
  const t = useTranslations('events.phaseTimer')
  const beforeStart = useCountdown(startTime)
  const beforeEnd = useCountdown(endTime)

  if (!beforeStart.isPast) {
    return (
      <div className={cn('inline-flex flex-col font-tabular leading-tight', className)} data-numeric>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {t('doorsOpenIn')}
        </span>
        <span className="text-2xl font-semibold md:text-3xl">
          {beforeStart.days}d {String(beforeStart.hours).padStart(2, '0')}h{' '}
          {String(beforeStart.minutes).padStart(2, '0')}m{' '}
          {String(beforeStart.seconds).padStart(2, '0')}s
        </span>
      </div>
    )
  }

  if (!beforeEnd.isPast) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-sm font-semibold text-[hsl(var(--secondary-foreground))] animate-pulse',
          className,
        )}
      >
        <span className="inline-block size-2 rounded-full bg-current" aria-hidden />
        {t('liveNow')}
      </div>
    )
  }

  return null
}
