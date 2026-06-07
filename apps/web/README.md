# 🎟️ @ticketpulse/web

> **Next.js 15 frontend for the TicketPulse decentralised NFT-ticketing platform.**
>
> Built with React 19, TypeScript, Tailwind v3 + shadcn/ui, Wagmi 2 +
> Viem 2 + RainbowKit 2, Apollo Client (GraphQL → The Graph), TanStack
> Query (REST aggregation), next-intl, and Zustand for ephemeral UI
> state. Organised by **Feature-Sliced Design** (FSD).

---

## 📑 Table of Contents

- [🛠️ Setup](#%EF%B8%8F-setup)
- [📁 FSD layout](#-fsd-layout)
- [🔌 Edge API routes](#-edge-api-routes)
- [🌐 Public vs Protected routes](#-public-vs-protected-routes)
- [🎨 Brand tokens](#-brand-tokens)
- [🌍 Localisation](#-localisation)
- [🧰 Codegen](#-codegen)

---

## 🛠️ Setup

`@ticketpulse/web` is part of the monorepo. The setup splits into two
paths: **Local development** (zero RPC keys, everything on your laptop)
and **Production / staging** (Base network + Pinata + an RPC provider).

> [!TIP]
> The Turborepo pipeline wires `dev` and `build` to **automatically run
> codegen first**. You don't have to remember to call
> `pnpm --filter @ticketpulse/sdk codegen` manually — it just works on
> a clean clone.

### 🧪 Local development (Anvil + Kubo + zero RPC keys)

The fastest path: one Docker stack + Anvil + the contracts/subgraph
deploys + the Next.js dev server. No API keys except a free
WalletConnect project id (~30 s sign-up).

```bash
# ── From the monorepo root ──────────────────────────────────────────

# 1. Install everything once.
pnpm install

# 2. Compile contracts and run codegen. Subsequent runs are cached.
pnpm build

# 3. Start the local infrastructure (Postgres, Graph Node, Kubo IPFS).
#    Docker Desktop must be running.
pnpm infra:up

# 4. Open a second terminal and keep Anvil alive while you develop.
anvil

# 5. Deploy contracts + subgraph to your local chain.
pnpm --filter @ticketpulse/contracts run deploy:local     # → Factory @ 0xe7f1725E…
pnpm --filter @ticketpulse/subgraph run create:local      # one-time per environment
pnpm --filter @ticketpulse/subgraph run deploy:local      # syncs Factory addr automatically

# 6. Configure + run the web app.
cp apps/web/.env.example apps/web/.env.local
# SECTION A is enabled by default — only the WalletConnect id is mandatory.
# Sign up at https://cloud.walletconnect.com (30 s) and paste the
# Project ID into NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.

pnpm --filter @ticketpulse/web dev                        # → http://localhost:3000
```

What's running once everything is green:

| Service | Address | Purpose |
| :--- | :--- | :--- |
| Anvil | `http://localhost:8545` | Local EVM (chainId `31337`) |
| Graph Node (GraphQL) | `http://localhost:8000/subgraphs/name/ticketpulse/subgraph` | Indexed query API |
| Graph Node (admin) | `http://localhost:8020` | `graph deploy` target |
| Kubo IPFS API | `http://127.0.0.1:5001` | Uploads from `/api/ipfs/upload` |
| Kubo IPFS gateway | `http://127.0.0.1:8080` | `<Image />` + view-aggregator |
| Next.js | `http://localhost:3000` | The app |

> [!TIP]
> **No real ETH needed.** Anvil seeds 10 accounts with 10 000 ETH each.
> Import any of the printed private keys into MetaMask (Settings →
> Networks → Add custom network with `RPC: http://127.0.0.1:8545`,
> `Chain ID: 31337`) and you're ready to mint test events.

### 🚀 Production / staging deployment

You need accounts on three external services. Free tiers cover thesis-
scale traffic.

| Service | Purpose | Free tier link |
| :--- | :--- | :--- |
| **WalletConnect Cloud** | Wallet connector project id | <https://cloud.walletconnect.com> |
| **Pinata** | IPFS pinning + dedicated read gateway | <https://app.pinata.cloud/developers/api-keys> |
| **RPC provider** | Server-side Chainlink reads | Pick one ↓ |

For the RPC provider, any of these works (free tier sufficient):

| Provider | Free tier | Sign-up |
| :--- | :--- | :--- |
| **Alchemy** | 300M CU/month | <https://dashboard.alchemy.com> |
| **Infura** | 100k req/day | <https://app.infura.io> |
| **QuickNode** | Limited free tier | <https://www.quicknode.com> |

> [!TIP]
> The same RPC URL is also consumed by `packages/contracts` (deploy
> scripts) and `packages/subgraph` (Graph Studio). Reusing one provider
> across the monorepo keeps your dashboard quotas in one place.

End-to-end flow:

```bash
# 1. Deploy the contracts to Base Sepolia (or `:base` for mainnet).
#    Requires a funded private key — see packages/contracts/README.md.
pnpm --filter @ticketpulse/contracts run deploy:base-sepolia

# 2. Deploy the subgraph to The Graph Studio.
#    Requires authenticating once with `pnpm auth:studio` — see
#    packages/subgraph/README.md.
pnpm --filter @ticketpulse/subgraph run deploy:studio:sepolia

# 3. Configure the web app.
cp apps/web/.env.example apps/web/.env.local
#  • Comment SECTION A, uncomment SECTION B in the file.
#  • Fill: NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_FACTORY_ADDRESS,
#          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_PUBLIC_SUBGRAPH_URL,
#          PINATA_JWT, PINATA_GATEWAY, SERVER_RPC_URL.
#  • Optional: INFURA_GATEWAY_URL (Pinata fallback), GRAPH_API_KEY (Studio).

# 4. Build + verify locally before pushing.
pnpm --filter @ticketpulse/web build
pnpm --filter @ticketpulse/web start
```

When deploying to Vercel, mirror the same variables in the Vercel
dashboard's **Environment Variables** section. The `NEXT_PUBLIC_*` keys
go to "Production / Preview / Development"; secrets (`PINATA_JWT`,
`SERVER_RPC_URL`, `GRAPH_API_KEY`) stay in "Production" only.

### 🔄 Re-running codegen

| Trigger | Command |
| :--- | :--- |
| Contract change (`.sol`) | `pnpm --filter @ticketpulse/contracts build` — Turbo re-runs `codegen` on the next `dev`/`build` |
| Subgraph schema change (`schema.graphql`) | `pnpm --filter @ticketpulse/sdk codegen` |
| GraphQL query change in SDK | `pnpm --filter @ticketpulse/sdk codegen:graphql` |
| Target The Graph Studio schema | `GRAPHQL_SCHEMA_URL=https://api.studio.thegraph.com/query/<id>/.../version/latest pnpm --filter @ticketpulse/sdk codegen:graphql` |

By default codegen reads the local `packages/subgraph/schema.graphql`
file (no internet / no running infrastructure needed). Override via
`GRAPHQL_SCHEMA_URL` only when you want to introspect a deployed
subgraph.

### 📋 Variable reference

| Variable | Used by | Required for local | Required for prod |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_CHAIN_ID` | client + server | ✅ (`31337`) | ✅ (`8453` / `84532`) |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | client + server | ✅ (deterministic) | ✅ (from deploy log) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | client | ✅ | ✅ |
| `NEXT_PUBLIC_SUBGRAPH_URL` | client + server | ✅ (`localhost:8000…`) | ✅ (Studio URL) |
| `NEXT_PUBLIC_IPFS_GATEWAY_URL` | client | ✅ (`http://127.0.0.1:8080`) | optional (defaults to `https://ipfs.io`) |
| `INFURA_GATEWAY_URL` | `/api/ipfs/[cid]` (fallback) | — | optional Pinata fallback |
| `NEXT_PUBLIC_CHAINLINK_ETH_EUR_FEED` | client + server | — | optional override |
| `NEXT_PUBLIC_BASE_EXTERNAL_URL` | client (NFT metadata) | optional | recommended |
| `MOCK_CHAINLINK_EUR_RATE` | `/api/chainlink` | ✅ (Anvil has no feeds) | — |
| `SERVER_RPC_URL` | `/api/chainlink` | — | ✅ |
| `PINATA_JWT` + `PINATA_GATEWAY` | `/api/ipfs/upload` | — | ✅ |
| `GRAPH_API_KEY` | `/api/graphql` | optional | optional |

Every variable is validated with Zod at module load — typos fail fast
with an aggregated error message pointing at the offending field.

## 📁 FSD layout

The web application is structured using **Feature-Sliced Design (FSD)**. This methodology decomposes the frontend into layers based on their business value and technical responsibility.

```
src/
├── app/                         # Layer 5: App & Routing
│   ├── [locale]/                # Locale-prefixed segment (next-intl)
│   │   ├── (public)/            # No-wallet routes (Landing, How it works)
│   │   ├── (app)/               # WalletGuard-protected routes (Events, Tickets)
│   │   ├── layout.tsx           # Root: fonts, providers, NextIntlClientProvider
│   │   ├── error.tsx, loading.tsx, not-found.tsx
│   ├── api/                     # Edge runtime proxies (locale-agnostic)
│   └── globals.css              # Tailwind + brand design tokens
│
├── widgets/                     # Layer 4: Composition
│   ├── providers/               # Global context (Wagmi, Apollo, Query, Theme)
│   ├── header/, footer/         # UI Chrome
│   ├── marketplace/             # EventGrid + SearchBar composition
│   └── event-detail/            # Hero + Info + Marketplace orchestration
│
├── features/                    # Layer 3: User Interactions
│   ├── wallet-connect/          # Connection flows and guards
│   ├── transaction-tracker/     # Global TX monitoring and revert decoding
│   ├── create-event/            # Multi-step creation workflow
│   ├── buy-ticket/              # Smart contract purchase logic
│   └── qr-generator/            # Sig_B generation and QR rendering
│
├── entities/                    # Layer 2: Business Entities
│   ├── event/                   # EventCard, CoverImage, PriceDisplay
│   ├── ticket/                  # TicketStatusBadge, Ownership logic
│   ├── user/                    # AddressDisplay, Profile logic
│   └── activity/                # Domain-specific logging UI
│
└── shared/                      # Layer 1: Infrastructure
    ├── ui/                      # shadcn/ui primitives (atoms/molecules)
    ├── lib/                     # Utils: cn(), IPFS config, Apollo clients
    ├── stores/                  # Zustand: ephemeral UI and wallet state
    ├── hooks/                   # useCountdown, useEthEurRate
    ├── env/                     # Zod-validated environment config
    └── i18n/                    # next-intl config + messages
```

### 🏛️ The Five Layers

1.  **Shared (Foundation)**: Contains purely technical, domain-agnostic tools. Components here (buttons, inputs) don't know about "Tickets" or "Events".
2.  **Entities (Domain)**: Defines the core data structures and their basic UI representations. An `EventCard` belongs here because it only displays event data without implementing complex actions like "Buy".
3.  **Features (Interactions)**: Implement specific user actions. A "Buy Ticket" button with its associated modal and contract interaction logic is a feature. Features often connect multiple entities.
4.  **Widgets (Composition)**: Self-contained UI blocks that assemble features and entities into large, functional units (e.g., a `Header` that includes the `WalletConnect` feature).
5.  **App (Orchestration)**: The entry point. Handles routing, global layouts, and wires together all lower layers.

### 🚦 Strict Dependency Rules

To prevent circular dependencies and maintain low coupling, FSD enforces a **downward-only** import policy:

*   **Rule 1**: A layer can only import from layers **below** it (e.g., `features` can import from `entities`, but never from `widgets`).
*   **Rule 2**: Cross-imports within the same layer are strictly forbidden (e.g., `features/buy-ticket` cannot import from `features/wallet-connect`). Move shared logic to a lower layer.
*   **Rule 3**: Components should only export their public API via `index.ts` (public API pattern) to hide internal implementation details.

These rules are enforced via ESLint (`import/order` and custom FSD boundaries).

---

## 🔌 Edge API routes

All four routes run on Vercel Edge Functions. They exist to **hide
secrets**, **aggregate data**, and **cache aggressively**.

| Route | Purpose | Cache |
| :--- | :--- | :--- |
| `POST /api/graphql` | Subgraph proxy (adds `Authorization`) | `no-store` |
| `POST /api/ipfs/upload` | Pinata upload (cover image / metadata JSON) | n/a |
| `GET  /api/ipfs/[cid]` | View-aggregator with gateway fallback | `s-maxage=300` |
| `GET  /api/chainlink` | ETH/EUR rate from Chainlink Aggregator | `s-maxage=60, swr=300` |
| `GET  /api/events` | Aggregated `RichEvent[]` (Shared Service) | `s-maxage=60, swr=120` |

---

## 🌐 Public vs Protected routes

| URL (default locale) | URL (other locale) | Group | Notes |
| :--- | :--- | :--- | :--- |
| `/` | `/<locale>` | `(public)` | Landing — F-0.1 |
| `/how-it-works` | `/<locale>/how-it-works` | `(public)` | Web3 education — F-0.2 |
| `/events` | `/<locale>/events` | `(app)` | Marketplace catalog — F-5 |
| `/events/create` | `/<locale>/events/create` | `(app)` | Organiser flow — F-1 |
| `/events/[address]` | `/<locale>/events/[address]` | `(app)` | Detail page — F-23 + F-8 |
| `/tickets` | `/<locale>/tickets` | `(app)` | Five-section ticket list — F-7 |
| `/buy-requests` | `/<locale>/buy-requests` | `(app)` | Active + completed buy orders — F-13 |
| `/organizer` | `/<locale>/organizer` | `(app)` | Offset-paginated organiser dashboard — F-2 |

The default locale (`en`) is never prefixed (`localePrefix: 'as-needed'`).
Non-default locales always carry the prefix (`/uk/events`). The
middleware (`apps/web/middleware.ts`) handles detection + rewriting
transparently.

`WalletGuard` in `app/[locale]/(app)/layout.tsx` enforces the F-0
architectural rule "no wallet ⇒ no events".

---

## 🎨 Brand tokens

Colours come from the official Style Guide and are wired to CSS custom
properties so theme switching is a single `data-theme` attribute swap:

```text
DARK    Base #121614  Surface #1E2522  Primary #DFFF00  Secondary #EF5777  Text #F4F5F7
LIGHT   Base #F4F5F7  Surface #FFFFFF  Primary #1A4D2E  Secondary #DFFF00  Text #121614
SEMANT  Success #00FFC2  Warning #F59E0B  Error #EF4444  Disabled #71717A
```

Fonts: **Inter** (sans) + **JetBrains Mono** (mono), both with
`tabular-nums` enabled on every `[data-numeric]` element so price
ledgers and countdowns don't shuffle horizontally.

QR codes always render against pure white regardless of the active
theme so cheap industrial scanners read them reliably.

---

## 🌍 Localisation

The frontend ships English-only today, but the full URL-based i18n
infrastructure is already wired so adding a language is mechanical.

### Architecture

```
src/shared/i18n/
├── routing.ts          # defineRouting(): locales, defaultLocale, localePrefix
├── navigation.ts       # createNavigation(): locale-aware <Link>, useRouter…
├── request.ts          # getRequestConfig(): server-side message loading
├── config.ts           # back-compat re-exports for legacy imports
├── global.d.ts         # IntlMessages typed against en.json (autocomplete)
└── messages/
    └── en.json         # canonical message catalog

apps/web/middleware.ts  # next-intl middleware on the request boundary
```

### URL strategy — `localePrefix: 'as-needed'`

| Visitor sees | URL  | Rendered as |
| :--- | :--- | :--- |
| Default locale (en) | `/events` | `[locale]=en` |
| Any other locale | `/uk/events` | `[locale]=uk` |

This keeps URLs clean for the primary audience without sacrificing
locale-correct routing for everyone else.

### Adding a new locale (e.g. Ukrainian)

1. **Translate the catalog**

   Copy `messages/en.json` to `messages/uk.json` and translate the
   values. TypeScript will flag any missing key at compile time thanks
   to `global.d.ts`.

2. **Register the locale**

   ```ts
   // src/shared/i18n/routing.ts
   export const routing = defineRouting({
     locales: ['en', 'uk'] as const,
     defaultLocale: 'en',
     localePrefix: 'as-needed',
   })
   ```

3. **(Optional) Expose a switcher**

   Add a UI control that calls `useRouter().replace(pathname, { locale })`
   from `@/shared/i18n/navigation`. Nothing else needs to change —
   `<html lang>`, `<Link>` hrefs, redirects, and `Accept-Language`
   detection all pick up the new locale automatically.

### Conventions inside the catalog

- **Hierarchical keys**: grouped by feature (`events.list.title`, not
  flat `eventsListTitle`).
- **ICU plurals** for counts: `"activeOrders": "{count, plural, one {# active order} other {# active orders}}"`.
- **`t.rich()`** for inline markup — never embed `<strong>` HTML
  literals in JSX after a translation; pass a tag renderer instead.
- **Brand names stay literal**: `TicketPulse`, `MetaMask`, `Basescan`,
  `ETH`, `EUR`, `IPFS`, `WalletConnect`, `The Graph`, `Chainlink`.
- **Numbers, dates, currency**: formatted by SDK helpers
  (`formatDualPrice`, `formatDateTime`, `formatEth`) and interpolated
  through placeholders (`{amount}`, `{when}`). Don't concatenate.
- **Contract errors**: SDK returns the canonical error name; the
  `useContractErrorMessage` hook in `apps/web` maps the name to a
  localized `{title, description}` pair from `errors.contract.*`.

---

## 🧰 Codegen

```bash
pnpm --filter @ticketpulse/sdk codegen
```

1. **`sync:abis`** — reads `packages/contracts/out/*.json` and writes
   strongly-typed `as const` ABIs into
   `packages/sdk/src/contracts/__generated__/abis.ts`.
2. **`codegen:graphql`** — runs GraphQL Code Generator against the
   subgraph and emits the typed `graphql()` helper into
   `packages/sdk/src/graphql/__generated__/`.

Both outputs are `.gitignore`d. Re-run after every contract or schema
change.

---

## 🧨 High-Concurrency Frontend Load Testing (100k+ Users)

To ensure the frontend is capable of handling massive traffic spikes (like when a highly anticipated event goes live), we provide a dedicated HTTP load testing script that simulates tens of thousands of concurrent users hitting the Next.js server.

### Running the Load Test

Ensure your Next.js application is running locally (e.g., in another terminal using `pnpm --filter @ticketpulse/web dev` or `start`).

Then run the load tester:

```bash
# Run the default test (10,000 requests)
pnpm --filter @ticketpulse/web load-test

# Or simulate an extreme spike (100,000 requests):
TARGET_REQUESTS=100000 CHUNK_SIZE=1000 pnpm --filter @ticketpulse/web load-test
```

### Understanding Next.js Concurrency at Scale

When handling 100k requests on the frontend, several architectural principles apply:

1. **Static vs. Dynamic Rendering**: Pages that are static (e.g., `/how-it-works`) are served directly from Vercel's Edge CDN in production, bypassing the Node.js server entirely. This can easily handle 100k+ requests without breaking a sweat.
2. **Server-Side Rendering (SSR)**: Dynamic pages (e.g., user dashboards) require the server to render React components per request. During a spike, Node.js will queue these requests. Vercel automatically scales up serverless functions to handle this, but caching data (e.g., Subgraph queries) using `fetch` cache or TanStack Query is vital to prevent DB/RPC exhaustion.
3. **Connection Pooling**: The load test script uses `Connection: close` to prevent socket exhaustion on your local OS, mimicking diverse IPs connecting uniquely.

By running this test against your local dev server versus a production build (`next build && next start`), you can measure the dramatic performance differences Next.js offers when heavily optimized.
