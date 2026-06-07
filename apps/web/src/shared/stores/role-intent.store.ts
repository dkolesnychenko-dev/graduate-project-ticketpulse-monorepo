import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * F-0.3 — captured *before* the wallet modal opens.
 *
 *   • `organizer` → user clicked "Create an event" / "Become an organiser"
 *   • `buyer`     → user clicked "Find tickets"
 *
 * Used by `WalletGuard` to redirect to the right surface after the
 * connection completes (organiser dashboard vs marketplace).
 */
export type RoleIntent = 'organizer' | 'buyer' | null

interface RoleIntentState {
  intent: RoleIntent
  setIntent: (intent: RoleIntent) => void
  clearIntent: () => void
}

export const useRoleIntentStore = create<RoleIntentState>()(
  persist(
    (set) => ({
      intent: null,
      setIntent: (intent) => set({ intent }),
      clearIntent: () => set({ intent: null }),
    }),
    { name: 'ticketpulse:role-intent', version: 1 },
  ),
)
