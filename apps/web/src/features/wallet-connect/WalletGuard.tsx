'use client'

import { useEffect } from 'react'

import { usePathname, useRouter } from '@/shared/i18n/navigation'
import { useRoleIntentStore, useWalletIntentStore } from '@/shared/stores'

import { ConnectFlow } from './ConnectFlow'
import { NetworkCheck } from './NetworkCheck'
import { useWalletValidation } from './useWalletValidation'

/**
 * Gate the entire `(app)` route group on wallet connection (F-0.4).
 *
 * Flow:
 *   1. While wagmi hydrates the persisted session we render nothing —
 *      `Suspense`-friendly null avoids flashing the connect screen.
 *   2. If still not connected, stash the current path in `wallet-intent`
 *      (so post-connect we can route back) and show ConnectFlow.
 *   3. Once connected, render children. NetworkCheck overlays a modal
 *      if the chain is wrong; the rest of the UI stays responsive.
 *
 * NOTE: The role-intent store still gets cleared after a
 * fresh connection because intent only matters for the very first
 * landing → connect flow.
 */
export function WalletGuard({ children }: { children: React.ReactNode }) {
  const validation = useWalletValidation()
  const pathname = usePathname()
  const router = useRouter()

  const setTargetPath = useWalletIntentStore((s) => s.setTargetPath)
  const consumeTargetPath = useWalletIntentStore((s) => s.consumeTargetPath)
  const clearIntent = useRoleIntentStore((s) => s.clearIntent)

  // Capture target path when the guard kicks in so the post-connect
  // redirect lands where the user wanted to go.
  useEffect(() => {
    if (!validation.isConnected && validation.isHydrated) {
      setTargetPath(pathname)
    }
  }, [validation.isConnected, validation.isHydrated, pathname, setTargetPath])

  // Once connected, follow the stored intent (if any) and clear the
  // role-intent — F-0.4 step 5 already happened by that point.
  useEffect(() => {
    if (validation.isConnected && validation.isHydrated) {
      const target = consumeTargetPath()
      if (target && target !== pathname) {
        router.replace(target)
      }
      clearIntent()
    }
    // We deliberately exclude `pathname` from deps — re-running on every
    // navigation would consume the target and break router redirects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validation.isConnected, validation.isHydrated])

  if (!validation.isHydrated) return null
  if (!validation.isConnected) return <ConnectFlow />

  return (
    <>
      <NetworkCheck />
      {children}
    </>
  )
}
