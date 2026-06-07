import type { Config } from 'tailwindcss'

/**
 * Tailwind v3 config wired to the TicketPulse brand tokens.
 *
 * Strategy:
 *   • Colours are HSL strings stored in CSS custom properties (see
 *     `globals.css`). Tailwind reads them via `hsl(var(--token))` so we
 *     can flip themes by swapping the `<html data-theme>` attribute
 *     without rebuilding CSS.
 *   • Brand-specific named colours (`acid`, `forest`, `cyber`, …) live
 *     under `colors.brand.*` to avoid collisions with shadcn's defaults.
 *   • `tabular-nums` is enabled site-wide for any element with the
 *     `font-tabular` utility — used in price ledgers and countdowns.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx,mdx}', './src/app/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      },
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // ─── shadcn semantic tokens (mapped to CSS vars) ───────────
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        // ─── Raw brand swatches (per Style Guide) ──────────────────
        brand: {
          // Dark theme
          'deep-forest-night': '#121614',
          'obsidian-slate': '#1E2522',
          'cloud-dancer': '#F4F5F7',
          // Light theme
          'pure-white': '#FFFFFF',
          'forest-green': '#1A4D2E',
          // Accents
          'acid-lime': '#DFFF00',
          'cyber-rose': '#EF5777',
          // Semantic
          'carbon-mint': '#00FFC2',
          'solar-amber': '#F59E0B',
          'crimson-alert': '#EF4444',
          'muted-zinc': '#71717A',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // `--font-sans` is set from next/font/google in `app/layout.tsx`.
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontFeatureSettings: {
        // Tabular figures (Inter supports it via the `tnum` feature).
        tabular: '"tnum" on, "lnum" on',
      },
      keyframes: {
        // Custom keyframes used by `tx-tracker` for the "transaction pending"
        // pulse described in the Style Guide (Solar Amber halo).
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(245, 158, 11, 0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'pulse-amber': 'pulse-amber 1.6s ease-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Custom utility: `font-tabular` enables `tnum` on a per-element basis.
    function ({ addUtilities }: { addUtilities: (utils: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        '.font-tabular': {
          fontVariantNumeric: 'tabular-nums lining-nums',
          fontFeatureSettings: '"tnum" on, "lnum" on',
        },
      })
    },
  ],
}

export default config
