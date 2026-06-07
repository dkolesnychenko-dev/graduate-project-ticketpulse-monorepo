'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useChainId, useWriteContract } from 'wagmi'
import type { Address, Hex } from 'viem'

import { ticketPulseEventAbi } from '@ticketpulse/sdk/contracts'

import { useTxTracker } from '@/features/transaction-tracker'

/**
 * Two-button feature backing F-14 (list for sale) and F-16 (cancel
 * listing). Kept in one hook because they share the same wagmi config.
 */
export function useSellTicket(eventContract: Address) {
  const trackerId = useId()
  const tracker = useTxTracker()
  const t = useTranslations('tx.descriptions')
  const chainId = useChainId()
  const { writeContractAsync } = useWriteContract()
  const [pendingAction, setPendingAction] = useState<'list' | 'cancel' | null>(null)

  const listForSale = async (tokenId: number) => {
    try {
      setPendingAction('list')
      tracker.start(trackerId, t('listForSale', { tokenId }))
      const hash = await writeContractAsync({
        chainId,
        address: eventContract,
        abi: ticketPulseEventAbi,
        functionName: 'listForSale',
        args: [BigInt(tokenId)],
      })
      tracker.captureHash(trackerId, hash)
      return hash as Hex
    } finally {
      setPendingAction(null)
    }
  }

  const cancelSellOrder = async (tokenId: number) => {
    try {
      setPendingAction('cancel')
      tracker.start(trackerId, t('cancelSell', { tokenId }))
      const hash = await writeContractAsync({
        chainId,
        address: eventContract,
        abi: ticketPulseEventAbi,
        functionName: 'cancelSellOrder',
        args: [BigInt(tokenId)],
      })
      tracker.captureHash(trackerId, hash)
      return hash as Hex
    } finally {
      setPendingAction(null)
    }
  }

  return { listForSale, cancelSellOrder, pendingAction }
}
