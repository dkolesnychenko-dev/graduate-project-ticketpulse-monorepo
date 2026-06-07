import type { Chain } from 'viem'

import { chainById, supportedChains, type SupportedChainId } from '../config/chains'

/**
 * Select the active chain by id, with a strongly-typed fallback to the first
 * supported chain. Throws if the id is invalid so misconfigurations surface
 * during boot rather than mid-transaction.
 */
export function selectActiveChain(chainId: number): Chain {
  const chain = chainById(chainId)
  if (!chain) {
    const ids = supportedChains.map((c) => c.id).join(', ')
    throw new Error(
      `[@ticketpulse/sdk] Unknown chain id ${chainId}. Supported: ${ids}.`,
    )
  }
  return chain
}

export type { SupportedChainId }
