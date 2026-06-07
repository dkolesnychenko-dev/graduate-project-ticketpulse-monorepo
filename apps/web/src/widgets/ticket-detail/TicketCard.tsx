'use client'

import { CalendarDays, ExternalLink, Hash, MapPin, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Address } from 'viem'

import { buildExplorerUrl } from '@ticketpulse/sdk/config'
import { formatDateTime, formatEth } from '@ticketpulse/sdk/formatting'
import { computeEventPhase } from '@ticketpulse/sdk/services'

import { TicketStatusBadge, type TicketSection } from '@/entities/ticket'
import { EventCoverImage, PriceDisplay } from '@/entities/event'
import { QrCodeDialog } from '@/features/qr-generator'
import { useSellTicket } from '@/features/sell-ticket'
import { useWithdraw } from '@/features/withdraw'
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/shared/ui'
import { publicEnv } from '@/shared/env/public'

export interface TicketCardData {
  id: string
  tokenId: number
  isOnSale: boolean
  mintPrice: string
  lastResalePrice: string | null
  mintedAt: string
  /** Saved-locally identity row — present iff the user kept the artifact. */
  ownerFullName?: string
  event: {
    id: Address
    title: string | null
    ticketType: string | null
    ticketSymbol: string | null
    coverImageUrl: string | null
    startTime: string
    endTime: string
    location?: string | null
  }
}

interface TicketCardProps {
  ticket: TicketCardData
  section: TicketSection
}

export function TicketCard({ ticket, section }: TicketCardProps) {
  const t = useTranslations('tickets.card')
  const { listForSale, cancelSellOrder, pendingAction } = useSellTicket(ticket.event.id)

  const phase = computeEventPhase({
    startTime: ticket.event.startTime,
    endTime: ticket.event.endTime,
  })
  const canGenerateQr = phase !== 'completed'
  const canListForSale = phase === 'sale' && section === 'ready'
  const canCancelListing = phase === 'sale' && section === 'on-sale'

  return (
    <Card className="flex flex-col overflow-hidden">
      <EventCoverImage
        src={ticket.event.coverImageUrl}
        alt={ticket.event.title ?? ''}
        aspect="video"
        className="rounded-none"
      />
      <CardHeader className="gap-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold">{ticket.event.title}</h3>
          <TicketStatusBadge section={section} />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Hash className="size-3.5" />
          {t('tokenLabel', { tokenId: ticket.tokenId, type: ticket.event.ticketType ?? '' })}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          {formatDateTime(ticket.event.startTime)}
        </p>
        {ticket.event.location ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            <span className="line-clamp-1">{ticket.event.location}</span>
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 space-y-2 pb-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('boughtAt')}</span>
          <PriceDisplay wei={ticket.mintPrice} layout="inline" size="sm" />
        </div>
        {ticket.lastResalePrice ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('lastResale')}</span>
            <span className="font-tabular" data-numeric>
              {formatEth(BigInt(ticket.lastResalePrice))}
            </span>
          </div>
        ) : null}
        {ticket.ownerFullName ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('holder')}</span>
            <span className="font-medium">{ticket.ownerFullName}</span>
          </div>
        ) : null}
        <a
          href={buildExplorerUrl(publicEnv.NEXT_PUBLIC_CHAIN_ID, 'token', ticket.event.id)}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {t('explorerLabel')}
          <ExternalLink className="size-3" />
        </a>
      </CardContent>

      <CardFooter className="flex-col gap-2 border-t pt-3 sm:flex-row">
        {canGenerateQr ? (
          <QrCodeDialog
            eventContract={ticket.event.id}
            tokenId={ticket.tokenId}
            ownerName={ticket.ownerFullName}
            triggerLabel={t('showEntryQr')}
          />
        ) : null}
        {canListForSale ? (
          <Button
            variant="outline"
            disabled={pendingAction !== null}
            onClick={() => listForSale(ticket.tokenId).catch(() => null)}
            className="w-full"
          >
            {t('listForSale')}
          </Button>
        ) : null}
        {canCancelListing ? (
          <Button
            variant="outline"
            disabled={pendingAction !== null}
            onClick={() => cancelSellOrder(ticket.tokenId).catch(() => null)}
            className="w-full"
          >
            {t('removeFromSale')}
          </Button>
        ) : null}
        {section === 'sold-pending' ? (
          <WithdrawSellerBalance eventContract={ticket.event.id} />
        ) : null}
        {!canGenerateQr && section === 'collectible' ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="size-3.5" />
            {t('collectibleHint')}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function WithdrawSellerBalance({ eventContract }: { eventContract: Address }) {
  const t = useTranslations('tickets.card')
  const { withdraw, activeAction } = useWithdraw(eventContract)
  return (
    <Button
      variant="brand"
      onClick={() => withdraw('seller').catch(() => null)}
      disabled={activeAction !== null}
      className="w-full"
    >
      {t('withdrawProceeds')}
    </Button>
  )
}
