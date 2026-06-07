import { setRequestLocale } from 'next-intl/server'

import { Footer } from '@/widgets/footer'
import { Header } from '@/widgets/header'

interface PublicLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Public-area layout (F-0.1 / F-0.2 only).
 *
 * Per architectural rule "no wallet ⇒ no events", every other page lives
 * under `(app)` and is gated by `WalletGuard`.
 *
 * `setRequestLocale` opts the layout + child pages into static rendering
 * — without it, `getTranslations()` would force dynamic rendering for
 * every request even on the landing page.
 */
export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Header variant="public" />
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </>
  )
}
