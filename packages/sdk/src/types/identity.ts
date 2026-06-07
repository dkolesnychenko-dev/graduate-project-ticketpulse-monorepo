import type { Address, Hex } from 'viem'

/**
 * Decoded EIP-712 "IdentityBinding" payload — the structured data the user
 * signs at mint / buy-order time to bind their real name to a ticket.
 *
 * The hash of the resulting 65-byte signature (keccak256) is what goes
 * on-chain in `ticketPersonalization[tokenId]`. The full signature itself
 * never leaves the user's device.
 */
export interface IdentityBindingMessage extends Record<string, unknown> {
  /** Title of the event being minted into. Must match `Event.title` exactly. */
  eventName: string
  ownerFirstName: string
  ownerLastName: string
}

/**
 * The "Digital Artifact" record persisted in localStorage + optional encrypted
 * IPFS backup. Lose this and the user can still attend (they can re-sign with
 * the same wallet + name), but the convenience is gone.
 *
 * Versioned so future schema migrations don't silently corrupt data.
 */
export interface IdentityArtifact {
  schemaVersion: 1
  /** Wallet that produced the signature — must match current signer to regenerate. */
  walletAddress: Address
  /** Event contract clone the ticket lives in (EIP-712 `verifyingContract`). */
  eventContract: Address
  /** ERC-721 tokenId inside that event. */
  tokenId: number
  /** EIP-712 chain id captured at signing time (replay-protection). */
  chainId: number
  /** Title used in the signed payload — must be displayed verbatim in QR UI. */
  eventName: string
  /** Personal data — kept locally, NEVER uploaded in plaintext. */
  ownerFirstName: string
  ownerLastName: string
  /** Raw 65-byte signature (0x-prefixed hex) — Sig_A from F-9. */
  signature: Hex
  /** keccak256 of `signature` bytes — must equal the on-chain `identityHash`. */
  signatureHash: Hex
  /** Unix seconds when the artifact was created (debugging / multi-device sync). */
  createdAt: number
}

/**
 * Encrypted blob suitable for IPFS upload as the optional artifact backup.
 *
 * Encryption: AES-GCM with key derived from a user-supplied passphrase via
 * PBKDF2 (SHA-256, 600k iterations). Salt + IV stored alongside the ciphertext
 * so the user only has to remember the passphrase.
 */
export interface EncryptedIdentityBackup {
  schemaVersion: 1
  /** Base64 salt for PBKDF2 (16 bytes). */
  salt: string
  /** Base64 IV for AES-GCM (12 bytes). */
  iv: string
  /** Base64 ciphertext (encrypted JSON of `IdentityArtifact[]`). */
  ciphertext: string
  /** KDF parameters — recorded so we can change them without breaking old backups. */
  kdf: {
    name: 'PBKDF2'
    hash: 'SHA-256'
    iterations: number
  }
}
