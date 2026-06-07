'use client'

import { useCallback } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import type { Hex } from 'viem'

import { decodeContractError } from '@ticketpulse/sdk/errors'

import { useContractErrorMessage } from '@/shared/hooks/useContractErrorMessage'
import { useTxTrackerStore } from '@/shared/stores'

/**
 * Wallet-agnostic helper that drives the global transaction toast.
 *
 *   • `start()` registers a placeholder before the wallet prompt opens.
 *   • `captureHash()` swaps the placeholder for the real hash.
 *   • `fail()` decodes contract reverts into localized UX copy via
 *     `useContractErrorMessage` (which delegates to the active locale).
 *
 * The wait-for-receipt subscription is exposed separately via
 * `useTxReceipt(hash)` so callers can co-locate it with the form that
 * issued the transaction.
 */
export function useTxTracker() {
  const beginPreparing = useTxTrackerStore((s) => s.beginPreparing)
  const attachHash = useTxTrackerStore((s) => s.attachHash)
  const setStatus = useTxTrackerStore((s) => s.setStatus)
  const update = useTxTrackerStore((s) => s.update)
  const resolveErrorMessage = useContractErrorMessage()

  const start = useCallback(
    (id: string, description: string) => {
      beginPreparing(id, description)
    },
    [beginPreparing],
  )

  const captureHash = useCallback(
    (id: string, hash: Hex) => {
      attachHash(id, hash)
    },
    [attachHash],
  )

  const fail = useCallback(
    (hash: Hex, error: unknown) => {
      const decoded = decodeContractError(error)
      const message = resolveErrorMessage(decoded)
      update(hash, {
        status: 'failed',
        error: {
          name: decoded.name ?? undefined,
          message: `${message.title} — ${message.description}`,
        },
      })
    },
    [resolveErrorMessage, update],
  )

  return { start, captureHash, setStatus, fail }
}

/**
 * Subscribe to a single transaction's confirmation. Keeps the store in
 * sync so the toast can flip from "pending" → "confirmed/failed" without
 * any extra wiring in the call site.
 */
export function useTxReceipt(hash: Hex | undefined) {
  const setStatus = useTxTrackerStore((s) => s.setStatus)
  const result = useWaitForTransactionReceipt({ hash })

  if (hash && result.isSuccess) {
    setStatus(hash, 'confirmed')
  } else if (hash && result.isError) {
    setStatus(hash, 'failed')
  }
  return result
}
