'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Input } from '@/shared/ui'
import { useUiStore } from '@/shared/stores'

/**
 * Search-by-name filter (F-5 §4). Debounced 250 ms so we don't spam the
 * Subgraph on every keypress. Lives in the global UI store so deeper
 * filters (date pickers etc.) can read it without prop-drilling.
 */
export function SearchBar() {
  const t = useTranslations('events.list')
  const value = useUiStore((s) => s.globalSearch)
  const set = useUiStore((s) => s.setGlobalSearch)
  const [local, setLocal] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => set(local), 250)
    return () => clearTimeout(id)
  }, [local, set])

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={t('search')}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
