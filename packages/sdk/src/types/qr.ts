import type { Hex } from 'viem'

/**
 * Carries two cryptographic proofs:
 *
 *   1. `identityProof.signature` (Sig_A) — static, mints the user's name into
 *      keccak256(sig) and was already verified at mint time.
 *
 *   2. `ownershipProof.signature` (Sig_B) — fresh, proves the user still controls
 *      the wallet *right now*. The validator recovers the signer from
 *      `keccak256(abi.encodePacked(tokenId, timestamp))` and compares it to the
 *      current NFT owner in the snapshot DB.
 *
 * `timestamp` is in seconds (Unix); validators reject codes older than 5 minutes.
 */
export interface QrPayload {
  version: 1
  /** Event contract clone (lowercased hex). Lets validator find the right event in snapshot DB. */
  eventContract: string
  ticketId: number
  identityProof: { signature: Hex }
  ownershipProof: {
    signature: Hex
    /** Unix seconds — validator checks `now - timestamp < 300`. */
    timestamp: number
  }
}

/** Compact text-encoded form ready for embedding into a `qrcode` library. */
export type QrText = string
