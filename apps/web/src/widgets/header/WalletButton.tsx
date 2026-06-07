'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { truncateAddress } from '@ticketpulse/sdk/formatting'

import { Button } from '@/shared/ui'

/**
 * Custom-styled wallet connect button — matches the rest of the header
 * instead of dropping RainbowKit's default gradient pill.
 *
 * Behaviour parity with RainbowKit's stock button:
 *   • Disconnected           → "Connect wallet"
 *   • Wrong chain            → "Wrong network" (opens chain modal)
 *   • Connected + right chain→ Truncated address (opens account modal)
 */
export function WalletButton() {
  const t = useTranslations('common')
  const tWallet = useTranslations('wallet.wrongNetwork')

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            aria-hidden={!ready}
            style={!ready ? { opacity: 0, pointerEvents: 'none', userSelect: 'none' } : undefined}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button variant="brand" size="sm" onClick={openConnectModal}>
                    <Wallet className="size-4" />
                    {t('connectWallet')}
                  </Button>
                )
              }
              if (chain.unsupported) {
                return (
                  <Button variant="destructive" size="sm" onClick={openChainModal}>
                    {tWallet('title')}
                  </Button>
                )
              }
              return (
                <Button variant="outline" size="sm" onClick={openAccountModal} data-numeric>
                  <Wallet className="size-4" />
                  {truncateAddress(account.address)}
                </Button>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
