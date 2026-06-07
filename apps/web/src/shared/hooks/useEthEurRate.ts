'use client'

import { useQuery } from '@tanstack/react-query'

interface EthEurRate {
  rate: number
  updatedAt: number
  decimals: number
}

/**
 * Client-side hook fetching the cached ETH/EUR rate from our Edge API.
 *
 * We deliberately don't call Chainlink directly here — the user's wallet
 * RPC could (in theory) be used, but Wagmi's auto-resolution adds latency
 * and reveals our chain choices to the wallet provider. The Edge route
 * is cached for 60 s, so 100 simultaneous users hit the underlying RPC
 * exactly once per minute (NFR-PERF-006 / NFR-PERF-007).
 */
export function useEthEurRate() {
  return useQuery<EthEurRate>({
    queryKey: ['chainlink', 'eth-eur'],
    queryFn: async () => {
      const res = await fetch('/api/chainlink', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Chainlink proxy returned HTTP ${res.status}`)
      }
      return (await res.json()) as EthEurRate
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  })
}
