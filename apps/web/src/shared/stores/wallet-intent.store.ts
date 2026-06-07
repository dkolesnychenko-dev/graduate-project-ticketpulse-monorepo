import { create } from 'zustand'

interface WalletIntentState {
  /** Path the user was trying to visit when WalletGuard intercepted them. */
  targetPath: string | null
  setTargetPath: (path: string | null) => void
  consumeTargetPath: () => string | null
}

/**
 * Where to bounce the user after they finish connecting their wallet.
 *
 * Lives in memory only — persisting it would let stale redirect targets
 * survive across days, which is more confusing than helpful.
 */
export const useWalletIntentStore = create<WalletIntentState>((set, get) => ({
  targetPath: null,
  setTargetPath: (targetPath) => set({ targetPath }),
  consumeTargetPath: () => {
    const path = get().targetPath
    set({ targetPath: null })
    return path
  },
}))
