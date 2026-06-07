'use client'

import { Loader2, ShoppingCart, Users2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'

import { formatEth } from '@ticketpulse/sdk/formatting'
import type { RichEvent } from '@ticketpulse/sdk/types'

import { MintTicketsFlow } from '@/features/mint-tickets'
import { useBuyOrder } from '@/features/buy-ticket'
import { MarketStats, PriceDisplay } from '@/entities/event'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui'

interface MarketplacePanelProps {
  event: RichEvent
  /** Tickets the connected wallet already holds for this event. */
  alreadyOwned: number
  /** Connected wallet has an active buy order for this event. */
  hasActiveBuyOrder: boolean
}

/**
 * Live marketplace panel on the detail page (F-23 §4 + F-8).
 *
 * Tabbed UI:
 *   • Primary  → mint flow (F-6)
 *   • Resale   → buy-order placement (F-18) or sold-out hint
 *
 * The "secondary scenarios" from F-8 (user already has a ticket / buy
 * order / sold ticket) render as inline banners above the tabs so the
 * user never has to guess what to do next.
 */
export function MarketplacePanel({
  event,
  alreadyOwned,
  hasActiveBuyOrder,
}: MarketplacePanelProps) {
  const t = useTranslations('events.marketplacePanel')
  const { isConnected } = useAccount()
  const [mintOpen, setMintOpen] = useState(false)

  const phaseSale = event.phase === 'sale'
  const primaryAvailable = phaseSale && event.remainingSupply > 0
  const queueAvailable = phaseSale && !hasActiveBuyOrder

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MarketStats
          activeBuyOrdersCount={event.activeBuyOrdersCount}
          activeSellOrdersCount={event.activeSellOrdersCount}
          remainingSupply={event.remainingSupply}
        />

        {hasActiveBuyOrder ? (
          <BannerInfo>{t('banners.alreadyHaveBuyOrder')}</BannerInfo>
        ) : null}
        {alreadyOwned > 0 ? (
          <BannerInfo>{t('banners.alreadyHoldTickets', { count: alreadyOwned })}</BannerInfo>
        ) : null}

        {!phaseSale ? (
          <BannerWarn>
            {event.phase === 'active'
              ? t('banners.eventInProgress')
              : t('banners.eventEnded')}
          </BannerWarn>
        ) : (
          <Tabs defaultValue={primaryAvailable ? 'primary' : 'resale'} className="w-full">
            <TabsList>
              <TabsTrigger value="primary" disabled={!primaryAvailable}>
                {t('primaryTab')}
              </TabsTrigger>
              <TabsTrigger value="resale">{t('resaleTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="primary" className="pt-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('primaryPriceLabel')}</p>
                  <PriceDisplay wei={event.nominalPrice} size="lg" layout="inline" />
                </div>
                <Button
                  variant="brand"
                  size="lg"
                  disabled={!isConnected || !primaryAvailable}
                  onClick={() => setMintOpen(true)}
                >
                  <ShoppingCart className="size-4" />
                  {t('buyTicketCta')}
                </Button>
              </div>
              <Dialog open={mintOpen} onOpenChange={setMintOpen}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('buyPrimaryDialogTitle')}</DialogTitle>
                  </DialogHeader>
                  <MintTicketsFlow
                    eventContract={event.id as Address}
                    eventTitle={event.title ?? ''}
                    nominalPriceWei={BigInt(event.nominalPrice)}
                    remainingSupply={event.remainingSupply}
                    maxPerWallet={event.maxTicketsPerWallet}
                    alreadyOwned={alreadyOwned}
                    onSuccess={() => setMintOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </TabsContent>
            <TabsContent value="resale" className="pt-4">
              <ResalePanel event={event} disabled={!isConnected || !queueAvailable} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

function ResalePanel({ event, disabled }: { event: RichEvent; disabled: boolean }) {
  const t = useTranslations('events.marketplacePanel')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [pending, setPending] = useState(false)
  const { placeBuyOrder } = useBuyOrder(event.id as Address)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled || !firstName.trim() || !lastName.trim()) return
    setPending(true)
    try {
      await placeBuyOrder({
        secondaryPriceWei: BigInt(event.secondaryMarketPrice),
        eventTitle: event.title ?? '',
        personalisation: {
          ownerFirstName: firstName.trim(),
          ownerLastName: lastName.trim(),
        },
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm text-muted-foreground">{t('resalePriceLabel')}</p>
          <PriceDisplay wei={event.secondaryMarketPrice} size="lg" layout="inline" />
          <p className="mt-1 text-xs text-muted-foreground">{t('resalePriceHint')}</p>
        </div>
        <Users2 className="size-5 text-muted-foreground" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="resale-first">{t('firstName')}</Label>
          <Input
            id="resale-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resale-last">{t('lastName')}</Label>
          <Input
            id="resale-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t.rich('lockSummary', {
          strong: (chunks) => <strong>{chunks}</strong>,
          amount: formatEth(BigInt(event.secondaryMarketPrice)),
        })}
      </p>
      <Button variant="brand" type="submit" disabled={disabled || pending} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {t('joinQueueCta')}
      </Button>
    </form>
  )
}

function BannerInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-success/10 px-3 py-2 text-sm text-success-foreground">
      {children}
    </div>
  )
}
function BannerWarn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
      {children}
    </div>
  )
}
