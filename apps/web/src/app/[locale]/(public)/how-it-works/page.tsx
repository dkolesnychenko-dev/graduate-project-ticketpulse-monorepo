import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui'

interface HowItWorksPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Educational page (F-0.2). Wallet onboarding, ticket purchase flow,
 * and entry validation explained in plain language. RSC-friendly.
 */
export default async function HowItWorksPage({ params }: HowItWorksPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HowItWorksContents />
}

function HowItWorksContents() {
  const t = useTranslations('howItWorks')

  const steps = [
    { key: 'wallets' as const },
    { key: 'buy' as const },
    { key: 'attend' as const },
  ]

  // Keep wallet names data-driven so future locales only update the value,
  // and brand names (MetaMask, Phantom, …) stay literal anyway.
  const supported = [
    'metamask',
    'phantom',
    'coinbase',
    'rainbow',
    'trust',
    'ledger',
    'trezor',
    'other',
  ] as const

  return (
    <article className="container max-w-4xl py-20">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-semibold md:text-4xl">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('intro')}</p>
      </header>

      <div className="grid gap-6">
        {steps.map((step) => (
          <Card key={step.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                  <CheckCircle2 className="size-4" />
                </span>
                {t(`${step.key}.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed text-foreground/90">
                {t(`${step.key}.body`)}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-12 rounded-xl border bg-muted/40 p-6">
        <h2 className="mb-2 text-lg font-semibold">
          {t('supportedWallets.title')}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('supportedWallets.description')}
        </p>
        <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {supported.map((key) => (
            <li key={key} className="rounded-md border px-3 py-2">
              {t(`supportedWallets.items.${key}`)}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
