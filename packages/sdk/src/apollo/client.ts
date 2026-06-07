import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client'
import type { ApolloClientOptions as ApolloOptions } from '@apollo/client'

import { buildTypePolicies } from './cache'

export interface ApolloClientOptions {
  /**
   * Endpoint URL. Two distinct values are expected:
   *
   *   • Server-side (RSC, Edge):  the raw subgraph endpoint, optionally
   *     authenticated via `Authorization: Bearer …`. Safe because the
   *     credentials never reach the browser.
   *
   *   • Client-side:  a same-origin proxy (e.g. `/api/graphql`) that adds
   *     the auth header server-side. This keeps the Graph API key off the
   *     bundle.
   */
  uri: string

  /** Optional fetch override — useful for Next.js RSC `revalidate` tags. */
  fetch?: typeof fetch

  /** Headers to attach on every request (e.g. `Authorization`). */
  headers?: Record<string, string>

  /**
   * When `true`, disables Apollo's "ROOT_QUERY" cache (no normalisation,
   * single-request render). Use in RSC where we want a fresh client per
   * request that doesn't leak across users.
   */
  ssrMode?: boolean

  /** Connect-to-DevTools toggle. Defaults to `process.env.NODE_ENV !== 'production'`. */
  connectToDevTools?: boolean

  /** Extra Apollo options for advanced overrides. */
  extra?: Partial<ApolloOptions<unknown>>
}

/**
 * Build a fresh `ApolloClient`. Designed to be called multiple times —
 * RSC requires a per-request client to avoid cache leakage between users.
 *
 * Client components should call this once at the providers boundary and
 * memoise the result.
 */
export function createApolloClient(
  options: ApolloClientOptions,
): ApolloClient<unknown> {
  const httpLink = new HttpLink({
    uri: options.uri,
    fetch: options.fetch,
    headers: options.headers,
  })

  const cache = new InMemoryCache({
    typePolicies: buildTypePolicies(),
  })

  return new ApolloClient({
    link: from([httpLink]),
    cache,
    ssrMode: options.ssrMode ?? false,
    devtools: {
      enabled:
        options.connectToDevTools ??
        (typeof process !== 'undefined' &&
          process.env?.['NODE_ENV'] !== 'production'),
    },
    defaultOptions: {
      // RSC pre-renders should not cache (each user gets a fresh client),
      // but the InMemoryCache still helps client-side dedup.
      watchQuery: { fetchPolicy: 'cache-and-network' },
      query: { fetchPolicy: 'cache-first' },
    },
    ...options.extra,
  })
}
