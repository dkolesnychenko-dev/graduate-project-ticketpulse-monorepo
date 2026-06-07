'use client'

import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { useTxTrackerStore, type TrackedTx } from '@/shared/stores'

/**
 * Bridge the `tx-tracker` store into Sonner so every status change shows
 * a toast. We use Sonner's `id` system so a single transaction reuses
 * the same toast (no toast spam, no race conditions).
 *
 * The toast shows the description on its own — short, action-oriented
 * copy provided by the calling feature ("Listing ticket…", "Cancelling
 * buy order…", etc.). The explorer link is always present.
 */
export function TxStatusToast() {
  const byHash = useTxTrackerStore((s) => s.byHash)
  const t = useTranslations('tx')

  useEffect(() => {
    const explorerLabel = t('explorerAction')
    for (const tx of byHash.values()) {
      pushToast(tx, t, explorerLabel)
    }
  }, [byHash, t])

  return null
}

type TxTranslator = ReturnType<typeof useTranslations<'tx'>>

function pushToast(
  tx: TrackedTx,
  t: TxTranslator,
  explorerLabel: string,
) {
  const id = `tx-${tx.hash}`

  switch (tx.status) {
    case 'preparing':
    case 'awaiting-signature':
      toast.loading(t('awaitingSignature'), {
        id,
        description: tx.description,
        icon: <Loader2 className="size-4 animate-spin" />,
      })
      return

    case 'pending':
    case 'confirming':
      toast.loading(t('pending'), {
        id,
        description: tx.description,
        action: {
          label: explorerLabel,
          onClick: () => window.open(tx.explorerUrl, '_blank', 'noopener'),
        },
        icon: <Loader2 className="size-4 animate-spin" />,
      })
      return

    case 'confirmed':
      toast.success(t('confirmed'), {
        id,
        description: tx.description,
        icon: <CheckCircle2 className="size-4 text-success" />,
        action: {
          label: explorerLabel,
          onClick: () => window.open(tx.explorerUrl, '_blank', 'noopener'),
        },
      })
      return

    case 'failed':
      toast.error(tx.error?.message ?? t('failed'), {
        id,
        description: tx.description,
        icon: <XCircle className="size-4 text-destructive" />,
        action: tx.explorerUrl
          ? {
              label: explorerLabel,
              onClick: () => window.open(tx.explorerUrl, '_blank', 'noopener'),
            }
          : undefined,
      })
      return

    default:
      return
  }
}

/**
 * Inline explorer link used in card footers — receives a translated
 * label from the caller. Defaults to "Basescan" for unstyled use.
 */
export function ExplorerLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  )
}
