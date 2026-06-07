'use client'

import { Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import { buildExplorerUrl } from '@ticketpulse/sdk/config'
import { truncateAddress } from '@ticketpulse/sdk/formatting'

import { Button } from '@/shared/ui'
import { publicEnv } from '@/shared/env/public'
import { cn } from '@/shared/lib/utils'

interface AddressDisplayProps {
  address: string
  className?: string
  /** Hide the "copy" / "explorer" actions for compact rows. */
  compact?: boolean
}

/**
 * Render a Web3 address with copy + Basescan affordances. The
 * truncation rule matches Basescan's own convention (`0x1234…abcd`).
 */
export function AddressDisplay({ address, className, compact = false }: AddressDisplayProps) {
  const t = useTranslations('common')
  const [, setBumpKey] = useState(0)

  const copy = async () => {
    await navigator.clipboard.writeText(address)
    toast.success(t('addressCopied'))
    setBumpKey((n) => n + 1)
  }

  return (
    <span className={cn('inline-flex items-center gap-1 font-tabular text-sm', className)} data-numeric>
      <span className="rounded-md bg-muted px-2 py-0.5">
        {truncateAddress(address)}
      </span>
      {!compact ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={copy}
            aria-label={t('copyAddress')}
          >
            <Copy className="size-3.5" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="size-7">
            <a
              href={buildExplorerUrl(publicEnv.NEXT_PUBLIC_CHAIN_ID, 'address', address)}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={t('viewOnExplorer')}
            >
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </>
      ) : null}
    </span>
  )
}
