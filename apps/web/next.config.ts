import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/shared/i18n/request.ts')

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * Transpile our internal monorepo packages — Next.js doesn't bundle
   * `node_modules` unless we list them here. Required because the SDK
   * exports raw `.ts` from `package.json#main`.
   */
  transpilePackages: ['@ticketpulse/sdk', '@ticketpulse/ipfs'],

  /**
   * Cover images live on IPFS gateways. We whitelist the three gateways
   * `@ticketpulse/ipfs` uses (ipfs.io public, Pinata dedicated, Infura
   * dedicated) plus the local Kubo endpoint. Next.js Image Optimisation
   * will fetch, re-encode to WebP/AVIF, then cache on the Edge CDN
   * forever (`<Image />` URL ⇒ same hash ⇒ same optimised asset).
   */
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ipfs.io', pathname: '/ipfs/**' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud', pathname: '/ipfs/**' },
      { protocol: 'https', hostname: '*.mypinata.cloud', pathname: '/ipfs/**' },
      { protocol: 'https', hostname: '*.infura-ipfs.io', pathname: '/ipfs/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8080', pathname: '/ipfs/**' },
      { protocol: 'http', hostname: 'localhost', port: '8080', pathname: '/ipfs/**' },
    ],
  },

  /**
   * Security headers — set globally so every page inherits them.
   * Content-Security-Policy is intentionally loose around RPC + IPFS
   * because we need to call out to many third-party gateways at runtime.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@ticketpulse/sdk',
      'wagmi',
      'viem',
      '@rainbow-me/rainbowkit',
    ],
  },

  /**
   * Increase the time pages stay compiled in memory.
   * By default, Next.js discards compiled pages after some time to save RAM.
   * This makes it feel like they need to be re-compiled every time.
   */
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 60 * 1000, // 1 hour (default is 15s-1min)
    // Number of pages that should be kept simultaneously
    pagesBufferLength: 20, // Keep up to 20 pages (default is 2)
  },

  /**
   * Tell webpack to resolve `.js` imports to `.ts` (and `.tsx`) first.
   * Required because our monorepo TypeScript packages use ESM-style `.js`
   * extensions in their source imports (e.g. `'./gateway.js'` → `gateway.ts`).
   * Without this, `transpilePackages` compiles the TypeScript source but
   * webpack fails to find the actual `.ts` file when the import uses `.js`.
   */
  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    }
    return config
  },
}

export default withNextIntl(config)
