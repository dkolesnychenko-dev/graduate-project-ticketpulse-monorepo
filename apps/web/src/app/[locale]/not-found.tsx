import { getTranslations } from 'next-intl/server'

import { Link } from '@/shared/i18n/navigation'
import { Button, Logo } from '@/shared/ui'

export default async function NotFound() {
  const t = await getTranslations('errors.notFound')

  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <Logo size={64} className="mb-2" />
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        {t('code')}
      </p>
      <h1 className="text-4xl font-semibold">{t('title')}</h1>
      <p className="max-w-md text-muted-foreground">{t('description')}</p>
      <Button asChild>
        <Link href="/">{t('backHome')}</Link>
      </Button>
    </main>
  )
}
