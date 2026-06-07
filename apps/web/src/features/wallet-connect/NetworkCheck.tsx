'use client'

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { chainById } from '@ticketpulse/sdk/config'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'

import { useWalletValidation } from './useWalletValidation'

/**
 * Network-mismatch dialog (F-0.6 step 2).
 *
 *   • Opens automatically whenever the user is connected but on the wrong chain.
 *   • Calls wagmi's `switchChain` — which itself triggers the user's wallet
 *     UI; we never silently send transactions.
 *   • Stays open until the chain matches OR the user disconnects.
 *
 * The dialog cannot be closed by clicking outside — switching networks is
 * an explicit decision and a stray click should not bypass it.
 */
export function NetworkCheck() {
  const t = useTranslations('wallet.wrongNetwork')
  const tCommon = useTranslations('common')
  const validation = useWalletValidation()

  const open =
    validation.isConnected && validation.isHydrated && !validation.isOnExpectedChain

  const expectedChainName =
    chainById(validation.expectedChainId)?.name ?? `chain ${validation.expectedChainId}`

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { chainName: expectedChainName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="brand"
            onClick={validation.requestSwitch}
            disabled={validation.isSwitching}
          >
            {validation.isSwitching
              ? tCommon('loading')
              : t('cta', { chainName: expectedChainName })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
