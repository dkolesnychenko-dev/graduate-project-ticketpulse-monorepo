'use client'

import { useEffect, useState } from 'react'

import { formatCountdown, type Countdown } from '@ticketpulse/sdk/formatting'

/**
 * Subscribe to a 1-second-resolution countdown towards a Unix timestamp.
 *
 * The hook re-renders once per second on the client only — server-side
 * it falls back to an immediate snapshot so the first paint is correct.
 */
export function useCountdown(
  targetUnixSeconds: number | bigint | string,
): Countdown {
  const [snapshot, setSnapshot] = useState<Countdown>(() =>
    formatCountdown(targetUnixSeconds),
  )

  useEffect(() => {
    setSnapshot(formatCountdown(targetUnixSeconds))
    const id = setInterval(() => {
      setSnapshot(formatCountdown(targetUnixSeconds))
    }, 1000)
    return () => clearInterval(id)
  }, [targetUnixSeconds])

  return snapshot
}
