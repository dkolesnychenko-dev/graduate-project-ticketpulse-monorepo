import { create } from 'zustand'

interface UiState {
  isSidebarOpen: boolean
  isWalletDialogOpen: boolean
  globalSearch: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setWalletDialogOpen: (open: boolean) => void
  setGlobalSearch: (q: string) => void
}

/**
 * Ephemeral UI state — sidebar toggles, modal flags, navbar search input.
 * Deliberately NOT persisted: it would be jarring to restore a stale
 * search query across sessions.
 */
export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  isWalletDialogOpen: false,
  globalSearch: '',
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setWalletDialogOpen: (isWalletDialogOpen) => set({ isWalletDialogOpen }),
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
}))
