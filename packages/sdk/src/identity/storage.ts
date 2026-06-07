import type { Address } from 'viem'

import type { IdentityArtifact } from '../types/identity'

/**
 * LocalStorage helpers for the "Digital Artifact" (Sig_A + name pair).
 *
 * Key scheme: `ticketpulse:identity:{wallet}:{eventContract}:{tokenId}`.
 * Wallet is included so multiple users sharing a browser don't read each
 * other's data (and a single user can sign out + back in cleanly).
 *
 * All operations are no-ops on the server — `localStorage` doesn't exist
 * in RSC / Edge runtimes. Components calling these helpers must already
 * be marked `'use client'`.
 */

export const IDENTITY_STORAGE_PREFIX = 'ticketpulse:identity'

function getStore(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    // SSR-style execution in iframe / sandboxed env — degrade gracefully.
    return null
  }
}

export function identityArtifactKey(args: {
  wallet: Address
  eventContract: Address
  tokenId: number
}): string {
  return [
    IDENTITY_STORAGE_PREFIX,
    args.wallet.toLowerCase(),
    args.eventContract.toLowerCase(),
    args.tokenId,
  ].join(':')
}

export function saveIdentityArtifact(artifact: IdentityArtifact): void {
  const store = getStore()
  if (!store) return
  store.setItem(
    identityArtifactKey({
      wallet: artifact.walletAddress,
      eventContract: artifact.eventContract,
      tokenId: artifact.tokenId,
    }),
    JSON.stringify(artifact),
  )
}

export function removeIdentityArtifact(args: {
  wallet: Address
  eventContract: Address
  tokenId: number
}): void {
  const store = getStore()
  if (!store) return
  store.removeItem(identityArtifactKey(args))
}

/**
 * Load every artifact stored for a given wallet. Filtering by wallet keeps
 * the QR generator from picking up a previously-connected account's tickets.
 */
export function loadIdentityArtifacts(wallet: Address): IdentityArtifact[] {
  const store = getStore()
  if (!store) return []

  const lowerWallet = wallet.toLowerCase()
  const prefix = `${IDENTITY_STORAGE_PREFIX}:${lowerWallet}:`
  const out: IdentityArtifact[] = []

  for (let i = 0; i < store.length; i += 1) {
    const key = store.key(i)
    if (!key || !key.startsWith(prefix)) continue
    const raw = store.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw) as IdentityArtifact
      if (parsed.schemaVersion === 1) out.push(parsed)
    } catch {
      // Skip corrupted entries; don't throw — partial recovery is better
      // than failing the whole "My Tickets" screen.
    }
  }
  return out
}
