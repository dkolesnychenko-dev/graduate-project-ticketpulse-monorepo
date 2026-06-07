# 🎟️ TicketPulse Monorepo

> **A decentralized NFT ticketing platform with strict secondary market control (FIFO queues), built using Foundry, The Graph, and IPFS.**
> 
> This repository is managed using [Turborepo](https://turbo.build/) and `pnpm` workspaces for maximum efficiency and developer experience.

---

## 📑 Table of Contents

- [📦 Packages Overview](#-packages-overview)
- [🛠️ Prerequisites](#️-prerequisites)
- [🚀 Zero-to-Hero Setup Guide](#-zero-to-hero-setup-guide)
- [✨ Code Quality & Development](#-code-quality--development)
- [🧹 Environment Cleanup](#-environment-cleanup)

---

## 📦 Packages Overview

Detailed documentation, architectural decisions, and **production deployment instructions** are located in the `README.md` of each respective package. Please refer to them for deep dives into specific domains:

| Package | Description |
| :--- | :--- |
| 📜 **[@ticketpulse/contracts](./packages/contracts/README.md)** | Core Foundry smart contracts (Factory, Event, FIFO marketplace, Royalties). |
| 🔍 **[@ticketpulse/subgraph](./packages/subgraph/README.md)** | The Graph indexing layer, optimized for fast frontend GraphQL queries and data aggregation. |
| 🌐 **[@ticketpulse/ipfs](./packages/ipfs/README.md)** | IPFS integration SDK (Pinata V3 & local Kubo) for uploading and fetching event metadata and images. |
| 🧰 **[@ticketpulse/sdk](./packages/sdk/README.md)** | Shared TypeScript SDK: types, Wagmi/Apollo factories, identity (EIP-712 + QR), `RichEvent` builder, Chainlink reader. No React. |
| 🧪 **[@ticketpulse/e2e](./packages/e2e/README.md)** | Full pipeline integration tests verifying the end-to-end flow: Blockchain ↔ Subgraph ↔ IPFS. |
| 🖥️ **[@ticketpulse/web](./apps/web/README.md)** | Next.js 15 frontend (React 19, FSD, Tailwind, shadcn/ui, Wagmi + RainbowKit, Apollo). |

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following **system-level** tools installed (they cannot be installed via `pnpm`):

- **Node.js** (v18+) & **pnpm** (v8+)
- **Foundry** (Solidity toolchain: `forge`, `anvil`, `cast`) — [Official Installation Guide](https://book.getfoundry.sh/getting-started/installation)
- **Docker Desktop** (Required for the Graph Node, PostgreSQL, and IPFS)

> [!NOTE]
> **The Graph CLI** and other development tools are listed as project dependencies and will be installed automatically during **Step 1**.

---

## 🚀 Zero-to-Hero Setup Guide

Follow this sequential, step-by-step guide to launch the entire TicketPulse ecosystem on your local machine from an absolute blank state (e.g., right after `git clone`).

> [!TIP]
> **Windows Users:** For the best experience, use **Git Bash** or **WSL2**. Standard PowerShell (v5.1) and Command Prompt do not support the `&&` operator used in several commands below.

### Step 1: Install Dependencies

Install all node modules and Foundry smart contract libraries across the monorepo. We have automated the Foundry installation, so a single command handles everything:

```bash
pnpm install
```

### Step 2: Build & Verification

Before starting any services, verify that all contracts and subgraph configurations compile correctly. This is your "sanity check".

```bash
pnpm build
```

This command uses **Turborepo** to:
1. Compile all Solidity smart contracts.
2. Generate AssemblyScript types for the Subgraph (codegen).
3. Build the Subgraph WASM modules.
4. Sync contract ABIs and generate GraphQL types for the SDK.

### Step 3: Environment Variables

Smart contracts require specific configuration (like private keys) for deployment. You need to create the `.env` file for the contracts package from the provided template:

```bash
cp packages/contracts/.env.example packages/contracts/.env
```

> [!TIP]
> For local development, the default Anvil `PRIVATE_KEY` provided in the `.env.example` is already funded and ready to use out of the box.

### Step 4: Start Infrastructure

We need to launch our local IPFS node, PostgreSQL database, The Graph Node, and a local blockchain (Anvil).

> [!IMPORTANT]
> **Docker Desktop** must be running on your machine before you proceed.

1. **Start Background Services**: Run the following command in your terminal. Since it runs in detached mode, you can continue using the same terminal window.
   ```bash
   pnpm infra:up
   ```

2. **Start Local Blockchain**: Open a **new, separate terminal** and start Anvil. **Leave this terminal open** while you develop!
   ```bash
   anvil
   ```

### Step 5: Deploy Smart Contracts

With Anvil running, deploy the `TicketPulseFactory` and necessary implementation contracts to your local blockchain. Open a third terminal (or use Terminal 1):

```bash
pnpm --filter @ticketpulse/contracts run deploy:local
```

> [!TIP]
> The deployment details (including the Factory address) are automatically saved to `packages/contracts/broadcast`, which the subgraph deployment script will use in the next step.

### Step 6: Deploy Subgraph

Now compile and deploy the subgraph to your local Graph Node. We have automated the configuration, so you **no longer need to manually copy-paste** the contract address.

1. **Create the subgraph space** on your local node:
   ```bash
   pnpm --filter @ticketpulse/subgraph run create:local
   ```

2. **Deploy the subgraph**: This command will automatically extract the latest Factory address from the Foundry logs and deploy the subgraph.
   ```bash
   pnpm --filter @ticketpulse/subgraph run deploy:local
   ```

_Your local GraphQL API endpoint is now live at `http://localhost:8000/subgraphs/name/ticketpulse/subgraph`._

### Step 7: Verify via E2E Tests

To ensure absolutely everything is connected correctly (Anvil $\rightarrow$ Graph Node $\rightarrow$ IPFS), run the End-to-End integration test suite:

```bash
pnpm --filter @ticketpulse/e2e run test
```

If the tests pass, your entire local ecosystem is **99.99% operational**! 🎉

> [!TIP]
> **Troubleshooting IPFS Timeouts:** If the E2E tests hang or time out during the `Uploading to IPFS...` stage, it is likely due to the local IPFS container (Kubo) getting into a stuck state on Windows. To fix this, simply restart the container:
> ```bash
> docker restart ticketpulse-ipfs
> ```

### Step 8: Run the Web App

The frontend lives in `apps/web` and uses Next.js 15 + Turbopack.
**Local development needs zero RPC keys** — Anvil + local Graph Node +
Kubo IPFS are all you've already started.

```bash
cp apps/web/.env.example apps/web/.env.local
# The default file ("SECTION A") is pre-wired for local dev. The only
# variable you must change is NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID —
# grab a free project id at https://cloud.walletconnect.com (~30 s).

pnpm --filter @ticketpulse/web dev              # → http://localhost:3000
```

The dev script transparently runs SDK codegen (via Turbo's task graph)
before starting Next.js, so typed ABIs + GraphQL document nodes are
always fresh. Re-run codegen manually only when you change a contract
or the subgraph `schema.graphql`:

```bash
pnpm --filter @ticketpulse/sdk codegen
```

For **production / Base Sepolia / Base Mainnet** deployment (Pinata +
The Graph Studio + an RPC provider), follow the dedicated guide in
[`apps/web/README.md`](./apps/web/README.md#-production--staging-deployment).
It walks through every external account (WalletConnect Cloud, Pinata,
Alchemy / Infura / QuickNode) plus the Vercel environment-variable mapping.

> [!NOTE]
> **URL-based i18n is already wired.** All routes live under an
> `app/[locale]/` segment with `localePrefix: 'as-needed'` — the default
> locale (English) ships without a URL prefix, future languages will
> auto-prefix (`/uk/events`). See
> [`apps/web/README.md#localisation`](./apps/web/README.md#-localisation)
> for the step-by-step recipe to add a new language.

---

## ✨ Code Quality & Development

We maintain high standards for code quality across the monorepo using automated tools. These are orchestrated via **Turborepo** for speed.

### Core Commands

| Task | Command | Description |
| :--- | :--- | :--- |
| **Lint** | `pnpm lint` | Runs ESLint for TS/JS and Solhint for Solidity across all packages. |
| **Format** | `pnpm format` | Automatically fixes code style using Prettier (TS/JS) and Forge fmt (Solidity). |
| **Type Check** | `pnpm typecheck` | Validates TypeScript types and compiles Solidity contracts. |
| **Check All** | `pnpm format:check` | Verifies that code is correctly formatted without modifying files. |

### Development Workflow

When contributing, it is recommended to run `pnpm format` before committing to ensure consistent style. Our CI/CD pipeline will verify this using `pnpm format:check` and `pnpm lint`.

---

## 🧹 Environment Cleanup

If you ever need to "nuke" the environment and start completely fresh (e.g., if the Subgraph is out of sync with the Blockchain or data is corrupted):

1. **Stop Blockchain**: Close Anvil (Ctrl+C in its terminal). Since Anvil is usually in-memory, stopping it wipes all transactions and resets the block height to 0.
2. **Deep Clean Code**: Wipe all build artifacts, caches, and `node_modules`:
   ```bash
   pnpm clean:full
   ```
3. **Wipe Infrastructure State**: Stop Docker containers and **delete their volumes**.
   ```bash
   pnpm infra:down -v
   ```
   
> [!WARNING]
> The `-v` flag is critical. It deletes the PostgreSQL database and IPFS storage. Without it, the Graph Node will remember the "old" blockchain state (e.g., block 100) while the new Anvil starts at block 0, causing a permanent synchronization error ("Block not found").

4. **Restart**: Return to **[Step 1](#step-1-install-dependencies)** to re-install (both `pnpm install` and `forge install`) and re-launch the ecosystem from a pristine state.

