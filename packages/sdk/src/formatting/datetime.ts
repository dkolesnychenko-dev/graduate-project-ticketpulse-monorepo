/**
 * Date / time formatting.
 *
 * Per NFR-LOCAL-002 we render dates as `May 15, 2026` (textual month) to
 * avoid the DD.MM vs MM.DD ambiguity. Times use the locale's 12/24h
 * preference plus an explicit timezone offset, e.g. `8:00 PM (GMT+2)`.
 *
 * All inputs are Unix-seconds (`bigint` or `number`) — `bigint` is the
 * Subgraph's representation, `number` is what local JS produces.
 */

export function unixToDate(unixSeconds: number | bigint | string): Date {
  const n =
    typeof unixSeconds === 'bigint'
      ? Number(unixSeconds)
      : typeof unixSeconds === 'string'
        ? Number(unixSeconds)
        : unixSeconds
  return new Date(n * 1000)
}

function tzOffsetSuffix(date: Date, locale = 'en-US'): string {
  // Pick the user's named timezone (e.g. "GMT+2") from a long-format formatter.
  // Falls back to `GMT±H` derived from `getTimezoneOffset` when the runtime
  // doesn't expose the long timezone name (older Edge runtimes).
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZoneName: 'shortOffset',
    }).formatToParts(date)
    const tz = parts.find((p) => p.type === 'timeZoneName')
    if (tz) return tz.value.startsWith('GMT') ? tz.value : `GMT${tz.value}`
  } catch {
    // intentional fall-through
  }
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, '0')}`
}

export interface FormatDateTimeOptions {
  locale?: string
  /** Force 12 or 24h. Defaults to the locale's preference. */
  hour12?: boolean
  /** Include the day-of-week (e.g. "Fri, May 15, 2026"). */
  weekday?: boolean
}

export function formatDateTime(
  unixSeconds: number | bigint | string,
  options: FormatDateTimeOptions = {},
): string {
  const date = unixToDate(unixSeconds)
  const { locale = 'en-US', hour12, weekday = false } = options

  const datePart = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(weekday ? { weekday: 'short' } : {}),
  })
  const timePart = date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(hour12 !== undefined ? { hour12 } : {}),
  })
  return `${datePart}, ${timePart} (${tzOffsetSuffix(date, locale)})`
}

export function formatDateRange(
  startUnix: number | bigint | string,
  endUnix: number | bigint | string,
  options: FormatDateTimeOptions = {},
): string {
  const start = unixToDate(startUnix)
  const end = unixToDate(endUnix)
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  if (sameDay) {
    // Render as `May 15, 2026 · 7:00 PM → 11:30 PM (GMT+2)`.
    const datePart = start.toLocaleDateString(options.locale ?? 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const timeOpts = { hour: 'numeric' as const, minute: '2-digit' as const }
    const startTime = start.toLocaleTimeString(options.locale ?? 'en-US', timeOpts)
    const endTime = end.toLocaleTimeString(options.locale ?? 'en-US', timeOpts)
    return `${datePart} · ${startTime} → ${endTime} (${tzOffsetSuffix(start)})`
  }
  return `${formatDateTime(startUnix, options)} → ${formatDateTime(endUnix, options)}`
}

export interface Countdown {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  isPast: boolean
}

/** Decompose seconds-from-now into a `dd:hh:mm:ss`-ready structure. */
export function formatCountdown(
  targetUnixSeconds: number | bigint | string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Countdown {
  const target =
    typeof targetUnixSeconds === 'bigint'
      ? Number(targetUnixSeconds)
      : typeof targetUnixSeconds === 'string'
        ? Number(targetUnixSeconds)
        : targetUnixSeconds

  const diff = target - nowSeconds
  const totalSeconds = Math.abs(diff)
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isPast: diff < 0,
  }
}

/**
 * Casual "5 minutes ago" / "in 3 days" string for activity logs and toasts.
 * Uses `Intl.RelativeTimeFormat` for proper localisation when we add more
 * languages later.
 */
export function formatRelative(
  unixSeconds: number | bigint | string,
  options: { locale?: string; nowSeconds?: number } = {},
): string {
  const target =
    typeof unixSeconds === 'bigint'
      ? Number(unixSeconds)
      : typeof unixSeconds === 'string'
        ? Number(unixSeconds)
        : unixSeconds

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000)
  const diff = target - now
  const rtf = new Intl.RelativeTimeFormat(options.locale ?? 'en-US', {
    numeric: 'auto',
  })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(diff, 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 2_592_000) return rtf.format(Math.round(diff / 86_400), 'day')
  if (abs < 31_536_000) return rtf.format(Math.round(diff / 2_592_000), 'month')
  return rtf.format(Math.round(diff / 31_536_000), 'year')
}
