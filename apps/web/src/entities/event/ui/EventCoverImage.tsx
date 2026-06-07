'use client'

import { ImageOff } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface EventCoverImageProps {
  src: string | null
  alt: string
  /** Aspect ratio class — defaults to 1200:630 (cover image spec). */
  aspect?: 'video' | 'square' | 'cover'
  className?: string
  priority?: boolean
  /** Show a "live" pulse overlay for events in progress. */
  pulse?: boolean
}

const aspectClass = {
  video: 'aspect-video',
  square: 'aspect-square',
  cover: 'aspect-[1200/630]',
} as const

/**
 * IPFS-aware cover image.
 *
 *   • Uses `next/image` so the image is fetched once on the server,
 *     re-encoded to AVIF/WebP, and cached on Vercel's CDN forever
 *     (the URL maps to a content-addressed CID — immutable by design).
 *   • Gracefully degrades to a placeholder if IPFS is unreachable.
 *
 * Why this is a client component: the fallback toggle on error requires
 * `onError`. The image itself is rendered by Next.js' Image optimiser
 * either way, so there's no extra latency penalty.
 */
export function EventCoverImage({
  src,
  alt,
  aspect = 'cover',
  className,
  priority = false,
  pulse = false,
}: EventCoverImageProps) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md bg-muted text-muted-foreground',
          aspectClass[aspect],
          className,
        )}
      >
        <ImageOff className="size-6" />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-md', aspectClass[aspect], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
        priority={priority}
        onError={() => setFailed(true)}
      />
      {pulse ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-2 ring-[hsl(var(--secondary))] animate-pulse-amber"
        />
      ) : null}
    </div>
  )
}
