'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/shared/ui'

const NEXT_THEME: Record<string, string> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

/**
 * Cycle through light → dark → system.
 *
 * We avoid rendering the icon until `mounted` to prevent the dreaded
 * "hydration mismatch" warning that `next-themes` issues otherwise
 * (server render is blind to user preference).
 */
export function ThemeToggle() {
  const t = useTranslations('header')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(NEXT_THEME[theme ?? 'system'] ?? 'system')}
      aria-label={t('themeToggleLabel')}
    >
      {mounted ? (
        theme === 'dark' ? (
          <Moon className="size-4" />
        ) : theme === 'light' ? (
          <Sun className="size-4" />
        ) : (
          <Monitor className="size-4" />
        )
      ) : (
        <div className="size-4" />
      )}
    </Button>
  )
}
