'use client'

import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/shared/i18n/navigation'
import { Button, Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { useUiStore } from '@/shared/stores'

const links = [
  { href: '/events', key: 'marketplace' as const },
  { href: '/tickets', key: 'myTickets' as const },
  { href: '/buy-requests', key: 'buyRequests' as const },
  { href: '/organizer', key: 'organizer' as const },
  { href: '/how-it-works', key: 'howItWorks' as const },
] as const

export function MobileMenu() {
  const tNav = useTranslations('nav')
  const tHeader = useTranslations('header')
  const pathname = usePathname()
  const isOpen = useUiStore((s) => s.isSidebarOpen)
  const setOpen = useUiStore((s) => s.setSidebarOpen)

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={tHeader('menuOpen')}
        >
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-screen w-3/4 max-w-sm translate-x-0 translate-y-0 rounded-none border-r p-0 sm:rounded-none">
        <div className="flex items-center justify-between border-b p-4">
          <DialogTitle className="text-lg">{tHeader('mobileTitle')}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label={tHeader('menuClose')}
          >
            <X className="size-4" />
          </Button>
        </div>
        <nav aria-label={tHeader('mobileTitle')} className="flex flex-col gap-1 p-4">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2 text-base font-medium',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60',
                )}
              >
                {tNav(link.key)}
              </Link>
            )
          })}
        </nav>
      </DialogContent>
    </Dialog>
  )
}
