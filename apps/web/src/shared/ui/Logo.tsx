import Image from 'next/image'

import { cn } from '@/shared/lib/utils'

interface LogoProps {
  className?: string
  size?: number
}

/**
 * Common Logo component to ensure consistency across the app.
 * Uses the `logo.png` from the public directory.
 */
export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <div className={cn('relative flex shrink-0 items-center justify-center', className)}>
      <Image
        src="/logo.png"
        alt="TicketPulse Logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}
