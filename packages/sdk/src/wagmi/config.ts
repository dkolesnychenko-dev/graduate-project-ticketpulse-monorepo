import { createConfig, http, type Config, type CreateConfigParameters } from 'wagmi'
import type { Chain, Transport } from 'viem'

import { supportedChains } from '../config/chains'

export interface WagmiConfigOptions {
  /**
   * Override the default RPC transport per chain. By default we use
   * `http()` which falls back to the public RPC URL bundled in viem's
   * chain definitions — fine for read-only flows because wagmi will
   * route writes through the user's wallet provider anyway.
   *
   * Pass a `transports` map (e.g. with an Alchemy RPC) when you need
   * higher rate limits on the server side (Edge routes, RSC).
   */
  transports?: CreateConfigParameters['transports']

  /**
   * SSR support — set to `true` when building for Next.js so that wagmi
   * uses cookie-based storage that's safe to render on the server.
   */
  ssr?: boolean

  /**
   * Connectors are intentionally not part of the SDK — RainbowKit's
   * `getDefaultConfig` injects them, and we want to keep the SDK
   * React-free. Pass them through if you build wagmi yourself.
   */
  connectors?: CreateConfigParameters['connectors']
}

/**
 * Build a wagmi `Config` configured with the chains we support.
 *
 * In `apps/web`, prefer `RainbowKit.getDefaultConfig({...})` directly —
 * it already wraps `createConfig` and adds wallet connectors. This
 * factory is here for non-React consumers (e.g. tests, scripts, future
 * mobile/validator app) that need the bare wagmi config.
 */
export function createWagmiConfig(options: WagmiConfigOptions = {}): Config {
  const chains = supportedChains as readonly [Chain, ...Chain[]]

  const transports: Record<number, Transport> =
    options.transports ??
    Object.fromEntries(chains.map((c) => [c.id, http()] as const))

  return createConfig({
    chains,
    transports,
    ssr: options.ssr ?? true,
    connectors: options.connectors,
  })
}
