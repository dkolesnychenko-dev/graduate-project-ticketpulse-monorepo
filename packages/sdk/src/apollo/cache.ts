import type { TypePolicies } from '@apollo/client'

/**
 * Type policies for Apollo's `InMemoryCache`.
 *
 * Why we need custom merge logic:
 *   • The Subgraph paginates lists by appending — the default merge
 *     replaces, which makes cursor "load more" lose previously-fetched rows.
 *   • Several lists share identity by `id` (e.g. `events`), so we set
 *     `keyArgs: ['where', 'orderBy', 'orderDirection']` to fork the cache
 *     by filter so different views don't trample each other.
 */
export function buildTypePolicies(): TypePolicies {
  return {
    Query: {
      fields: {
        events: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing: unknown[] | undefined, incoming: unknown[]) {
            return [...(existing ?? []), ...incoming]
          },
        },
        tickets: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing: unknown[] | undefined, incoming: unknown[]) {
            return [...(existing ?? []), ...incoming]
          },
        },
        buyOrders: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing: unknown[] | undefined, incoming: unknown[]) {
            return [...(existing ?? []), ...incoming]
          },
        },
        sellOrders: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing: unknown[] | undefined, incoming: unknown[]) {
            return [...(existing ?? []), ...incoming]
          },
        },
        activityLogs: {
          keyArgs: ['where', 'orderBy', 'orderDirection'],
          merge(existing: unknown[] | undefined, incoming: unknown[]) {
            return [...(existing ?? []), ...incoming]
          },
        },
      },
    },
    // Subgraph entities all key off `id`. Keep this explicit so the cache
    // normalises across queries without surprises.
    User: { keyFields: ['id'] },
    Event: { keyFields: ['id'] },
    Ticket: { keyFields: ['id'] },
    SellOrder: { keyFields: ['id'] },
    BuyOrder: { keyFields: ['id'] },
    Balance: { keyFields: ['id'] },
    ActivityLog: { keyFields: ['id'] },
  }
}
