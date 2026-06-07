/**
 * Type-safe `next-intl` integration.
 *
 * `IntlMessages` is the shape `next-intl` uses to drive autocomplete on
 * every `t('…')` call. We point it at our canonical message catalog
 * (en.json) — translators add new keys there, TypeScript flags missing
 * usages everywhere else.
 *
 * Adding a new locale (uk, de, …) is mechanical: the same keys must be
 * present, missing ones surface as compile errors.
 */
import type messages from './messages/en.json'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface IntlMessages extends Record<string, unknown> {}

  // next-intl@3 reads `messages` from the global namespace.
  type AppMessages = typeof messages
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IntlMessages extends AppMessages {}
}

export {}
