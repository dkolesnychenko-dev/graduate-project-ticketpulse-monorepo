import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

/**
 * Theme preference. We delegate the actual `data-theme` attribute toggling
 * to `next-themes` (which handles SSR-safe hydration), but mirror the
 * user's preference in Zustand so other parts of the UI can react without
 * touching `next-themes`' provider context.
 *
 * Default is `system` so first-time visitors automatically get the right
 * theme based on `prefers-color-scheme`.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'ticketpulse:theme' },
  ),
)
