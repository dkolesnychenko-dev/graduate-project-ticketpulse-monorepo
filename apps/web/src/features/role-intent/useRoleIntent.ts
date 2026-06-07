'use client'

import { useCallback } from 'react'
import { useAccount } from 'wagmi'

import { useRouter } from '@/shared/i18n/navigation'
import { useRoleIntentStore, type RoleIntent } from '@/shared/stores'

/**
 * F-0.3 — captures the role the user just declared and opens the
 * RainbowKit connect modal. Once connection succeeds, `WalletGuard`
 * routes them to `/events` (buyer) or `/organizer` (organiser) based
 * on the saved intent.
 *
 * The caller passes `openConnectModal` from RainbowKit's render-prop
 * API so we don't import RainbowKit here (keeps the hook server-safe).
 */
export function useRoleIntent() {
  const setIntent = useRoleIntentStore((s) => s.setIntent)
  const router = useRouter()
  const { isConnected } = useAccount()

  const declareIntent = useCallback(
    (
      intent: NonNullable<RoleIntent>,
      openConnectModal: (() => void) | undefined,
    ) => {
      setIntent(intent)
      // Pre-set the post-connect destination so `WalletGuard` doesn't
      // have to guess. If the user is already connected, redirect right
      // away — RainbowKit's modal won't open in that case anyway.
      const targetPath = intent === 'organizer' ? '/organizer' : '/events'
      router.prefetch(targetPath)
      if (isConnected) {
        router.push(targetPath)
      } else if (openConnectModal) {
        openConnectModal()
      }
    },
    [router, setIntent, isConnected],
  )

  return { declareIntent }
}
