import { base, baseSepolia, foundry } from 'viem/chains'
import type { Chain } from 'viem'

/**
 * Supported chains. The active chain is selected at runtime via
 * `NEXT_PUBLIC_CHAIN_ID` — see `env.ts`.
 *
 *   • Base Mainnet (8453)    — production target.
 *   • Base Sepolia (84532)   — staging / thesis demo target.
 *   • Foundry / Anvil (31337) — local development chain. Matches the
 *     default `anvil` chain id so contracts deployed via
 *     `pnpm --filter @ticketpulse/contracts run deploy:local` are
 *     reachable from the dev server without any extra configuration.
 */
export const supportedChains = [base, baseSepolia, foundry] as const

export type SupportedChainId = (typeof supportedChains)[number]['id']

export function chainById(id: number): Chain | undefined {
  return supportedChains.find((c) => c.id === id)
}

export function isSupportedChainId(id: number): id is SupportedChainId {
  return supportedChains.some((c) => c.id === id)
}

/** `true` when the chain id corresponds to a local development node (Anvil / Hardhat). */
export function isLocalChainId(id: number): boolean {
  return id === foundry.id
}

/**
 * Build the Basescan explorer URL for a given chain + tx hash / address.
 *
 *   • Base Mainnet  → https://basescan.org
 *   • Base Sepolia  → https://sepolia.basescan.org
 *   • Foundry local → null (caller should hide the explorer link)
 */
export function buildExplorerUrl(
  chainId: number,
  kind: 'tx' | 'address' | 'token',
  value: string,
): string {
  if (isLocalChainId(chainId)) {
    // No public explorer for a local Anvil node. Returning a relative
    // path keeps `<a>` valid; callers that care can hide the link via
    // `isLocalChainId` before rendering.
    return `#${kind}-${value}`
  }
  const chain = chainById(chainId)
  const base = chain?.blockExplorers?.default.url ?? 'https://basescan.org'
  return `${base.replace(/\/+$/, '')}/${kind}/${value}`
}
