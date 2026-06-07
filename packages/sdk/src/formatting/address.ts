import { getAddress, isAddressEqual, type Address } from 'viem'

/**
 * Shorten an address for inline display: `0x742d…35Cc`.
 *
 * Defaults match the convention used by Basescan and most wallet UIs
 * (4 leading + 4 trailing chars after the `0x` prefix).
 */
export function truncateAddress(
  address: string,
  options: { leading?: number; trailing?: number; ellipsis?: string } = {},
): string {
  const { leading = 4, trailing = 4, ellipsis = '…' } = options
  if (address.length <= leading + trailing + 2) return address
  return `${address.slice(0, leading + 2)}${ellipsis}${address.slice(-trailing)}`
}

/** Case-insensitive address comparison without throwing on invalid input. */
export function isSameAddress(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false
  try {
    return isAddressEqual(a as Address, b as Address)
  } catch {
    return a.toLowerCase() === b.toLowerCase()
  }
}

/** Convert any-case hex into EIP-55 checksum. Throws on invalid input. */
export function checksumAddress(address: string): Address {
  return getAddress(address)
}
