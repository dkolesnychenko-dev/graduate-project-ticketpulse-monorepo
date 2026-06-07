'use client'

import { MAX_BATCH_SIZE } from '@ticketpulse/sdk/constants'
import type { DecodedContractError } from '@ticketpulse/sdk/errors'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

/**
 * Resolve a `DecodedContractError` into localized `{ title, description }`.
 *
 * We deliberately keep the SDK's pure `contractErrorMessage()` function
 * around as a fallback for non-React consumers (scripts, tests). Inside
 * the web app we layer this hook on top so every revert toast / banner
 * speaks the user's language.
 */
export function useContractErrorMessage() {
  const t = useTranslations('errors')

  return useCallback(
    (decoded: DecodedContractError): { title: string; description: string } => {
      if (decoded.userRejected) {
        return {
          title: t('rejected.title'),
          description: t('rejected.description'),
        }
      }

      if (decoded.name) {
        try {
          // Dynamic key construction — not every ContractErrorName has a
          // translation entry (e.g. AlreadyInitialized is a dev-only guard).
          // The try/catch is the runtime safety net; `as never` lets TS
          // accept the template literal without widening to `string`.
          const titleKey = `contract.${decoded.name}.title` as never
          const descKey = `contract.${decoded.name}.description` as never
          const title = t(titleKey)
          const description =
            decoded.name === 'MaxBatchExceeded'
              ? t(descKey, { max: MAX_BATCH_SIZE })
              : t(descKey)
          return { title, description }
        } catch {
          // Unknown error name — fall through to the default.
        }
      }

      return {
        title: t('default.title'),
        description: decoded.shortMessage,
      }
    },
    [t],
  )
}
