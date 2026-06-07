import { getTranslations } from 'next-intl/server'

import type { RichEvent } from '@ticketpulse/sdk/types'

import { Card, CardContent, CardHeader, CardTitle, Progress } from '@/shared/ui'
import { PriceDisplay } from '@/entities/event'

export async function EventInfoPanel({ event }: { event: RichEvent }) {
  const t = await getTranslations('events.detail')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('infoTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.metadata?.description ? (
          <article className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
            {event.metadata.description}
          </article>
        ) : (
          <p className="text-sm text-muted-foreground">{t('descriptionUnavailable')}</p>
        )}

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label={t('rows.primaryPrice')}>
            <PriceDisplay wei={event.nominalPrice} layout="inline" />
          </Row>
          <Row label={t('rows.resalePrice')}>
            <PriceDisplay wei={event.secondaryMarketPrice} layout="inline" />
          </Row>
          <Row label={t('rows.royalty')}>{event.royaltyPercentage}%</Row>
          <Row label={t('rows.resaleMarkup')}>{event.markupPercentage}%</Row>
          <Row label={t('rows.perWalletLimit')}>{event.maxTicketsPerWallet}</Row>
          <Row label={t('rows.totalSupply')}>
            <div>
              <div className="font-tabular" data-numeric>
                {event.totalMinted} / {event.maxSupply}
              </div>
              <Progress value={event.soldProgress} className="mt-1.5" />
            </div>
          </Row>
        </dl>
      </CardContent>
    </Card>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  )
}
