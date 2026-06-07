'use client'

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

/**
 * Wraps `next-themes`' provider with our brand-aligned defaults.
 *
 *   • `attribute="data-theme"` matches the selectors in `globals.css`.
 *   • Default = system preference; the Style Guide notes dark is the
 *     primary intent for the buyer-facing surface, but the Light theme
 *     is essential for organisers running analytics in daylight.
 *   • Disable transitions across theme flips to avoid the ugly cross-fade
 *     when the user toggles in a dense data view.
 */
export function ThemeProvider({
  children,
  ...props
}: Omit<ThemeProviderProps, 'attribute'>) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
