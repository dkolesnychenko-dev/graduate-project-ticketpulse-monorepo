import { encodePacked, keccak256, type Address, type Hex } from 'viem'

import { OWNERSHIP_PROOF_TTL_SECONDS } from '../constants/limits'
import type { QrPayload, QrText } from '../types/qr'

/**
 * Compute the digest that the user signs to produce a fresh "ownership proof"
 * (Sig_B in F-9).
 *
 * Format mirrors `abi.encodePacked(uint256 tokenId, uint256 timestamp)`,
 * keccak-256-hashed. The validator (F-25) reverses this exact computation,
 * recovers the signer, and compares against the snapshot-DB ticket owner.
 *
 * The user signs the *raw 32-byte digest* via `eth_sign` — which is wrapped
 * automatically by viem's `signMessage({ raw })`. Do NOT prepend the
 * "\x19Ethereum Signed Message:\n32" prefix here; viem handles that.
 */
export function buildOwnershipProofMessage(args: {
  tokenId: number | bigint
  timestamp: number
}): Hex {
  return keccak256(
    encodePacked(
      ['uint256', 'uint256'],
      [BigInt(args.tokenId), BigInt(args.timestamp)],
    ),
  )
}

/**
 * Pack the QR payload as compact JSON. Validators only need to `JSON.parse`
 * to read it back — no custom binary format required (F-25 step 2).
 *
 * `eventContract` is lowercased so QR equality checks across implementations
 * don't fail on checksum differences.
 */
export function packQrPayload(payload: QrPayload): QrText {
  return JSON.stringify({
    ...payload,
    eventContract: payload.eventContract.toLowerCase(),
  })
}

/**
 * Reverse of `packQrPayload`. Validates the schema enough to fail loudly
 * on garbage input — full crypto verification happens in the validator app.
 */
export function parseQrPayload(text: string): QrPayload {
  const raw: unknown = JSON.parse(text)
  if (!raw || typeof raw !== 'object') {
    throw new Error('[QR] payload is not an object')
  }
  const p = raw as Record<string, unknown>
  if (p.version !== 1) {
    throw new Error(`[QR] unsupported version: ${String(p.version)}`)
  }
  if (typeof p.eventContract !== 'string') throw new Error('[QR] missing eventContract')
  if (typeof p.ticketId !== 'number') throw new Error('[QR] missing ticketId')
  const idp = p.identityProof as Record<string, unknown> | undefined
  const own = p.ownershipProof as Record<string, unknown> | undefined
  if (!idp || typeof idp.signature !== 'string') {
    throw new Error('[QR] missing identityProof.signature')
  }
  if (
    !own ||
    typeof own.signature !== 'string' ||
    typeof own.timestamp !== 'number'
  ) {
    throw new Error('[QR] missing ownershipProof.{signature, timestamp}')
  }
  return {
    version: 1,
    eventContract: p.eventContract as Address,
    ticketId: p.ticketId,
    identityProof: { signature: idp.signature as Hex },
    ownershipProof: {
      signature: own.signature as Hex,
      timestamp: own.timestamp,
    },
  }
}

/**
 * Returns `true` if the ownership proof was issued within the 5-minute
 * window. Used by the UI to drive the QR-code blur-out + "refresh" CTA,
 * independently of the validator's matching check.
 */
export function isQrOwnershipFresh(
  payload: QrPayload,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  return nowSeconds - payload.ownershipProof.timestamp < OWNERSHIP_PROOF_TTL_SECONDS
}
