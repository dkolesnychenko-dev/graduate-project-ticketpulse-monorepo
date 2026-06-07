/**
 * Backwards-compatible re-exports — the canonical source of truth now
 * lives in `routing.ts`. Keep imports of `Locale`/`locales` working until
 * call sites migrate.
 */
import { routing, type AppLocale } from './routing'

export const locales = routing.locales
export const defaultLocale = routing.defaultLocale
export type Locale = AppLocale

export function isLocale(value: string): value is AppLocale {
  return (routing.locales as readonly string[]).includes(value)
}
