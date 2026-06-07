'use client'

import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit'
import { useMemo, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useLocale } from 'next-intl'
import {
  http,
  WagmiProvider,
  cookieStorage,
  createStorage,
  type Config,
} from 'wagmi'

import { isLocalChainId } from '@ticketpulse/sdk/config'
import { selectActiveChain } from '@ticketpulse/sdk/wagmi'

import { publicEnv } from '@/shared/env/public'

import '@rainbow-me/rainbowkit/styles.css'

/**
 * Wagmi + RainbowKit boot.
 *
 *   • `getDefaultConfig` bundles the recommended connectors (MetaMask,
 *     WalletConnect, Coinbase Wallet, Rainbow, etc.) — the lineup called
 *     out in F-0.4.
 *   • `cookieStorage` lets SSR restore the connection from a same-origin
 *     cookie without flicker.
 *   • For local Anvil dev we pin the HTTP transport to `localhost:8545`
 *     so wagmi doesn't fall back to the public RPC list (which has no
 *     entry for chain 31337).
 *
 * Theme handoff: `next-themes` exposes the resolved theme via `useTheme`,
 * we feed it into RainbowKit so the modal blends with the rest of the UI.
 */

const activeChain = selectActiveChain(publicEnv.NEXT_PUBLIC_CHAIN_ID)

const wagmiConfig: Config = getDefaultConfig({
  appName: 'TicketPulse',
  projectId: publicEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [activeChain] as never,
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: isLocalChainId(activeChain.id)
    ? { [activeChain.id]: http('http://127.0.0.1:8545') }
    : { [activeChain.id]: http() },
})

export function getWagmiConfig(): Config {
  return wagmiConfig
}

export function WagmiRainbowKitProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = useLocale()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const rainbowTheme = useMemo(
    () => (resolvedTheme === 'dark' ? darkTheme() : lightTheme()),
    [resolvedTheme],
  )

  const initialTheme = useMemo(() => lightTheme(), [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        theme={mounted ? rainbowTheme : initialTheme}
        modalSize="wide"
        locale={locale as Parameters<typeof RainbowKitProvider>[0]['locale']}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  )
}
