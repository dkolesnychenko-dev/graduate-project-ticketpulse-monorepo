'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useAccount, useChainId, useWriteContract } from 'wagmi'
import type { Hex } from 'viem'

import {
  EVENT_METADATA_SCHEMA_VERSION,
  type EventMetadata,
} from '@ticketpulse/ipfs'
import { ticketPulseFactoryAbi } from '@ticketpulse/sdk/contracts'
import { parseEthToWei } from '@ticketpulse/sdk/formatting'

import { publicEnv } from '@/shared/env/public'
import { useTxTracker } from '@/features/transaction-tracker'

import type { CreateEventForm } from './schema'

interface SubmissionResult {
  txHash: Hex
}

/**
 * Orchestrates the full F-1 flow:
 *
 *   1. Upload cover image to IPFS (POST /api/ipfs/upload, type=file)
 *   2. Upload EventMetadata JSON to IPFS (POST /api/ipfs/upload, type=metadata)
 *   3. Call `TicketPulseFactory.createEvent(InitParams)` via wagmi
 *
 * Exposes per-step progress so the multi-step form can show a clear
 * "uploading cover", "writing metadata", "awaiting signature" state.
 */
export function useCreateEvent() {
  const trackerId = useId()
  const tracker = useTxTracker()
  const t = useTranslations('tx.descriptions')
  const { writeContractAsync, isPending } = useWriteContract()
  const { address } = useAccount()
  const chainId = useChainId()

  const [stage, setStage] = useState<
    'idle' | 'uploading-cover' | 'uploading-metadata' | 'awaiting-signature' | 'pending' | 'success' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (
    form: CreateEventForm,
    coverImage: File,
  ): Promise<SubmissionResult> => {
    if (!address) throw new Error('Wallet not connected')

    try {
      setError(null)

      // ── Step 1: upload cover ─────────────────────────────────────
      setStage('uploading-cover')
      const coverForm = new FormData()
      coverForm.set('type', 'file')
      coverForm.set('file', coverImage)
      const coverRes = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: coverForm,
      })
      if (!coverRes.ok) {
        throw new Error(`Cover upload failed: HTTP ${coverRes.status}`)
      }
      const { cid: ipfsCoverImageCid } = (await coverRes.json()) as { cid: string }

      // ── Step 2: upload metadata ──────────────────────────────────
      setStage('uploading-metadata')
      const metadata: EventMetadata = {
        schemaVersion: EVENT_METADATA_SCHEMA_VERSION,
        description: form.description,
        location: form.location,
      }
      const metaForm = new FormData()
      metaForm.set('type', 'metadata')
      metaForm.set('metadata', JSON.stringify(metadata))
      const metaRes = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: metaForm,
      })
      if (!metaRes.ok) {
        throw new Error(`Metadata upload failed: HTTP ${metaRes.status}`)
      }
      const { cid: ipfsMetadataCid } = (await metaRes.json()) as { cid: string }

      // ── Step 3: factory.createEvent ──────────────────────────────
      setStage('awaiting-signature')
      tracker.start(trackerId, t('createEvent', { title: form.title }))

      const startTime = BigInt(Math.floor(Date.parse(form.startTime) / 1000))
      const endTime = BigInt(Math.floor(Date.parse(form.endTime) / 1000))
      const nominalPrice = parseEthToWei(form.nominalPriceEth)

      const hash = await writeContractAsync({
        chainId,
        address: publicEnv.NEXT_PUBLIC_FACTORY_ADDRESS as Hex,
        abi: ticketPulseFactoryAbi,
        functionName: 'createEvent',
        args: [
          {
            organizer: address,
            startTime,
            endTime,
            nominalPrice,
            maxSupply: form.maxSupply,
            maxTicketsPerWallet: form.maxTicketsPerWallet,
            royaltyPct: form.royaltyPct,
            markupPct: form.markupPct,
            title: form.title,
            ticketType: form.ticketType,
            ticketSymbol: form.ticketSymbol,
            ipfsCoverImageCid,
            ipfsMetadataCid,
            location: form.location,
          },
        ],
      })

      tracker.captureHash(trackerId, hash)
      setStage('pending')
      return { txHash: hash }
    } catch (err) {
      setStage('error')
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    }
  }

  return {
    submit,
    stage,
    error,
    isSubmitting:
      isPending ||
      ['uploading-cover', 'uploading-metadata', 'awaiting-signature', 'pending'].includes(stage),
  }
}
