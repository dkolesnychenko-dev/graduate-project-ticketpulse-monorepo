'use client'

import { useDisconnect } from 'wagmi'
import { useAccount } from 'wagmi'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { truncateAddress } from '@ticketpulse/sdk/formatting'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'

/**
 * Account-mismatch dialog (F-0.6 step 1).
 *
 * Triggered when the wallet's active account changes mid-session
 * (`accountsChanged`). We keep a snapshot of the address the user
 * signed in with and pop a modal if it diverges. The user can:
 *
 *   • "Switch wallet back" — only the user can do this from the wallet
 *     UI; the dialog just informs them what to press.
 *   • "Sign in with new account" — disconnect, reload, let RainbowKit
 *     re-authenticate against the new address.
 */
export function AccountMismatchGuard() {
  const t = useTranslations('wallet.accountMismatch')
  const tCommon = useTranslations('common')
  const { address, isConnected } = useAccount()
  const { disconnectAsync } = useDisconnect()

  // First address we saw — used as the "expected" identity.
  const expectedRef = useRef<string | null>(null)
  const [mismatchOpen, setMismatchOpen] = useState(false)

  useEffect(() => {
    if (!isConnected || !address) return
    if (!expectedRef.current) {
      expectedRef.current = address
      return
    }
    if (expectedRef.current !== address) {
      setMismatchOpen(true)
    }
  }, [address, isConnected])

  if (!expectedRef.current || !address) return null

  return (
    <Dialog open={mismatchOpen}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', {
              expected: truncateAddress(expectedRef.current),
              actual: truncateAddress(address),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setMismatchOpen(false)}
          >
            {t('switchBack')}
          </Button>
          <Button
            variant="brand"
            onClick={async () => {
              await disconnectAsync()
              setMismatchOpen(false)
              expectedRef.current = null
              window.location.reload()
            }}
          >
            {t('loginAgain')}
          </Button>
        </DialogFooter>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {tCommon('viewOnExplorer')}
        </p>
      </DialogContent>
    </Dialog>
  )
}
