import { getTranslations } from 'next-intl/server'

import { Link } from '@/shared/i18n/navigation'
import { Logo } from '@/shared/ui'

/**
 * Minimal footer with legal + help anchors. Used on every page.
 */
export async function Footer() {
  const t = await getTranslations('footer')
  const tMeta = await getTranslations('meta')

  return (
    <footer className="border-t bg-muted/30">
      <div className="container flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Logo size={20} />
          <span className="font-semibold text-foreground">{tMeta('appName')}</span>
          <span className="text-xs">
            {t('copyrightFormat', { year: new Date().getFullYear() })}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link className="hover:text-foreground" href="/how-it-works">
            {t('links.howItWorks')}
          </Link>
          <Link className="hover:text-foreground" href="/events">
            {t('links.marketplace')}
          </Link>
          <a
            href="https://docs.base.org"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground"
          >
            {t('links.baseNetwork')}
          </a>
          <a
            href="https://thegraph.com/studio/"
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-foreground"
          >
            {t('links.subgraph')}
          </a>
        </nav>
      </div>
    </footer>
  )
}
