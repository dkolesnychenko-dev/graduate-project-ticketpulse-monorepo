'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { useAccount, useSignTypedData } from 'wagmi'
import type { Address } from 'viem'

import {
  buildIdentityBindingTypedData,
  hashIdentitySignature,
  saveIdentityArtifact,
} from '@ticketpulse/sdk/identity'
import type { IdentityArtifact } from '@ticketpulse/sdk/types'
import { Button, Input } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

import { useQrGenerator } from './useQrGenerator'

interface QrCodeViewProps {
  eventContract: Address
  tokenId: number
  ownerName?: string
}

/**
 * QR code modal body (F-9 §5).
 *
 *   • Displays the 5-minute countdown and blurs the canvas when the
 *     proof expires, replacing it with a refresh CTA.
 *   • The first time the user opens it (and after each expiry) we ask
 *     the wallet for a fresh Sig_B.
 */
export function QrCodeView({ eventContract, tokenId, ownerName }: QrCodeViewProps) {
  const t = useTranslations('qr')
  const { address, chainId } = useAccount()
  const { signTypedDataAsync, isPending: isSigningIdentity } = useSignTypedData()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [paintError, setPaintError] = useState<string | null>(null)
  const [identityName, setIdentityName] = useState(ownerName ?? '')
  const [identityError, setIdentityError] = useState<string | null>(null)

  const qr = useQrGenerator({ eventContract, tokenId })
  const expired = qr.payload != null && qr.ttlSeconds <= 0

  const handleSignIdentity = async () => {
    if (!identityName.trim()) {
      setIdentityError(t('nameRequired'))
      return
    }
    if (!address || !chainId) {
      setIdentityError(t('walletRequired'))
      return
    }

    try {
      setIdentityError(null)
      const nameParts = identityName.trim().split(/\s+/)
      const ownerFirstName = nameParts[0] ?? ''
      const ownerLastName = nameParts.slice(1).join(' ')

      const typedData = buildIdentityBindingTypedData({
        chainId,
        eventContract,
        message: {
          eventName: '', // Empty for now — TODO: fetch from event data if needed
          ownerFirstName,
          ownerLastName,
        },
      })

      const signature = await signTypedDataAsync(typedData)
      const signatureHash = hashIdentitySignature(signature)

      const artifact: IdentityArtifact = {
        schemaVersion: 1,
        walletAddress: address,
        eventContract,
        tokenId,
        chainId,
        eventName: '', // Empty for now — TODO: fetch from event data if needed
        ownerFirstName,
        ownerLastName,
        signature,
        signatureHash,
        createdAt: Math.floor(Date.now() / 1000),
      }

      saveIdentityArtifact(artifact)

      // Refresh the QR generator state to pick up the new artifact
      await qr.regenerate()
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : t('identitySignFailed'))
    }
  }

  useEffect(() => {
    if (!qr.qrText || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qr.qrText, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    }).catch((err) => setPaintError(err instanceof Error ? err.message : String(err)))
  }, [qr.qrText])

  const minutes = Math.floor(qr.ttlSeconds / 60)
  const seconds = qr.ttlSeconds % 60

  // Show identity signing form when recovery is needed
  if (qr.needsRecovery) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t('recoveryWarning')}
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="identity-name" className="block text-sm font-medium mb-2">
              {t('nameLabel')}
            </label>
            <Input
              id="identity-name"
              type="text"
              placeholder={t('namePlaceholder')}
              value={identityName}
              onChange={(e) => {
                setIdentityName(e.target.value)
                setIdentityError(null)
              }}
              disabled={isSigningIdentity}
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('nameHint')}
            </p>
          </div>

          {identityError ? (
            <p className="text-xs text-destructive">{identityError}</p>
          ) : null}

          <Button
            onClick={handleSignIdentity}
            disabled={isSigningIdentity || !identityName.trim()}
            className="w-full"
            variant="brand"
          >
            {isSigningIdentity ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t('signingIdentity')}
              </>
            ) : (
              t('signIdentity')
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">

      <div className="relative qr-canvas rounded-lg p-3 shadow-sm">
        <canvas
          ref={canvasRef}
          className={cn('transition-all', expired && 'blur-md opacity-60')}
          aria-label={t('ariaLabel')}
        />
        {!qr.payload && !qr.isSigning ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-black">
            {t('clickToGenerate')}
          </div>
        ) : null}
        {qr.isSigning ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <Loader2 className="size-6 animate-spin text-black" />
          </div>
        ) : null}
      </div>

      {qr.payload && !expired ? (
        <div className="font-tabular text-sm text-muted-foreground" data-numeric>
          {t('validFor', {
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0'),
          })}
        </div>
      ) : null}

      <Button
        variant={expired ? 'secondary' : 'brand'}
        onClick={() => qr.regenerate().catch(() => null)}
        disabled={qr.isSigning || qr.needsRecovery}
      >
        <RefreshCw className={cn('size-4', qr.isSigning && 'animate-spin')} />
        {qr.payload ? t('refresh') : t('generate')}
      </Button>

      {ownerName ? (
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          {t.rich('instructionsWithHolder', {
            instructions: t('instructions'),
            ownerName,
            name: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      ) : (
        <p className="max-w-xs text-center text-xs text-muted-foreground">{t('instructions')}</p>
      )}

      {paintError ? (
        <p className="text-xs text-destructive">{t('renderError', { message: paintError })}</p>
      ) : null}
    </div>
  )
}
