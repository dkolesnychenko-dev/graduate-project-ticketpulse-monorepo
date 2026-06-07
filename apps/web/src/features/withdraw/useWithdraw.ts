'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useChainId, useWriteContract } from 'wagmi'
import type { Address, Hex } from 'viem'

import { ticketPulseEventAbi } from '@ticketpulse/sdk/contracts'

import { useTxTracker } from '@/features/transaction-tracker'

type WithdrawAction = 'primary' | 'royalty' | 'all-organizer' | 'seller'

const FN_BY_ACTION = {
  primary: 'withdrawPrimarySales',
  royalty: 'withdrawRoyalties',
  'all-organizer': 'withdrawAllOrganizer',
  seller: 'withdrawSellerBalance',
} as const satisfies Record<WithdrawAction, string>

const DESC_KEY_BY_ACTION = {
  primary: 'withdrawPrimary',
  royalty: 'withdrawRoyalty',
  'all-organizer': 'withdrawAllOrganizer',
  seller: 'withdrawSeller',
} as const satisfies Record<WithdrawAction, string>

/**
 * F-4 + F-22 — pull-pattern withdrawals.
 *
 * One hook covers all four buttons because they share the same wagmi
 * setup. Caller decides which method to call; we just label the tracker
 * accordingly so the toast description reads naturally in any locale.
 */
export function useWithdraw(eventContract: Address) {
  const trackerId = useId()
  const tracker = useTxTracker()
  const t = useTranslations('tx.descriptions')
  const chainId = useChainId()
  const { writeContractAsync } = useWriteContract()
  const [activeAction, setActiveAction] = useState<WithdrawAction | null>(null)

  const withdraw = async (action: WithdrawAction): Promise<Hex> => {
    try {
      setActiveAction(action)
      tracker.start(trackerId, t(DESC_KEY_BY_ACTION[action]))
      const hash = await writeContractAsync({
        chainId,
        address: eventContract,
        abi: ticketPulseEventAbi,
        functionName: FN_BY_ACTION[action],
        args: [],
      })
      tracker.captureHash(trackerId, hash)
      return hash
    } finally {
      setActiveAction(null)
    }
  }

  return { withdraw, activeAction }
}
