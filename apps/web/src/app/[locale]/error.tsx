'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { Button, Logo } from '@/shared/ui'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors.page')
  const tCommon = useTranslations('common')

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[TicketPulse] uncaught route error:', error)
  }, [error])

  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <Logo size={64} className="mb-2" />
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <p className="max-w-md text-muted-foreground">
        {error.message || t('fallbackMessage')}
      </p>
      <Button onClick={reset}>{tCommon('tryAgain')}</Button>
    </main>
  )
}
