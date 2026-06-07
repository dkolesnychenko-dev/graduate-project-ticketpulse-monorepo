import { createPublicClient, http, parseAbi, type Address, type PublicClient } from 'viem'

import { chainById, type SupportedChainId } from '../config/chains'

/**
 * Chainlink ETH/EUR price feed reader.
 *
 * Why we only ship EUR (and not USD): per project decision, the only fiat
 * surfaced to users is EUR. Both Light- and Dark-theme UIs reuse this same
 * rate to render `formatDualPrice()`.
 *
 * Caching strategy (deployed via Next.js Edge):
 *   • Chainlink updates ETH/EUR roughly every minute.
 *   • Edge route caches the rate for 60 s with `Cache-Control: s-maxage=60`.
 *   • RSCs that need the rate at render time can pass it down as a prop —
 *     a list page sends "the rate that was current when this render ran"
 *     so all prices align (NFR-PERF stability of UI).
 */

/** Minimal Chainlink AggregatorV3 ABI — only the parts we need. */
const aggregatorV3Abi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
])

/**
 * Per-chain default ETH/EUR feed addresses.
 *
 * Base Mainnet (8453):  0xc91D...    — Chainlink ETH/EUR
 * Base Sepolia (84532): no public ETH/EUR aggregator yet — we fall back
 *   to ETH/USD * USD/EUR mock in the UI, or accept a per-env override.
 *
 * Replace the addresses below with the live ones from
 * https://docs.chain.link/data-feeds/price-feeds/addresses when deploying.
 * Leaving placeholder zeros so misconfiguration is loud (RPC will revert).
 */
export const ETH_EUR_FEED_DEFAULTS: Record<SupportedChainId, Address | null> = {
  // Base Mainnet — paste the live ETH/EUR aggregator from
  // https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1
  // before going to production. Leaving the zero address surfaces a clear
  // RPC revert if someone forgets to set NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED.
  8453: '0x0000000000000000000000000000000000000000',
  // Base Sepolia has no canonical ETH/EUR feed at the time of writing —
  // production callers should set `NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED` or
  // use the server-side mock (MOCK_CHAINLINK_EUR_RATE) for tests.
  84532: null,
  // Foundry / Anvil — no Chainlink contracts on a local chain. The web
  // app's `/api/chainlink` route uses `MOCK_CHAINLINK_EUR_RATE` instead,
  // so `readEthEurRate` is never invoked for `31337` in practice.
  31337: null,
}

export interface EthEurRateResult {
  /** Price of 1 ETH in EUR (e.g. 2784.32). */
  rate: number
  /** Unix seconds when Chainlink last updated this round. */
  updatedAt: number
  /** Decimals used by the aggregator — included for audit / debugging. */
  decimals: number
}

export interface ReadEthEurRateArgs {
  chainId: SupportedChainId
  /** Authenticated RPC URL — required for server-side reads. */
  rpcUrl: string
  /** Override the default feed address (e.g. inject a custom proxy in tests). */
  feedAddress?: Address
  /** Optionally pass an existing viem client to reuse connection pooling. */
  client?: PublicClient
}

export async function readEthEurRate(
  args: ReadEthEurRateArgs,
): Promise<EthEurRateResult> {
  const feed = args.feedAddress ?? ETH_EUR_FEED_DEFAULTS[args.chainId]
  if (!feed) {
    throw new Error(
      `[chainlink] No ETH/EUR feed configured for chain ${args.chainId}. ` +
        `Pass \`feedAddress\` explicitly or set NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED.`,
    )
  }

  const chain = chainById(args.chainId)
  const client =
    args.client ??
    createPublicClient({
      chain,
      transport: http(args.rpcUrl),
    })

  const [latestRound, decimals] = await Promise.all([
    client.readContract({
      address: feed,
      abi: aggregatorV3Abi,
      functionName: 'latestRoundData',
    }),
    client.readContract({
      address: feed,
      abi: aggregatorV3Abi,
      functionName: 'decimals',
    }),
  ])

  // `latestRoundData` returns a tuple — destructure by index.
  const [, answer, , updatedAt] = latestRound as readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ]

  if (answer <= 0n) {
    throw new Error('[chainlink] aggregator returned a non-positive answer')
  }

  // answer = price scaled by 10^decimals (typically 8). Convert to a JS
  // number — EUR rate is small enough that float precision is fine.
  const scale = 10 ** Number(decimals)
  const rate = Number(answer) / scale

  return {
    rate,
    updatedAt: Number(updatedAt),
    decimals: Number(decimals),
  }
}
