'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/shared/i18n/navigation'
import { cn } from '@/shared/lib/utils'

const links = [
  { href: '/events', key: 'marketplace' as const },
  { href: '/tickets', key: 'myTickets' as const },
  { href: '/buy-requests', key: 'buyRequests' as const },
  { href: '/organizer', key: 'organizer' as const },
] as const

export function NavLinks() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tHeader = useTranslations('header')

  return (
    <nav aria-label={tHeader('primaryNavLabel')} className="hidden items-center gap-1 md:flex">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            {t(link.key)}
          </Link>
        )
      })}
    </nav>
  )
}
