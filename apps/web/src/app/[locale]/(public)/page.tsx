import { ChevronRight, KeyRound, ShieldCheck, Sparkles, Wallet, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'

import { RoleIntentButtons } from '@/features/role-intent'
import { Link } from '@/shared/i18n/navigation'
import {
  Badge,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui'

/**
 * Landing page (F-0.1).
 *
 * Sections:
 *   1. Hero       — pulled directly from the brand strategy headline.
 *   2. Value-prop — Transparency / Fair Resale / Royalties / Privacy.
 *   3. FAQ        — minimal Q&A; copy lives in the i18n catalogue.
 *
 * Deliberately no event listings — that's the F-0 architectural rule.
 *
 * RSC-only: the whole page is a Server Component, with `RoleIntentButtons`
 * (client) as a small island that triggers wallet connect.
 */
interface LandingPageProps {
  params: Promise<{ locale: string }>
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <LandingContents />
}

function LandingContents() {
  const t = useTranslations('landing')
  const tMeta = useTranslations('meta')

  return (
    <>
      <Hero
        appName={tMeta('appName')}
        headline={t('hero.headline')}
        sub={t('hero.subheadline')}
        badge={t('badgeNetwork', { appName: tMeta('appName') })}
      />
      <Features />
      <Faq />
      <CtaStrip />
    </>
  )
}

function Hero({
  appName: _appName,
  headline,
  sub,
  badge,
}: {
  appName: string
  headline: string
  sub: string
  badge: string
}) {
  const t = useTranslations('landing.trustCards')
  return (
    <section className="border-b">
      <div className="container grid gap-12 py-20 lg:grid-cols-[1.4fr_1fr] lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="muted" className="gap-1">
            <Sparkles className="size-3.5" />
            {badge}
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {headline}
          </h1>
          <p className="max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            {sub}
          </p>
          <RoleIntentButtons variant="hero" />
        </div>

        <div className="relative hidden overflow-hidden rounded-2xl border bg-card p-6 shadow-sm lg:block">
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-[hsl(var(--secondary))]/40 blur-3xl" aria-hidden />
          <div className="relative space-y-4">
            <TrustCard
              icon={<Wallet className="size-4" />}
              title={t('wallet.title')}
              description={t('wallet.description')}
            />
            <TrustCard
              icon={<Zap className="size-4" />}
              title={t('fair.title')}
              description={t('fair.description')}
            />
            <TrustCard
              icon={<KeyRound className="size-4" />}
              title={t('identity.title')}
              description={t('identity.description')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function Features() {
  const t = useTranslations('landing')
  const items = [
    {
      key: 'transparency' as const,
      icon: <ShieldCheck className="size-5" />,
    },
    {
      key: 'fairResale' as const,
      icon: <Zap className="size-5" />,
    },
    {
      key: 'royalties' as const,
      icon: <Sparkles className="size-5" />,
    },
    {
      key: 'privacy' as const,
      icon: <KeyRound className="size-5" />,
    },
  ]

  return (
    <section className="container py-20">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Card key={it.key} className="h-full">
            <CardHeader>
              <div className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
                {it.icon}
              </div>
              <CardTitle>{t(`features.${it.key}.title`)}</CardTitle>
              <CardDescription>{t(`features.${it.key}.description`)}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Faq() {
  const t = useTranslations('landing')
  const items: Array<'whatIsNft' | 'refunds' | 'fees'> = ['whatIsNft', 'refunds', 'fees']

  return (
    <section className="border-t bg-muted/30">
      <div className="container py-20">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
          {t('faq.title')}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(`faq.items.${key}.question`)}
                </CardTitle>
                <CardDescription className="pt-2 leading-relaxed">
                  {t(`faq.items.${key}.answer`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaStrip() {
  const t = useTranslations('landing')
  return (
    <section className="border-t">
      <div className="container flex flex-col items-center gap-4 py-16 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{t('hero.headline')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('hero.subheadline')}</p>
        </div>
        <div className="flex items-center gap-3">
          <RoleIntentButtons variant="hero" />
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('cta.readGuide')}
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
