# 🎟️ @ticketpulse/contracts

> **Core smart contracts for the TicketPulse platform, built using [Foundry](https://getfoundry.sh/).**
> 
> Handles the creation of events, minting of NFT tickets, secondary market (FIFO queues), and royalty distributions.

---

## 📑 Table of Contents

- [🏗️ Architecture Overview](#️-architecture-overview)
- [📁 Directory Structure](#-directory-structure)
- [🛠️ Setup & Environment Variables](#️-setup--environment-variables)
- [💻 Local Development Workflow](#-local-development-workflow)
- [🦊 Remix Desktop IDE](#-remix-desktop-ide)
- [🚀 Production / Testnet Deployment](#-production--testnet-deployment)
- [🧪 Testing](#-testing)
- [⚙️ Configuration](#️-configuration)

---

## 🏗️ Architecture Overview

The system is built around two primary smart contracts, designed for maximum gas efficiency and strict market control:

### 1. `TicketPulseFactory.sol` (The Event Factory)

- **Purpose:** Acts as the central registry and creator for all events on the platform.
- **Gas Efficiency (EIP-1167):** Instead of deploying the huge `TicketPulseEvent` code every time a user creates an event, the Factory deploys a "Minimal Proxy Clone". This costs a fraction of the gas, pointing the logic to a single "Implementation" contract.
- **Indexing:** Emits an `EventCreated` log. The Graph Node listens exclusively to this factory to dynamically discover and start indexing new event contracts.

### 2. `TicketPulseEvent.sol` (The NFT Ticket & Marketplace)

- **Purpose:** A standalone ERC-721 contract representing a single event. It acts as both the ticket issuer and a decentralized exchange.
- **Primary Minting:** Handles direct ticket purchases from the organizer with an anti-bot wallet limit.
- **FIFO Secondary Market:** Direct wallet-to-wallet NFT transfers are intentionally blocked (via overriding `_update`). Users _must_ use the built-in `listForSale` and `placeBuyOrder` functions. This guarantees that **royalties are strictly enforced** and collected on every secondary resale.
- **Gas-Guarded Queues:** Features advanced logic to prevent "gas traps" when processing the order queues.
- **Dynamic Metadata:** `tokenURI` generates Base64 JSON directly on-chain, eliminating the need to upload thousands of individual JSON files to IPFS. Only the cover image CID is stored.

---

## 📁 Directory Structure

- `src/`: Core Solidity source code.
- `test/`: Matchstick/Foundry test files (100% coverage enforced).
- `script/`: Deployment scripts for local and public networks.

---

## 🛠️ Setup & Environment Variables

To interact with or deploy these contracts, you need to set up your environment:

1. **Environment Config**: Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. **Install Dependencies**: This will install node-based tools (like `solhint`) and automatically trigger `forge install` to fetch Solidity libraries (OpenZeppelin, etc.):
   ```bash
   pnpm install
   ```
3. **Build & Verify**: Compile the contracts to ensure everything is set up correctly:
   ```bash
   pnpm build
   ```
4. **Local Development**: For local development, the default `PRIVATE_KEY` in `.env.example` belongs to the first Anvil test account. You don't need to change it.
5. **Testnet/Mainnet Deployment**: For public networks, you must provide real RPC URLs (from Alchemy/Infura) and your own `PRIVATE_KEY` in the `.env` file.
6. **Base External URL:** You should set `BASE_EXTERNAL_URL` to your production domain (e.g., `https://ticketpulse.app/event/`). This URL is stored in the `TicketPulseFactory` and used to generate `external_url` links in the NFT metadata. If your domain changes later, you can update it in one place via `setBaseExternalUrl` on the Factory contract.

---

## 💻 Local Development Workflow

When building the frontend or testing locally, you want a fast, instant-mining blockchain.

### 1. Start the Local Node

If you have already started the infrastructure using **Docker Compose** (from the root directory), Anvil is **already running** in a container, and you can skip this step.

If you are NOT using Docker and want to start a standalone node, run Anvil in a separate terminal:

```bash
anvil
```

### 2. Deploy Contracts Locally

Once Anvil is running, deploy your contracts to it:

```bash
pnpm run deploy:local
```

> [!NOTE]
> This script uses the `local` RPC endpoint defined in `foundry.toml` (`http://localhost:8545`).

---

## 🦊 Remix Desktop IDE

If you prefer using the **Remix Desktop IDE** for development, you can simply open the `packages/contracts` folder directly in the application.

> [!NOTE]
> When opening this project in Remix, it will automatically generate some metadata files and folders (like `remix.config.json`, `.deps/`, `.states/`, and `artifacts/`). These have already been added to our `.gitignore` so they won't clutter your Git commits.

---

## 🚀 Production / Testnet Deployment

When you are ready to deploy to a live network (Base Sepolia for staging,
Base Mainnet for production), the workflow changes slightly: you need real
funds to pay gas, and you'll want to verify your source code on the public
block explorer so anyone can read it.

### Prerequisites

#### 1. A funded deployer wallet

Generate (or pick) a fresh wallet you'll use only for deploys, then fund it:

| Network | How to fund |
| :--- | :--- |
| **Base Sepolia** | Free testnet faucets:<br>• <https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet><br>• <https://www.alchemy.com/faucets/base-sepolia> |
| **Base Mainnet** | Bridge real ETH via <https://bridge.base.org> or buy directly on a CEX with Base support |

Paste the private key into `PRIVATE_KEY` in `packages/contracts/.env`.
**Never commit a key that holds mainnet funds** — `.env` is already in
`.gitignore`, just don't accidentally paste it anywhere else.

#### 2. RPC URLs

Pick **one** provider — any of them works for both Sepolia and Mainnet.
Free tiers are more than enough for thesis-scale deployments.

| Provider | Free tier | Sign-up |
| :--- | :--- | :--- |
| **Alchemy** | 300M CU / month | <https://dashboard.alchemy.com> |
| **Infura** | 100k req / day | <https://app.infura.io> |
| **QuickNode** | Limited free tier | <https://www.quicknode.com> |

After creating a project, copy the HTTPS endpoint and paste it into:

```dotenv
RPC_URL_BASE_SEPOLIA=https://base-sepolia.g.alchemy.com/v2/<YOUR_KEY>
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/<YOUR_KEY>
```

> [!TIP]
> The same RPC URL is reused by `@ticketpulse/web`'s `SERVER_RPC_URL` and
> by `@ticketpulse/subgraph` when targeting The Graph Studio. Stick to one
> provider so your dashboards stay in a single place.

#### 3. Basescan API key (for source verification)

The deploy scripts auto-verify the source code on Basescan after each
deployment — the verified contract becomes browsable and callable via
the explorer UI.

1. Go to <https://basescan.org/myapikey> and create a free account.
2. Click **Add → Create New API Key**.
3. The **same key** works for both networks:
   - Base Mainnet → <https://basescan.org>
   - Base Sepolia → <https://sepolia.basescan.org>
4. Paste it into `BASESCAN_API_KEY` in `.env`.

> [!NOTE]
> Basescan is powered by Etherscan and uses the V2 Multi-chain API.
> If you also work on Optimism, Arbitrum, etc., reuse the same key for
> every Etherscan-family explorer.

### Deployment commands

**Deploy to Base Sepolia (staging / thesis demo):**

```bash
pnpm run deploy:base-sepolia
```

**Deploy to Base Mainnet (production):**

```bash
pnpm run deploy:base
```

These scripts will automatically:

1. Compile the contracts (`forge build`).
2. Broadcast the deployment transaction to the specified network.
3. Wait for block confirmations.
4. **Verify the source code** on Basescan using `BASESCAN_API_KEY`.

The broadcast metadata (deployer, factory address, transaction hashes,
gas used) is written to
`packages/contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json`.

### After deploying

1. **Grab the factory address** from the script output (also in
   `run-latest.json` under `transactions[].contractAddress` for the
   factory entry — the second `CREATE` after the implementation clone).

2. **Confirm verification** by opening the contract on the explorer:

   | Network | Direct URL pattern |
   | :--- | :--- |
   | Base Sepolia | `https://sepolia.basescan.org/address/<factory_address>#code` |
   | Base Mainnet | `https://basescan.org/address/<factory_address>#code` |

   You should see the green "✔ Source code verified" badge, the Solidity
   source, and an interactive "Read/Write Contract" tab.

3. **Deploy the subgraph** — see [`../subgraph/README.md`](../subgraph/README.md).
   The deploy script auto-syncs the factory address from
   `broadcast/Deploy.s.sol/<chainId>/run-latest.json` so you don't have
   to copy-paste it manually.

4. **Wire the frontend** — paste the factory address into
   `apps/web/.env.local` as `NEXT_PUBLIC_FACTORY_ADDRESS` and switch
   `NEXT_PUBLIC_CHAIN_ID` to `84532` (Sepolia) or `8453` (Mainnet).
   See [`../../apps/web/README.md`](../../apps/web/README.md#-production--staging-deployment).

> [!WARNING]
> Contracts are **immutable** once deployed. Run the local + Matchstick
> test suites first (`pnpm test` here and in the subgraph package), then
> deploy to Sepolia and exercise the full end-to-end flow before going
> anywhere near mainnet. Mistakes on mainnet cost real money and can
> only be fixed with a brand-new deployment.

---

## 🧪 Testing

We enforce strict test coverage for all financial and queueing logic.

```bash
# Run all tests
pnpm test

# Run tests with gas reporting
forge test --gas-report
```

For full integration tests with a real node, see the [E2E package](../e2e/README.md).

---

## ⚙️ Configuration (`foundry.toml`)

The `foundry.toml` file is configured with "RPC aliases" and Etherscan keys. This means instead of passing long URLs in the terminal, we can just say `--rpc-url base_sepolia`, and Foundry will read the actual URL from your `.env` file automatically.

