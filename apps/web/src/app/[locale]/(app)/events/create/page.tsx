import { getTranslations, setRequestLocale } from 'next-intl/server'

import { CreateEventForm } from '@/features/create-event'

interface CreateEventPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: CreateEventPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'events.create' })
  return { title: t('title') }
}

export default async function CreateEventPage({ params }: CreateEventPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('events.create')

  return (
    <div className="container max-w-6xl py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('subtitle')}</p>
      </header>
      <CreateEventForm />
    </div>
  )
}
