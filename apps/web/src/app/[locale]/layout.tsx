import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Inter, JetBrains_Mono } from 'next/font/google'

import { hasLocale, routing } from '@/shared/i18n/routing'
import { Providers } from '@/widgets/providers'

import '../globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'TicketPulse — Decentralised NFT ticketing',
    template: '%s · TicketPulse',
  },
  description:
    'TicketPulse turns every event ticket into a cryptographically signed, royalty-paying digital asset on the Base network.',
  applicationName: 'TicketPulse',
  authors: [{ name: 'TicketPulse Team' }],
  openGraph: {
    type: 'website',
    title: 'TicketPulse — Decentralised NFT ticketing',
    description:
      'NFT tickets that fans can trust — and organisers can profit from forever.',
    siteName: 'TicketPulse',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/logo.png' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F5F7' },
    { media: '(prefers-color-scheme: dark)', color: '#121614' },
  ],
  width: 'device-width',
  initialScale: 1,
}

/**
 * Pre-generate static params for every supported locale so Next.js can
 * statically render the locale tree at build time.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Root layout — lives under `[locale]/` so that the `<html lang>` attribute
 * reflects the active locale without an extra layer.
 *
 *   • `hasLocale` guards against unsupported codes arriving via direct
 *     URL access (e.g. `/zh/events` when Chinese hasn't shipped yet).
 *     `notFound()` renders the closest `not-found.tsx`.
 *   • `setRequestLocale(locale)` opts every server component below this
 *     layout into static rendering — without it, `getTranslations()` in
 *     RSC pages would force dynamic rendering on every request.
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetBrainsMono.variable}`}
    >
      <head />
      <body
        className="min-h-screen bg-background font-sans text-foreground"
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
