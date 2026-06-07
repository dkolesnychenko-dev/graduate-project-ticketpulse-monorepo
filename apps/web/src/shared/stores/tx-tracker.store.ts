import type { Hex } from 'viem'
import { create } from 'zustand'

import { buildExplorerUrl } from '@ticketpulse/sdk/config'

import { publicEnv } from '@/shared/env/public'

export type { TrackedTx, TxStatus } from '@ticketpulse/sdk/types'
import type { TrackedTx, TxStatus } from '@ticketpulse/sdk/types'

interface TxTrackerState {
  byHash: Map<Hex, TrackedTx>
  latestHash: Hex | null

  /** Mark a transaction as "preparing" before the wallet prompt opens. */
  beginPreparing: (id: string, description: string) => void
  /** Promote the placeholder to a real on-chain tx once we have a hash. */
  attachHash: (id: string, hash: Hex) => void
  update: (hash: Hex, patch: Partial<TrackedTx>) => void
  setStatus: (hash: Hex, status: TxStatus) => void
  dismiss: (hash: Hex) => void
  clear: () => void
}

/**
 * Transaction tracker for the global toast/inline status UI (F-0.7).
 *
 * We key by `hash` once known; before the wallet returns a hash we use a
 * caller-supplied UUID stored under `Hex`-shaped sentinel keys so the same
 * record can transition from "awaiting signature" → "pending" without
 * losing its description.
 */
export const useTxTrackerStore = create<TxTrackerState>((set) => ({
  byHash: new Map(),
  latestHash: null,

  beginPreparing: (id, description) =>
    set((s) => {
      const placeholderHash = (`0xpending-${id}` as unknown) as Hex
      const next = new Map(s.byHash)
      const tx: TrackedTx = {
        hash: placeholderHash,
        status: 'awaiting-signature',
        description,
        startedAt: Date.now(),
        explorerUrl: '',
      }
      next.set(placeholderHash, tx)
      return { byHash: next, latestHash: placeholderHash }
    }),

  attachHash: (id, hash) =>
    set((s) => {
      const placeholderHash = (`0xpending-${id}` as unknown) as Hex
      const placeholder = s.byHash.get(placeholderHash)
      if (!placeholder) return s
      const next = new Map(s.byHash)
      next.delete(placeholderHash)
      next.set(hash, {
        ...placeholder,
        hash,
        status: 'pending',
        explorerUrl: buildExplorerUrl(publicEnv.NEXT_PUBLIC_CHAIN_ID, 'tx', hash),
      })
      return { byHash: next, latestHash: hash }
    }),

  update: (hash, patch) =>
    set((s) => {
      const existing = s.byHash.get(hash)
      if (!existing) return s
      const next = new Map(s.byHash)
      next.set(hash, { ...existing, ...patch })
      return { byHash: next, latestHash: hash }
    }),

  setStatus: (hash, status) =>
    set((s) => {
      const existing = s.byHash.get(hash)
      if (!existing) return s
      const next = new Map(s.byHash)
      next.set(hash, {
        ...existing,
        status,
        confirmedAt: status === 'confirmed' ? Date.now() : existing.confirmedAt,
      })
      return { byHash: next, latestHash: hash }
    }),

  dismiss: (hash) =>
    set((s) => {
      const next = new Map(s.byHash)
      next.delete(hash)
      return {
        byHash: next,
        latestHash: s.latestHash === hash ? null : s.latestHash,
      }
    }),

  clear: () => set({ byHash: new Map(), latestHash: null }),
}))
