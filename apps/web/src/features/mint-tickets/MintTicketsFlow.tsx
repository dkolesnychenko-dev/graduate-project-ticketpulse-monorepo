'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Info, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { Address } from 'viem'

import { MAX_BATCH_SIZE } from '@ticketpulse/sdk/constants'
import { formatDualPrice } from '@ticketpulse/sdk/formatting'

import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/ui'
import { useEthEurRate } from '@/shared/hooks/useEthEurRate'

import { mintTicketsSchema, type MintTicketsForm } from './schema'
import { useMintTickets } from './useMintTickets'

interface MintTicketsFlowProps {
  eventContract: Address
  eventTitle: string
  nominalPriceWei: bigint
  remainingSupply: number
  maxPerWallet: number
  alreadyOwned: number
  onSuccess?: () => void
}

/**
 * Linear 3-block mint flow. Configuration → personalisation →
 * payment, with EIP-712 signing in the middle. Persisted artifact data
 * is the F-0.4 "Digital Artifact" the user must keep to generate QRs
 * later.
 */
export function MintTicketsFlow({
  eventContract,
  eventTitle,
  nominalPriceWei,
  remainingSupply,
  maxPerWallet,
  alreadyOwned,
  onSuccess,
}: MintTicketsFlowProps) {
  const t = useTranslations('mint')
  const tTx = useTranslations('tx')
  const { mint, stage, signedCount, error } = useMintTickets()
  const { data: rateData } = useEthEurRate()
  const [submitting, setSubmitting] = useState(false)

  const remainingForWallet = Math.max(0, maxPerWallet - alreadyOwned)
  const maxAllowed = Math.min(MAX_BATCH_SIZE, remainingSupply, remainingForWallet)

  const form = useForm<MintTicketsForm>({
    resolver: zodResolver(mintTicketsSchema),
    defaultValues: {
      quantity: maxAllowed > 0 ? 1 : 0,
      acknowledgeImmutable: false,
      tickets: [{ ownerFirstName: '', ownerLastName: '' }],
    },
    mode: 'onBlur',
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tickets',
  })

  const quantity = form.watch('quantity')
  const totalWei = nominalPriceWei * BigInt(Math.max(0, quantity))
  const dual = formatDualPrice(totalWei, rateData?.rate ?? null)

  const syncTickets = (next: number) => {
    const target = Math.max(1, Math.min(maxAllowed, Math.floor(next)))
    while (fields.length < target) append({ ownerFirstName: '', ownerLastName: '' })
    while (fields.length > target) remove(fields.length - 1)
    form.setValue('quantity', target)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      await mint({
        eventContract,
        eventTitle,
        totalValueWei: nominalPriceWei * BigInt(values.quantity),
        tickets: values.tickets,
        nextTokenIdBase: 1,
      })
      toast.success(t('step3.successToast'))
      onSuccess?.()
    } catch {
      // tracker already surfaces the toast
    } finally {
      setSubmitting(false)
    }
  })

  if (maxAllowed <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('limitReached.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('limitReached.description', { max: maxPerWallet })}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── Block 1: quantity ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('step1.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => syncTickets(quantity - 1)}
              disabled={quantity <= 1 || submitting}
            >
              −
            </Button>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxAllowed}
              value={quantity}
              onChange={(e) => syncTickets(Number(e.target.value))}
              className="w-20 text-center font-tabular"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => syncTickets(quantity + 1)}
              disabled={quantity >= maxAllowed || submitting}
            >
              +
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('step1.availability', {
                remaining: remainingSupply,
                total: remainingSupply,
                owned: alreadyOwned,
                max: maxPerWallet,
              })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('step1.perTxLimit', { max: MAX_BATCH_SIZE })}
          </p>
        </CardContent>
      </Card>

      {/* ── Block 2: personalisation ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('step2.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <p>
              {t('step2.warningIntro')}
              <strong>{t('step2.warningStrong')}</strong>.
            </p>
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
              <h4 className="col-span-full text-sm font-medium text-muted-foreground">
                {t('step2.ticketLabel', { index: idx + 1 })}
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor={`tickets.${idx}.firstName`}>{t('step2.firstName')}</Label>
                <Input
                  id={`tickets.${idx}.firstName`}
                  {...form.register(`tickets.${idx}.ownerFirstName` as const)}
                  placeholder={t('step2.firstNamePlaceholder')}
                />
                {form.formState.errors.tickets?.[idx]?.ownerFirstName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.tickets[idx]?.ownerFirstName?.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`tickets.${idx}.lastName`}>{t('step2.lastName')}</Label>
                <Input
                  id={`tickets.${idx}.lastName`}
                  {...form.register(`tickets.${idx}.ownerLastName` as const)}
                  placeholder={t('step2.lastNamePlaceholder')}
                />
                {form.formState.errors.tickets?.[idx]?.ownerLastName ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.tickets[idx]?.ownerLastName?.message}
                  </p>
                ) : null}
              </div>
            </div>
          ))}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register('acknowledgeImmutable')}
              className="mt-1 size-4 rounded border"
            />
            <span>{t('step2.acknowledgeImmutable')}</span>
          </label>
          {form.formState.errors.acknowledgeImmutable ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.acknowledgeImmutable.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Block 3: payment summary ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('step3.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">{t('step3.ticketsRow')}</dt>
            <dd className="text-right font-tabular" data-numeric>
              {quantity}
            </dd>
            <dt className="text-muted-foreground">{t('step3.totalRow')}</dt>
            <dd className="text-right font-tabular font-semibold" data-numeric>
              {dual.primary}
              {dual.secondary ? (
                <span className="ml-2 text-muted-foreground">{dual.secondary}</span>
              ) : null}
            </dd>
          </dl>

          {stage !== 'idle' ? (
            <p className="flex items-center gap-2 text-sm">
              {stage === 'success' ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <Loader2 className="size-4 animate-spin" />
              )}
              <span className="text-muted-foreground">
                {stage === 'signing'
                  ? t('step3.signingProgress', { signed: signedCount, total: quantity })
                  : stage === 'awaiting-signature'
                    ? tTx('awaitingSignature')
                    : stage === 'pending'
                      ? tTx('pending')
                      : stage === 'success'
                        ? tTx('confirmed')
                        : null}
              </span>
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? t('step3.working') : t('step3.submitCta', { count: quantity })}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
