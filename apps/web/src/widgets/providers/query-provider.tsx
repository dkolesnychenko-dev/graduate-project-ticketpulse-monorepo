'use client'

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useState } from 'react'

/**
 * Devtools are loaded client-only (`ssr: false`) so they are never
 * bundled into or required from the server-side render chunk —
 * which would cause a MODULE_NOT_FOUND prerender error.
 */
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
  { ssr: false },
)

/**
 * TanStack Query client.
 *
 * Why a factory + per-render memo: in Next.js App Router, modules can
 * be evaluated multiple times across SSR. Sharing a single client
 * leaks state between users. We:
 *   • build a fresh client on the server every render (cheap),
 *   • cache one on the client across renders (`useState` init).
 *
 * Defaults align with NFR-PERF-006 (60 s freshness for subgraph data,
 * matching the Edge cache window).
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => getQueryClient())
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV !== 'production' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  )
}
