import { defineRouting } from 'next-intl/routing'

/**
 * Canonical i18n routing definition. Single source of truth for the
 * list of locales, the default locale, and the URL-prefix strategy.
 *
 * Why `localePrefix: 'as-needed'`:
 *   • The default locale (`en`) is served without any URL prefix —
 *     `/events`, `/tickets`, … stay clean for the primary audience.
 *   • Non-default locales get an explicit prefix (`/uk/events`, etc.).
 *   • Adding a new locale is a two-step change:
 *       1. drop `messages/<locale>.json` (same keys as `en.json`),
 *       2. append the code to `locales` below.
 *     Everything else — routing, middleware, navigation helpers, the
 *     `<html lang>` attribute — picks the new locale up automatically.
 */
export const routing = defineRouting({
  locales: ['en', 'uk'] as const,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

export type AppLocale = (typeof routing.locales)[number]

/**
 * Type-guard that checks whether `locale` is one of the application's
 * supported locales.
 *
 * This mirrors the `hasLocale` helper introduced in next-intl v4.
 * We provide it here so the codebase can use the same call-site pattern
 * while staying on next-intl v3 until an intentional upgrade.
 */
export function hasLocale<Locales extends readonly string[]>(
  locales: Locales,
  locale: unknown,
): locale is Locales[number] {
  return typeof locale === 'string' && (locales as readonly string[]).includes(locale)
}
