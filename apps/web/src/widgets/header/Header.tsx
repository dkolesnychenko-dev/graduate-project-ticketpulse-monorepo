import { getTranslations } from 'next-intl/server'

import { Link } from '@/shared/i18n/navigation'

import { Logo } from '@/shared/ui'
import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'
import { ThemeToggle } from './ThemeToggle'
import { WalletButton } from './WalletButton'

interface HeaderProps {
  /** Variant determines which links and CTAs to show. */
  variant?: 'public' | 'app'
}

/**
 * App-wide header. The variant changes the navigation:
 *
 *   • `public` — used on the landing + how-it-works pages. Minimal nav,
 *     wallet button shown so visitors can connect right from the hero.
 *
 *   • `app`    — used inside the `(app)` route group. Full primary nav
 *     plus mobile drawer.
 *
 * Header is Server Component-friendly (no client-only state) except for
 * the action area which lives in client islands (WalletButton, etc.).
 */
export async function Header({ variant = 'app' }: HeaderProps) {
  const tMeta = await getTranslations('meta')
  const tHeader = await getTranslations('header')

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {variant === 'app' ? <MobileMenu /> : null}
          <Link
            href={variant === 'public' ? '/' : '/events'}
            className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity hover:opacity-80"
            aria-label={tHeader('logoLabel')}
          >
            <Logo size={28} />
            {tMeta('appName')}
          </Link>
          {variant === 'app' ? <NavLinks /> : null}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  )
}
