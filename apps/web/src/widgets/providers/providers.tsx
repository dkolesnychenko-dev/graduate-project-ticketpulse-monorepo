'use client'

import { Toaster } from 'sonner'

import { ApolloProvider } from './apollo-provider'
import { QueryProvider } from './query-provider'
import { ThemeProvider } from './theme-provider'
import { WagmiRainbowKitProvider } from './wagmi-rainbowkit-provider'

/**
 * Root client-side provider stack — wraps the whole app in `<RootLayout>`.
 *
 * Order matters:
 *   1. Theme       — must be outermost so children can read theme on first paint
 *   2. Query       — drives the rest of the data layer
 *   3. Wagmi + RK  — depends on theme for the connect-modal colour scheme
 *   4. Apollo      — the bottom of the stack; nothing depends on it
 *
 * Sonner is mounted here too so toasts work everywhere — including from
 * inside server actions that surface their result on the client.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <WagmiRainbowKitProvider>
          <ApolloProvider>{children}</ApolloProvider>
        </WagmiRainbowKitProvider>
      </QueryProvider>
      <Toaster richColors closeButton position="bottom-right" />
    </ThemeProvider>
  )
}
