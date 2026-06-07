import { getRequestConfig } from 'next-intl/server'

import { hasLocale, routing } from './routing'

/**
 * `next-intl` request config — invoked on every server render to resolve
 * the active locale + load its message catalog.
 *
 *   • `requestLocale` is supplied by the middleware via the
 *     `[locale]` dynamic segment.
 *   • Falls back to `routing.defaultLocale` if a request comes in
 *     without a recognised locale (e.g. during SSG of an unknown path).
 *   • Message catalogs are imported lazily so only the active locale's
 *     JSON lands in each render.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'UTC',
    now: new Date(),
  }
})
