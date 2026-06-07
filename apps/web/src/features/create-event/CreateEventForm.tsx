'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UploadCloud } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { COVER_IMAGE } from '@ticketpulse/sdk/constants'

import { useRouter } from '@/shared/i18n/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

import { PriceConverter } from './PriceConverter'
import {
  createEventDefaults,
  createEventSchema,
  coverImageRules,
  type CreateEventForm as CreateEventFormValues,
} from './schema'
import { useCreateEvent } from './useCreateEvent'

type Stage =
  | 'idle'
  | 'uploading-cover'
  | 'uploading-metadata'
  | 'awaiting-signature'
  | 'pending'
  | 'success'
  | 'error'

/**
 * Create-Event multi-step form (F-1).
 *
 * For the sake of UX simplicity we lay out a single vertical form with
 * inline progress indication instead of a wizard. The mental model is
 * easier for organisers used to traditional ticketing tools, and we
 * lean on the contract's strict validation for safety nets.
 */
export function CreateEventForm() {
  const t = useTranslations('events.create')
  const router = useRouter()
  const { submit, stage, error, isSubmitting } = useCreateEvent()
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: createEventDefaults,
    mode: 'onBlur',
  })

  useEffect(() => {
    if (!coverImage) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(coverImage)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverImage])

  const validateCoverImage = (file: File): string | null => {
    if (file.size > coverImageRules.maxBytes) {
      return t('cover.tooBig', { maxMb: Math.round(COVER_IMAGE.maxSizeBytes / 1024 / 1024) })
    }
    if (!coverImageRules.acceptedMimeTypes.includes(file.type as never)) {
      return t('cover.wrongType')
    }
    return null
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!coverImage) {
      setCoverError(t('cover.required'))
      return
    }
    try {
      const { txHash } = await submit(values, coverImage)
      toast.success(t('submission.successToast'))
      router.push(`/events?pendingTx=${txHash}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('submission.stages.success'))
    }
  })

  const stageLabel = (s: Stage): string => {
    switch (s) {
      case 'uploading-cover':
        return t('submission.stages.uploadingCover')
      case 'uploading-metadata':
        return t('submission.stages.uploadingMetadata')
      case 'awaiting-signature':
        return t('submission.stages.awaitingSignature')
      case 'pending':
        return t('submission.stages.pending')
      case 'success':
        return t('submission.stages.success')
      default:
        return ''
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* ── 1. Basics ────────────────────────────────────────────── */}
        <SectionCard title={t('sections.basics')}>
          <Field label={t('fields.title')} error={form.formState.errors.title?.message}>
            <Input placeholder={t('fields.titlePlaceholder')} {...form.register('title')} />
          </Field>
          <Field
            label={t('fields.description')}
            error={form.formState.errors.description?.message}
          >
            <textarea
              {...form.register('description')}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Field
            label={t('fields.location')}
            error={form.formState.errors.location?.message}
          >
            <Input placeholder={t('fields.locationPlaceholder')} {...form.register('location')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('fields.startTime')}
              error={form.formState.errors.startTime?.message}
            >
              <Input type="datetime-local" {...form.register('startTime')} />
            </Field>
            <Field
              label={t('fields.endTime')}
              error={form.formState.errors.endTime?.message}
            >
              <Input type="datetime-local" {...form.register('endTime')} />
            </Field>
          </div>
        </SectionCard>

        {/* ── 2. Ticketing ─────────────────────────────────────────── */}
        <SectionCard title={t('sections.ticketing')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('fields.ticketType')}
              error={form.formState.errors.ticketType?.message}
              hint={t('fields.ticketTypeHint')}
            >
              <Input {...form.register('ticketType')} />
            </Field>
            <Field
              label={t('fields.ticketSymbol')}
              error={form.formState.errors.ticketSymbol?.message}
              hint={t('fields.ticketSymbolHint')}
            >
              <Input className="font-tabular uppercase" {...form.register('ticketSymbol')} />
            </Field>
            <Field
              label={t('fields.maxSupply')}
              error={form.formState.errors.maxSupply?.message}
            >
              <Input type="number" inputMode="numeric" min={1} {...form.register('maxSupply')} />
            </Field>
            <Field
              label={t('fields.maxTicketsPerWallet')}
              error={form.formState.errors.maxTicketsPerWallet?.message}
              hint={t('fields.maxTicketsPerWalletHint')}
            >
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={6}
                {...form.register('maxTicketsPerWallet')}
              />
            </Field>
            <div className="sm:col-span-2">
              <PriceConverter
                value={form.watch('nominalPriceEth')}
                onChange={(v) => form.setValue('nominalPriceEth', v, { shouldValidate: true })}
              />
              {form.formState.errors.nominalPriceEth?.message ? (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.nominalPriceEth.message}
                </p>
              ) : null}
            </div>
            <Field
              label={t('fields.royaltyPct')}
              error={form.formState.errors.royaltyPct?.message}
              hint={t('fields.royaltyPctHint')}
            >
              <Input type="number" inputMode="numeric" min={0} max={20} {...form.register('royaltyPct')} />
            </Field>
            <Field
              label={t('fields.markupPct')}
              error={form.formState.errors.markupPct?.message}
              hint={t('fields.markupPctHint')}
            >
              <Input type="number" inputMode="numeric" min={0} max={100} {...form.register('markupPct')} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* ── Side: cover image + submit summary ─────────────────────── */}
      <aside className="space-y-4">
        <SectionCard title={t('sections.cover')}>
          <CoverUpload
            preview={coverPreview}
            uploadCta={t('cover.uploadCta')}
            onSelect={(file) => {
              const err = validateCoverImage(file)
              setCoverError(err)
              if (!err) setCoverImage(file)
            }}
            error={coverError}
          />
          <p className="text-xs text-muted-foreground">{t('cover.rules')}</p>
        </SectionCard>

        <SectionCard title={t('sections.submission')}>
          <p className="text-sm text-muted-foreground">{t('submission.description')}</p>
          {stage !== 'idle' ? (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-2 text-sm',
                stage === 'success'
                  ? 'text-success-foreground'
                  : stage === 'error'
                    ? 'text-destructive'
                    : 'text-muted-foreground',
              )}
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {stageLabel(stage as Stage)}
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="brand"
            className="mt-4 w-full"
          >
            {isSubmitting ? t('submission.submitting') : t('submission.submitCta')}
          </Button>
        </SectionCard>
      </aside>
    </form>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function CoverUpload({
  preview,
  onSelect,
  error,
  uploadCta,
}: {
  preview: string | null
  onSelect: (file: File) => void
  error: string | null
  uploadCta: string
}) {
  return (
    <label
      className={cn(
        'group relative flex aspect-[1200/630] cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-muted/30 transition-colors hover:bg-muted/50',
        preview ? 'border-transparent' : 'border-border',
        error ? 'border-destructive' : '',
      )}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelect(file)
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <UploadCloud className="size-5" />
          <span className="text-sm">{uploadCta}</span>
        </div>
      )}
    </label>
  )
}
