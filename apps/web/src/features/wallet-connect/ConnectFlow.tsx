'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ShieldCheck, Wallet, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Logo } from '@/shared/ui'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui'

/**
 * Connect prompt shown when an unauthenticated user lands in the
 * protected `(app)` route group.
 *
 * UX rationale:
 *   • RainbowKit's `<ConnectButton.Custom>` lets us style the CTA to
 *     match our brand instead of the default rainbow gradient.
 *   • Three small "trust" badges below the CTA echo the brand pillars
 *     (Transparency, Fair Resale, Privacy) — bridges the gap between
 *     "I clicked something" and "I'm asked to connect a wallet".
 */
export function ConnectFlow() {
  const t = useTranslations('wallet.guard')
  const tCommon = useTranslations('landing.features')

  return (
    <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo size={64} />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription className="mx-auto max-w-md text-base">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <ConnectButton.Custom>
            {({ openConnectModal, mounted }) => (
              <Button
                onClick={openConnectModal}
                size="xl"
                variant="brand"
                disabled={!mounted}
              >
                {t('cta')}
              </Button>
            )}
          </ConnectButton.Custom>

          <div className="grid w-full gap-3 sm:grid-cols-3">
            <TrustBadge
              icon={<ShieldCheck className="size-4" />}
              title={tCommon('transparency.title')}
            />
            <TrustBadge
              icon={<Zap className="size-4" />}
              title={tCommon('fairResale.title')}
            />
            <TrustBadge
              icon={<Wallet className="size-4" />}
              title={tCommon('privacy.title')}
            />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function TrustBadge({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
      <span className="text-accent-foreground">{icon}</span>
      <span className="font-medium">{title}</span>
    </div>
  )
}
