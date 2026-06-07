# 🎟️ @ticketpulse/sdk

> **Shared TypeScript SDK for the TicketPulse ecosystem.**
>
> Pure logic — types, Wagmi/Apollo factories, identity & QR helpers,
> `RichEvent` builder, Chainlink reader, GraphQL queries, formatters,
> error decoder. **No React.** Consumed by `apps/web` today; ready for
> future mobile / validator apps.

---

## 📦 What's inside

| Sub-path | Purpose |
| :--- | :--- |
| `@ticketpulse/sdk/types` | `RichEvent`, `QrPayload`, `IdentityArtifact`, contract enums |
| `@ticketpulse/sdk/config` | Supported chains, env-var schemas (zod) |
| `@ticketpulse/sdk/constants` | `MAX_BATCH_SIZE`, `EIP712_DOMAIN`, cover-image limits |
| `@ticketpulse/sdk/contracts` | `as const`-typed ABIs (sync'd from Foundry artifacts) |
| `@ticketpulse/sdk/wagmi` | `createWagmiConfig({...})` factory |
| `@ticketpulse/sdk/apollo` | `createApolloClient({...})` factory + cache type-policies |
| `@ticketpulse/sdk/graphql` | `.graphql` queries + codegen output (`graphql()` helper) |
| `@ticketpulse/sdk/identity` | EIP-712 builder, `keccak256(sig)`, QR pack/unpack, encrypted backup |
| `@ticketpulse/sdk/services` | `buildRichEvent(s)`, `readEthEurRate`, IPFS view-aggregator |
| `@ticketpulse/sdk/formatting` | `formatDualPrice`, `truncateAddress`, `formatDateTime` |
| `@ticketpulse/sdk/errors` | `decodeContractError` + UX-ready `contractErrorMessage` |

The top-level `@ticketpulse/sdk` barrel re-exports everything for
convenience; the sub-paths above let tree-shaking remove what you don't
import.

---

## 🛠️ Setup

This package lives inside the monorepo and is wired via `pnpm` workspaces.

```bash
pnpm install              # installs the SDK + transitive deps
pnpm --filter @ticketpulse/sdk codegen
```

### What `codegen` does

1. **`sync:abis`** runs `scripts/sync-abis.mjs` and reads the latest
   Foundry artifacts from `packages/contracts/out/` to regenerate
   `src/contracts/__generated__/abis.ts`. Re-run after every contract
   change so viem / wagmi keep their type inference.

2. **`codegen:graphql`** runs GraphQL Code Generator against the
   subgraph schema (`http://localhost:8000/...` by default — override
   with `GRAPHQL_SCHEMA_URL`). Output: `src/graphql/__generated__/`
   containing the typed `graphql()` helper and fragment-masked types.

Both outputs are `.gitignore`d — regenerate on clean checkouts.

---

## 🧪 Testing

```bash
pnpm --filter @ticketpulse/sdk test         # vitest, no Docker needed
pnpm --filter @ticketpulse/sdk typecheck    # strict TS, including generated files
```

---

## 🧭 Design notes

- **No React.** Imports remain valid in any runtime — browser, Edge,
  Node 18+, future React-Native, future Tauri validator app.
- **Strict types end-to-end.** `as const` ABIs (via the sync script)
  let viem & wagmi infer return types; GraphQL types are generated
  from the schema; `zod` validates env at boot.
- **Shared-Service pattern.** `buildRichEvents()` runs identically in
  RSC, Edge routes, and tests so the row schema can never drift between
  initial render and "load more".
- **EUR-only fiat conversion** via Chainlink (`readEthEurRate`).
  Refresh policy: cached 60 s at the Edge so prices stay stable
  through a user session while honouring NFR-PERF-006.
- **Privacy-preserving identity.** Identity signatures stay on the
  user's device; only their `keccak256` lands on chain. The optional
  encrypted IPFS backup (`encryptIdentityBackup`) uses Web Crypto
  AES-GCM-256 with PBKDF2-SHA-256 / 600 000 iterations so users can
  restore "digital artifacts" across devices without us ever seeing
  plaintext.
