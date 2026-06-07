'use client'

import { ApolloProvider as Provider } from '@apollo/client'
import { useMemo } from 'react'

import { createApolloClient } from '@ticketpulse/sdk/apollo'

/**
 * Client-side Apollo provider.
 *
 *   • Endpoint is always `/api/graphql` — keeping the Graph key off the
 *     bundle (NFR-SEC-002).
 *   • Memoised so re-renders don't tear down the in-memory cache.
 *   • Server Components do NOT use this — they call `createApolloClient`
 *     directly with the upstream Subgraph URL so RSC fetches go straight
 *     to The Graph without an extra hop through our own Edge proxy.
 */
export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(
    () =>
      createApolloClient({
        uri: '/api/graphql',
      }),
    [],
  )

  return <Provider client={client}>{children}</Provider>
}
