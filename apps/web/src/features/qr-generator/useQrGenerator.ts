'use client'

import { useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { hexToBytes, type Address, type Hex } from 'viem'

import { OWNERSHIP_PROOF_TTL_SECONDS } from '@ticketpulse/sdk/constants'
import {
  buildOwnershipProofMessage,
  identityArtifactKey,
  loadIdentityArtifacts,
  packQrPayload,
} from '@ticketpulse/sdk/identity'
import type { IdentityArtifact, QrPayload } from '@ticketpulse/sdk/types'

interface UseQrGeneratorArgs {
  eventContract: Address
  tokenId: number
}

interface QrState {
  payload: QrPayload | null
  qrText: string | null
  /** Seconds until the current Sig_B expires (0 when not yet generated). */
  ttlSeconds: number
  /** True when an artifact is missing — UI should prompt the user to re-sign. */
  needsRecovery: boolean
  /** Identity artifact in scope; null when we couldn't find one. */
  artifact: IdentityArtifact | null
}

/**
 * F-9 — Manual-refresh QR generator.
 *
 *   • Looks up the local artifact by `{wallet, eventContract, tokenId}`.
 *   • `regenerate()` asks the wallet to sign a fresh `keccak256(tokenId, ts)`
 *     digest (Sig_B) and packs the QR JSON.
 *   • TTL ticks down on the client; once it hits zero the caller blurs
 *     the QR and shows the refresh button (mirroring the Style Guide).
 */
export function useQrGenerator({ eventContract, tokenId }: UseQrGeneratorArgs) {
  const { address } = useAccount()
  const { signMessageAsync, isPending: isSigning } = useSignMessage()

  const [state, setState] = useState<QrState>({
    payload: null,
    qrText: null,
    ttlSeconds: 0,
    needsRecovery: false,
    artifact: null,
  })

  // Locate the artifact whenever the wallet/event/token changes.
  // Also re-check whenever the payload changes (after recovery).
  useEffect(() => {
    if (!address) {
      setState((s) => ({ ...s, artifact: null, needsRecovery: false }))
      return
    }
    const key = identityArtifactKey({ wallet: address, eventContract, tokenId })
    const all = loadIdentityArtifacts(address)
    const match = all.find((a) => {
      const ak = identityArtifactKey({
        wallet: a.walletAddress,
        eventContract: a.eventContract,
        tokenId: a.tokenId,
      })
      return ak === key
    })
    setState((s) => ({
      ...s,
      artifact: match ?? null,
      needsRecovery: !match,
    }))
  }, [address, eventContract, tokenId])

  // Tick the TTL down once per second.
  useEffect(() => {
    if (!state.payload) return
    const id = setInterval(() => {
      setState((s) => {
        if (!s.payload) return s
        const ttl =
          OWNERSHIP_PROOF_TTL_SECONDS -
          (Math.floor(Date.now() / 1000) - s.payload.ownershipProof.timestamp)
        return { ...s, ttlSeconds: Math.max(0, ttl) }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state.payload])

  const regenerate = async () => {
    // Re-check localStorage in case artifact was just saved (identity recovery flow)
    if (!address) throw new Error('Wallet not connected')

    let artifact = state.artifact
    if (!artifact) {
      // Try to load fresh from localStorage (might have been added by recovery flow)
      const key = identityArtifactKey({ wallet: address, eventContract, tokenId })
      const all = loadIdentityArtifacts(address)
      artifact = all.find((a) => {
        const ak = identityArtifactKey({
          wallet: a.walletAddress,
          eventContract: a.eventContract,
          tokenId: a.tokenId,
        })
        return ak === key
      }) ?? null

      if (artifact) {
        // Update state with the newly found artifact
        setState((s) => ({ ...s, artifact, needsRecovery: false }))
      }
    }

    if (!artifact) {
      throw new Error('No local artifact for this ticket. Re-sign identity to recover.')
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const digest = buildOwnershipProofMessage({ tokenId, timestamp })

    // Sig_B — the user signs the raw 32-byte digest via `signMessage({ raw })`
    // so the wallet UI explicitly shows "Sign message" not transaction warning.
    const signature = await signMessageAsync({
      message: { raw: hexToBytes(digest) },
    })

    const payload: QrPayload = {
      version: 1,
      eventContract,
      ticketId: tokenId,
      identityProof: { signature: artifact.signature },
      ownershipProof: { signature: signature as Hex, timestamp },
    }
    setState((s) => ({
      ...s,
      payload,
      qrText: packQrPayload(payload),
      ttlSeconds: OWNERSHIP_PROOF_TTL_SECONDS,
    }))
    return payload
  }

  return {
    ...state,
    regenerate,
    isSigning,
  }
}
