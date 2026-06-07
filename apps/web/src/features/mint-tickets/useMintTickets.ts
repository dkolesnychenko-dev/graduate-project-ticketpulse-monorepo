'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useAccount, useChainId, useSignTypedData, useWriteContract } from 'wagmi'
import type { Address, Hex } from 'viem'

import { ticketPulseEventAbi } from '@ticketpulse/sdk/contracts'
import {
  buildIdentityBindingTypedData,
  hashIdentitySignature,
  saveIdentityArtifact,
} from '@ticketpulse/sdk/identity'
import type { IdentityArtifact } from '@ticketpulse/sdk/types'

import { useTxTracker } from '@/features/transaction-tracker'

import type { TicketPersonalization } from './schema'

interface MintArgs {
  eventContract: Address
  eventTitle: string
  /** Wei amount = nominalPrice × quantity (computed by the caller). */
  totalValueWei: bigint
  /** One entry per ticket. */
  tickets: TicketPersonalization[]
  /**
   * Token-id base used for the local artifact key. The contract assigns
   * the actual ids only after the tx mines — so we use a sentinel index
   * here and let the post-mint reconciler rewrite the key once the
   * Subgraph confirms the real ids. For F-9 demo flows where the user
   * mints exactly one ticket, base + index works.
   */
  nextTokenIdBase: number
}

/**
 * Mint-tickets flow (F-6).
 *
 * Sequence:
 *   1. For each ticket: produce an EIP-712 typed-data signature
 *      ("IdentityBinding"). The signature is free — no gas.
 *   2. Hash each signature (`keccak256(sig)`) — this is the value
 *      written into `ticketPersonalization[tokenId]`.
 *   3. Persist the raw signature + name pair locally as an
 *      `IdentityArtifact` (the "Digital Artifact" from F-0.4).
 *   4. Send the on-chain `mintTickets(bytes32[])` call with the array
 *      of hashes and `msg.value = nominalPrice × quantity`.
 */
export function useMintTickets() {
  const trackerId = useId()
  const tracker = useTxTracker()
  const t = useTranslations('tx.descriptions')
  const { address } = useAccount()
  const chainId = useChainId()
  const { signTypedDataAsync } = useSignTypedData()
  const { writeContractAsync } = useWriteContract()

  const [stage, setStage] = useState<
    'idle' | 'signing' | 'awaiting-signature' | 'pending' | 'success' | 'error'
  >('idle')
  const [signedCount, setSignedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mint = async (args: MintArgs): Promise<{ hash: Hex }> => {
    if (!address) throw new Error('Wallet not connected')

    try {
      setError(null)
      setSignedCount(0)

      // ── 1. Produce one signature per ticket ───────────────────────
      setStage('signing')
      const hashes: Hex[] = []
      const artifacts: IdentityArtifact[] = []

      for (let i = 0; i < args.tickets.length; i += 1) {
        const ticket = args.tickets[i]
        if (!ticket) continue

        const typed = buildIdentityBindingTypedData({
          chainId,
          eventContract: args.eventContract,
          message: {
            eventName: args.eventTitle,
            ownerFirstName: ticket.ownerFirstName,
            ownerLastName: ticket.ownerLastName,
          },
        })

        const signature = await signTypedDataAsync({
          domain: typed.domain,
          types: typed.types,
          primaryType: typed.primaryType,
          message: typed.message,
        })

        const signatureHash = hashIdentitySignature(signature)
        hashes.push(signatureHash)

        // Stash a local artifact — F-6 step 5.
        artifacts.push({
          schemaVersion: 1,
          walletAddress: address,
          eventContract: args.eventContract,
          tokenId: args.nextTokenIdBase + i,
          chainId,
          eventName: args.eventTitle,
          ownerFirstName: ticket.ownerFirstName,
          ownerLastName: ticket.ownerLastName,
          signature,
          signatureHash,
          createdAt: Math.floor(Date.now() / 1000),
        })

        setSignedCount(i + 1)
      }

      // Save the artifacts only AFTER all signatures succeed —
      // otherwise a mid-flow rejection leaves us with orphan records.
      artifacts.forEach(saveIdentityArtifact)

      // ── 2. Submit the payable mint ────────────────────────────────
      setStage('awaiting-signature')
      tracker.start(trackerId, t('mintTickets', { count: args.tickets.length }))

      const hash = await writeContractAsync({
        chainId,
        address: args.eventContract,
        abi: ticketPulseEventAbi,
        functionName: 'mintTickets',
        args: [hashes],
        value: args.totalValueWei,
      })

      tracker.captureHash(trackerId, hash)
      setStage('pending')
      return { hash }
    } catch (err) {
      setStage('error')
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      throw err
    }
  }

  return { mint, stage, signedCount, error }
}
