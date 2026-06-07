'use client'

import { QrCode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { Address } from 'viem'

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui'

import { QrCodeView } from './QrCodeView'

interface QrCodeDialogProps {
  eventContract: Address
  tokenId: number
  ownerName?: string
  /** Optional override for the trigger button label. */
  triggerLabel?: string
}

export function QrCodeDialog({
  eventContract,
  tokenId,
  ownerName,
  triggerLabel,
}: QrCodeDialogProps) {
  const t = useTranslations('qr')
  const tTickets = useTranslations('tickets.card')
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <QrCode className="size-4" />
          {triggerLabel ?? tTickets('showEntryQr')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
        </DialogHeader>
        <QrCodeView eventContract={eventContract} tokenId={tokenId} ownerName={ownerName} />
      </DialogContent>
    </Dialog>
  )
}
