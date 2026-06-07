'use client'

import { ArrowDownUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { formatEur } from '@ticketpulse/sdk/formatting'

import { Button, Input, Label } from '@/shared/ui'
import { useEthEurRate } from '@/shared/hooks/useEthEurRate'

interface PriceConverterProps {
  /** Controlled ETH value (string). */
  value: string
  onChange: (next: string) => void
  /** Optional label override. */
  label?: string
}

/**
 * Two-way ETH ↔ EUR converter used inside the create-event form
 *
 *   • Mode A — user types ETH → EUR equivalent updates live.
 *   • Mode B — user types EUR → we back-compute the ETH amount and
 *     write it into the form's `nominalPriceEth` field.
 *
 * Crucial UX rule: the contract always stores ETH, so once the
 * organiser switches to EUR mode we surface the warning that the actual
 * EUR amount for buyers may fluctuate.
 */
export function PriceConverter({ value, onChange, label }: PriceConverterProps) {
  const t = useTranslations('events.create.converter')
  const { data: rateData } = useEthEurRate()
  const rate = rateData?.rate ?? null

  const [mode, setMode] = useState<'eth' | 'eur'>('eth')
  const [eurDraft, setEurDraft] = useState<string>('')

  const ethValue = parseFloat(value) || 0
  const eurEquivalent = rate ? ethValue * rate : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="nominalPriceEth">{label ?? t('label')}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMode((m) => (m === 'eth' ? 'eur' : 'eth'))}
          disabled={!rate}
          className="h-7 gap-1 text-xs"
        >
          <ArrowDownUp className="size-3" />
          {mode === 'eth' ? t('toggleToEur') : t('toggleToEth')}
        </Button>
      </div>

      {mode === 'eth' ? (
        <>
          <div className="relative">
            <Input
              id="nominalPriceEth"
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="0.05"
              className="pr-16 font-tabular"
              data-numeric
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ETH
            </span>
          </div>
          <p className="font-tabular text-xs text-muted-foreground" data-numeric>
            {eurEquivalent != null
              ? t('equivalent', { amount: formatEur(eurEquivalent) })
              : t('noRate')}
          </p>
        </>
      ) : (
        <>
          <div className="relative">
            <Input
              type="text"
              inputMode="decimal"
              value={eurDraft}
              onChange={(e) => {
                setEurDraft(e.target.value)
                const eur = parseFloat(e.target.value)
                if (Number.isFinite(eur) && rate) {
                  onChange((eur / rate).toFixed(6))
                }
              }}
              placeholder="100"
              className="pr-16 font-tabular"
              data-numeric
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              EUR
            </span>
          </div>
          <p className="rounded-md border bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            {t('warning')}
          </p>
        </>
      )}
    </div>
  )
}
