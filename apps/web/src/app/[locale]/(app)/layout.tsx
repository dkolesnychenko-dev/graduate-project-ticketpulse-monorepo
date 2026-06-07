import { setRequestLocale } from 'next-intl/server'

import { AccountMismatchGuard, WalletGuard } from '@/features/wallet-connect'
import { TxStatusToast } from '@/features/transaction-tracker'
import { Footer } from '@/widgets/footer'
import { Header } from '@/widgets/header'

interface AppLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Protected route-group layout — every page below is gated on wallet
 * connection and chain consistency (F-0.4 + F-0.6).
 *
 *   • `WalletGuard`             — renders connect-screen if disconnected;
 *                                  overlays NetworkCheck on chain mismatch.
 *   • `AccountMismatchGuard`    — non-blocking modal on `accountsChanged`.
 *   • `TxStatusToast`           — global Sonner bridge for the tx tracker.
 *
 * `setRequestLocale` enables static rendering for the Header/Footer
 * RSCs that use `getTranslations()`.
 */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <WalletGuard>
      <Header variant="app" />
      <AccountMismatchGuard />
      <TxStatusToast />
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </WalletGuard>
  )
}
