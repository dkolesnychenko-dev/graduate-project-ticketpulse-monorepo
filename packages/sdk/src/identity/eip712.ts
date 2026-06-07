import { keccak256, type Address, type Hex, type TypedData, type TypedDataDomain } from 'viem'

import {
  EIP712_DOMAIN,
  IDENTITY_BINDING_PRIMARY_TYPE,
  IDENTITY_BINDING_TYPES,
} from '../constants/metadata'
import type { IdentityBindingMessage } from '../types/identity'

/**
 * Build the EIP-712 `domain` separator for an identity binding signature.
 * Tied to a specific event contract + chain so signatures cannot be replayed
 * across events or across networks.
 */
export function buildIdentityBindingDomain(
  chainId: number,
  eventContract: Address,
): TypedDataDomain {
  return {
    name: EIP712_DOMAIN.name,
    version: EIP712_DOMAIN.version,
    chainId,
    verifyingContract: eventContract,
  }
}

/**
 * Full EIP-712 typed-data payload, ready to pass to wagmi's
 * `useSignTypedData()` or viem's `signTypedData()`.
 *
 *   const data = buildIdentityBindingTypedData({ chainId, eventContract, message })
 *   const sig  = await signTypedDataAsync(data)
 *   const hash = hashIdentitySignature(sig)  // == on-chain identityHash
 */
export interface IdentityBindingTypedData {
  domain: TypedDataDomain
  types: TypedData
  primaryType: typeof IDENTITY_BINDING_PRIMARY_TYPE
  message: IdentityBindingMessage
}

export function buildIdentityBindingTypedData(args: {
  chainId: number
  eventContract: Address
  message: IdentityBindingMessage
}): IdentityBindingTypedData {
  return {
    domain: buildIdentityBindingDomain(args.chainId, args.eventContract),
    types: IDENTITY_BINDING_TYPES,
    primaryType: IDENTITY_BINDING_PRIMARY_TYPE,
    message: args.message,
  }
}

/**
 * Compute `keccak256(signature_bytes)` — the value written into the
 * smart contract's `ticketPersonalization[tokenId]` mapping and indexed
 * into the Subgraph's `Ticket.identityHash`.
 *
 * Why hash and not store the signature itself? Two reasons:
 *   1. Privacy — the raw signature can be replayed; the hash cannot.
 *   2. Gas — a `bytes32` storage slot costs ~20k vs ~80k for 65 bytes.
 */
export function hashIdentitySignature(signature: Hex): Hex {
  return keccak256(signature)
}
