'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useAccount, useChainId, useSignTypedData, useWriteContract } from 'wagmi'
import type { Address, Hex } from 'viem'

import { ticketPulseEventAbi } from '@ticketpulse/sdk/contracts'
import {
  buildIdentityBindingTypedData,
  hashIdentitySignature,
  saveIdentityArtifact,
} from '@ticketpulse/sdk/identity'

import { useTxTracker } from '@/features/transaction-tracker'

import type { TicketPersonalization } from '../mint-tickets/schema'

/**
 * F-18 (placeBuyOrder) + F-20 (cancelBuyOrder).
 *
 * `placeBuyOrder` signs an EIP-712 identity binding (so the eventual
 * winner can produce a QR with the same hash discipline as a primary
 * mint) and locks `secondaryMarketPrice` ETH on the contract.
 */
export function useBuyOrder(eventContract: Address) {
  const trackerId = useId()
  const tracker = useTxTracker()
  const t = useTranslations('tx.descriptions')
  const chainId = useChainId()
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync } = useWriteContract()
  const [pendingAction, setPendingAction] = useState<'place' | 'cancel' | null>(null)

  const placeBuyOrder = async (args: {
    secondaryPriceWei: bigint
    eventTitle: string
    personalisation: TicketPersonalization
  }): Promise<Hex> => {
    if (!address) throw new Error('Wallet not connected')

    try {
      setPendingAction('place')
      tracker.start(trackerId, t('joinBuyQueue', { title: args.eventTitle }))

      const typed = buildIdentityBindingTypedData({
        chainId,
        eventContract,
        message: {
          eventName: args.eventTitle,
          ownerFirstName: args.personalisation.ownerFirstName,
          ownerLastName: args.personalisation.ownerLastName,
        },
      })
      const signature = await signTypedDataAsync({
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: typed.message,
      })
      const signatureHash = hashIdentitySignature(signature)

      // Save the artifact under a sentinel tokenId; once the order
      // matches and the Subgraph reports the actual id, the tickets
      // page can re-key the artifact.
      saveIdentityArtifact({
        schemaVersion: 1,
        walletAddress: address,
        eventContract,
        tokenId: -1,
        chainId,
        eventName: args.eventTitle,
        ownerFirstName: args.personalisation.ownerFirstName,
        ownerLastName: args.personalisation.ownerLastName,
        signature,
        signatureHash,
        createdAt: Math.floor(Date.now() / 1000),
      })

      const hash = await writeContractAsync({
        chainId,
        address: eventContract,
        abi: ticketPulseEventAbi,
        functionName: 'placeBuyOrder',
        args: [signatureHash],
        value: args.secondaryPriceWei,
      })
      tracker.captureHash(trackerId, hash)
      return hash
    } finally {
      setPendingAction(null)
    }
  }

  const cancelBuyOrder = async (): Promise<Hex> => {
    try {
      setPendingAction('cancel')
      tracker.start(trackerId, t('cancelBuyOrder'))
      const hash = await writeContractAsync({
        chainId,
        address: eventContract,
        abi: ticketPulseEventAbi,
        functionName: 'cancelBuyOrder',
        args: [],
      })
      tracker.captureHash(trackerId, hash)
      return hash
    } finally {
      setPendingAction(null)
    }
  }

  return { placeBuyOrder, cancelBuyOrder, pendingAction }
}
