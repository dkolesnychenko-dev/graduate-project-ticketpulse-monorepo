import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Locale-aware drop-in replacements for `next/link` and
 * `next/navigation`.
 *
 *   import { Link, useRouter, usePathname, redirect } from '@/shared/i18n/navigation'
 *
 *   • `<Link href="/events">`        — auto-prefixes the active locale:
 *                                       `<a href="/events">` for `en`,
 *                                       `<a href="/uk/events">` for `uk`.
 *   • `useRouter().push('/events')`  — same locale-aware behaviour.
 *   • `usePathname()`                — returns the locale-stripped path,
 *                                       so callers can treat `/uk/events`
 *                                       and `/events` identically.
 *   • `redirect('/events')`          — locale-aware redirect for RSC /
 *                                       server actions.
 *
 * For locale-agnostic helpers (`notFound`, `useSearchParams`, …) keep
 * importing from `next/navigation` directly.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
