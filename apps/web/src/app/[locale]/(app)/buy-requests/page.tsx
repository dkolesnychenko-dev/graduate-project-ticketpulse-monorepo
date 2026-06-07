'use client'

import { gql, useQuery } from '@apollo/client'
import { Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'

import { formatDateTime, formatEth } from '@ticketpulse/sdk/formatting'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui'
import { ConnectFlow } from '@/features/wallet-connect'
import { useBuyOrder } from '@/features/buy-ticket'

interface BuyOrderRow {
  id: string
  orderId: number
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  amountLocked: string
  createdAt: string
  refundedAmount: string | null
  event: {
    id: string
    title: string | null
    secondaryMarketPrice: string
    startTime: string
  }
  matchedTicket: { id: string; tokenId: number } | null
}

const MY_BUY_ORDERS = gql`
  query MyBuyOrdersPage($buyer: String!) {
    buyOrders(
      where: { buyer: $buyer }
      orderBy: createdAt
      orderDirection: desc
      first: 100
    ) {
      id
      orderId
      status
      amountLocked
      createdAt
      refundedAmount
      event {
        id
        title
        secondaryMarketPrice
        startTime
      }
      matchedTicket {
        id
        tokenId
      }
    }
  }
`

export default function MyBuyRequestsPage() {
  const { address, isConnected } = useAccount()
  const t = useTranslations('buyRequests')

  const { data, loading } = useQuery<{ buyOrders: BuyOrderRow[] }>(MY_BUY_ORDERS, {
    variables: { buyer: address?.toLowerCase() ?? '' },
    skip: !address,
    pollInterval: 30_000,
  })

  if (!isConnected) return <ConnectFlow />

  const orders = data?.buyOrders ?? []
  const active = orders.filter((o) => o.status === 'ACTIVE')
  const completed = orders.filter((o) => o.status === 'COMPLETED')
  const cancelled = orders.filter((o) => o.status === 'CANCELLED')

  return (
    <div className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">{t('page.title')}</h1>
        <p className="text-muted-foreground">{t('page.subtitle')}</p>
      </header>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t('tabs.active', { count: active.length })}</TabsTrigger>
          <TabsTrigger value="completed">{t('tabs.completed', { count: completed.length })}</TabsTrigger>
          <TabsTrigger value="cancelled">{t('tabs.cancelled', { count: cancelled.length })}</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {loading ? (
            <Skeletons />
          ) : active.length === 0 ? (
            <Empty>{t('empty.active')}</Empty>
          ) : (
            <ul className="grid gap-3">
              {active.map((o) => (
                <ActiveRow key={o.id} order={o} />
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="completed">
          {completed.length === 0 ? (
            <Empty>{t('empty.completed')}</Empty>
          ) : (
            <ul className="grid gap-3">
              {completed.map((o) => (
                <HistoryRow key={o.id} order={o} />
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="cancelled">
          {cancelled.length === 0 ? (
            <Empty>{t('empty.cancelled')}</Empty>
          ) : (
            <ul className="grid gap-3">
              {cancelled.map((o) => (
                <HistoryRow key={o.id} order={o} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ActiveRow({ order }: { order: BuyOrderRow }) {
  const t = useTranslations('buyRequests.active')
  const { cancelBuyOrder, pendingAction } = useBuyOrder(order.event.id as Address)
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{order.event.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('queuedAt', {
              when: formatDateTime(order.createdAt),
              position: order.orderId,
            })}
          </p>
        </div>
        <div className="text-right font-tabular text-sm" data-numeric>
          <p className="font-semibold">{formatEth(BigInt(order.amountLocked))}</p>
          <p className="text-xs text-muted-foreground">{t('lockedHint')}</p>
        </div>
      </CardHeader>
      <CardContent className="flex justify-end pt-0">
        <Button
          variant="outline"
          onClick={() => cancelBuyOrder().catch(() => null)}
          disabled={pendingAction !== null}
        >
          {pendingAction === 'cancel' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {t('cancelCta')}
        </Button>
      </CardContent>
    </Card>
  )
}

function HistoryRow({ order }: { order: BuyOrderRow }) {
  const t = useTranslations('buyRequests.history')
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{order.event.title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {order.status === 'COMPLETED'
            ? order.matchedTicket
              ? t('matchedFormat', { tokenId: order.matchedTicket.tokenId })
              : t('matchedUnknown')
            : t('cancelledFormat')}
        </p>
        <p className="font-tabular text-sm" data-numeric>
          {order.status === 'CANCELLED' && order.refundedAmount
            ? t('refundedFormat', { amount: formatEth(BigInt(order.refundedAmount)) })
            : order.status === 'COMPLETED'
              ? t('paidFormat', { amount: formatEth(BigInt(order.amountLocked)) })
              : null}
        </p>
      </CardHeader>
    </Card>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function Skeletons() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}
