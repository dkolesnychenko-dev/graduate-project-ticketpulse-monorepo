import createMiddleware from 'next-intl/middleware'

import { routing } from '@/shared/i18n/routing'

/**
 * Locale detection + URL rewriting middleware.
 *
 *   • Reads the locale from the URL prefix (`/uk/...`) when present.
 *   • Falls back to the `Accept-Language` header for the very first
 *     visit, then persists the choice in the `NEXT_LOCALE` cookie.
 *   • Rewrites unprefixed URLs to the default locale internally — the
 *     URL the user sees stays clean (`/events`), but `request.locale`
 *     is correctly set for `next-intl`.
 *
 * The matcher excludes:
 *   • `api/*`      — REST/GraphQL proxies, locale-agnostic.
 *   • `_next/*`    — Next.js build assets.
 *   • `_vercel/*`  — Vercel runtime endpoints.
 *   • static files (anything with a dot in the path) — favicons, fonts.
 */
export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
