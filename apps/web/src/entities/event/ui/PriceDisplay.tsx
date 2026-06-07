'use client'

import { formatDualPrice } from '@ticketpulse/sdk/formatting'

import { useEthEurRate } from '@/shared/hooks/useEthEurRate'
import { cn } from '@/shared/lib/utils'

interface PriceDisplayProps {
  /** Amount in wei (decimal string is also accepted for GraphQL BigInt). */
  wei: bigint | string
  /** Optional fixed rate — pass when an aggregated API gave us one (keeps a list stable). */
  ethEurRate?: number | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Compact ⇒ one-liner; otherwise primary + EUR equivalent below. */
  layout?: 'inline' | 'stack'
}

const sizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
} as const

/**
 * Dual-price renderer — ETH primary, EUR secondary (F-0.8 in EUR-only mode).
 *
 * Behaviour rules:
 *   • If a rate is passed explicitly, use it — keeps "load more" pages
 *     consistent with the initial render (NFR-UI stability).
 *   • Otherwise fall back to the live `useEthEurRate` cache.
 *   • If no rate is available at all, render ETH only.
 */
export function PriceDisplay({
  wei,
  ethEurRate,
  size = 'md',
  className,
  layout = 'stack',
}: PriceDisplayProps) {
  const { data } = useEthEurRate()
  const liveRate = ethEurRate ?? data?.rate ?? null

  const value = typeof wei === 'string' ? BigInt(wei) : wei
  const parts = formatDualPrice(value, liveRate)

  if (layout === 'inline') {
    return (
      <span className={cn('font-tabular', sizeClass[size], className)} data-numeric>
        <span className="font-semibold">{parts.primary}</span>
        {parts.secondary ? (
          <span className="ml-2 text-muted-foreground">{parts.secondary}</span>
        ) : null}
      </span>
    )
  }

  return (
    <span className={cn('flex flex-col font-tabular leading-tight', className)} data-numeric>
      <span className={cn('font-semibold', sizeClass[size])}>{parts.primary}</span>
      {parts.secondary ? (
        <span className="text-xs text-muted-foreground">{parts.secondary}</span>
      ) : null}
    </span>
  )
}
