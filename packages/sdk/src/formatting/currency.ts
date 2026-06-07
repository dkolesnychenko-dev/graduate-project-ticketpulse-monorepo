import { formatUnits, parseUnits } from 'viem'

/**
 * Currency formatting — single source of truth for ETH/EUR rendering.
 *
 *   • All on-chain amounts are wei (`bigint`).
 *   • Display values are computed from wei + an optional EUR rate.
 *   • EUR is the only fiat we display (per project requirements).
 *
 * Why not `Intl.NumberFormat` directly: we need control over trailing zeros
 * (e.g. show "0.05 ETH" not "0.0500000000000000 ETH") and tabular-friendly
 * decimal places.
 */

/** Convert wei to an `eth` string with up to 6 decimal places, trimmed. */
export function weiToEth(wei: bigint): string {
  return formatUnits(wei, 18)
}

/**
 * Convert wei to a JavaScript `number` for math (charts, percentages).
 * Loses precision past ~Number.MAX_SAFE_INTEGER wei (~9 ETH) — use bigint
 * arithmetic on raw wei for anything financial.
 */
export function weiToEthNumber(wei: bigint): number {
  return Number(formatUnits(wei, 18))
}

/** Parse a user-entered ETH decimal string into wei. Throws on garbage. */
export function parseEthToWei(eth: string): bigint {
  const trimmed = eth.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`[currency] not a positive decimal: "${eth}"`)
  }
  return parseUnits(trimmed, 18)
}

interface FormatEthOptions {
  /** Maximum fraction digits to show. Default 6. */
  maxFractionDigits?: number
  /** Minimum fraction digits — useful for ledgers where every row aligns. */
  minFractionDigits?: number
  /** Append " ETH" suffix when `true` (default). */
  withSymbol?: boolean
}

/**
 * Format a wei amount as a human-friendly ETH string with locale-aware
 * thousands separators. Always uses `en-US` so "0.05" never becomes "0,05"
 * — the UI mixes this string into hex addresses and tabular numerals.
 */
export function formatEth(wei: bigint, options: FormatEthOptions = {}): string {
  const {
    maxFractionDigits = 6,
    minFractionDigits = 0,
    withSymbol = true,
  } = options
  const num = weiToEthNumber(wei)
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  })
  return withSymbol ? `${formatted} ETH` : formatted
}

interface FormatEurOptions {
  withSymbol?: boolean
  /** Decimal places — default 2 (cents). */
  decimals?: number
}

/** Format an EUR amount (already in EUR units, NOT cents). */
export function formatEur(eur: number, options: FormatEurOptions = {}): string {
  const { withSymbol = true, decimals = 2 } = options
  const formatted = eur.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return withSymbol ? `€${formatted}` : formatted
}

export interface DualPriceParts {
  primary: string
  /** `null` when no EUR rate is available — UI should hide the suffix. */
  secondary: string | null
}

/**
 * Build the dual-price display ("0.05 ETH ≈ €128.20") used everywhere
 * prices are shown (event cards, sell orders, mint flow, etc.).
 *
 * `ethEurRate` is the price of 1 ETH in EUR. Pass `null` when Chainlink
 * is unavailable — the UI gracefully degrades to ETH-only.
 */
export function formatDualPrice(
  wei: bigint,
  ethEurRate: number | null,
): DualPriceParts {
  const primary = formatEth(wei)
  if (ethEurRate == null) {
    return { primary, secondary: null }
  }
  const eur = weiToEthNumber(wei) * ethEurRate
  return { primary, secondary: `≈ ${formatEur(eur)}` }
}
