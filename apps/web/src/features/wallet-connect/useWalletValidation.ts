'use client'

import { useEffect, useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'

import { publicEnv } from '@/shared/env/public'

export interface WalletValidation {
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  /** `true` when the connected wallet is on the chain we target. */
  isOnExpectedChain: boolean
  /** `null` until the wallet finishes hydrating; helps avoid flicker. */
  expectedChainId: number
  actualChainId: number | undefined
  /** Triggers the wallet's "switch chain" UI. */
  requestSwitch: () => void
  isSwitching: boolean
  /** True when wagmi has tried to auto-reconnect — debounces redirect logic. */
  isHydrated: boolean
}

/**
 * Bundles the F-0.6 validation logic into a single hook.
 *
 *   • Tells callers whether to render the protected UI, the ConnectFlow,
 *     or the NetworkCheck dialog.
 *   • Exposes a one-shot `requestSwitch()` so the dialog doesn't have to
 *     wire up `useSwitchChain` itself.
 *
 * The `isHydrated` flag matters because wagmi reconnects asynchronously
 * after the first paint — without it, every protected route briefly
 * shows "connect wallet" before the persisted session restores, which
 * looks broken.
 */
export function useWalletValidation(): WalletValidation {
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const actualChainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const expectedChainId = publicEnv.NEXT_PUBLIC_CHAIN_ID

  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    if (!isReconnecting) setIsHydrated(true)
  }, [isReconnecting])

  return {
    isConnected,
    isConnecting,
    isReconnecting,
    isOnExpectedChain: actualChainId === expectedChainId,
    expectedChainId,
    actualChainId,
    requestSwitch: () => switchChain({ chainId: expectedChainId }),
    isSwitching,
    isHydrated,
  }
}
