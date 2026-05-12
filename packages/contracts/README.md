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

When you are ready to deploy to a live network (e.g., Base Sepolia or Mainnet Base), the workflow changes slightly. You need real funds and you want to verify your contract source code on block explorers.

### Prerequisites

1. Ensure your `.env` has a funded `PRIVATE_KEY`.
2. Ensure you have the correct `RPC_URL_BASE_SEPOLIA` or `RPC_URL_BASE` set.
3. Ensure you have a `BASESCAN_API_KEY` for source code verification.

### Deployment Commands

**Deploy to Base Sepolia (Testnet):**

```bash
pnpm run deploy:base-sepolia
```

**Deploy to Base (Mainnet):**

```bash
pnpm run deploy:base
```

These scripts will automatically:
1. Compile the contracts.
2. Broadcast the deployment transaction to the specified network.
3. Wait for block confirmations.
4. Verify the source code on Basescan using the API key from `.env`.

> [!TIP]
> **Next Steps:** After successful deployment, copy the **Factory address** and proceed to [deploy the subgraph](../subgraph/README.md) to start indexing your events on the live network.

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

