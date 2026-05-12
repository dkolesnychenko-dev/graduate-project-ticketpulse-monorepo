# 🎟️ TicketPulse Monorepo

Welcome to the **TicketPulse** monorepo! This is a decentralized NFT ticketing platform with a focus on strict secondary market control (FIFO queues), built using Foundry, The Graph, and IPFS.

This repository is managed using [Turborepo](https://turbo.build/) and `pnpm` workspaces for maximum efficiency and developer experience.

---

## 📂 Table of Contents

- [📦 Packages Overview](#-packages-overview)
- [🛠️ Prerequisites](#️-prerequisites)
- [🚀 Zero-to-Hero Setup Guide](#-zero-to-hero-setup-guide)
  - [Step 1: Install Dependencies](#step-1-install-dependencies)
  - [Step 2: Build & Verification](#step-2-build--verification)
  - [Step 3: Environment Variables](#step-3-environment-variables)
  - [Step 4: Start Infrastructure](#step-4-start-infrastructure)
  - [Step 5: Deploy Smart Contracts](#step-5-deploy-smart-contracts)
  - [Step 6: Deploy Subgraph](#step-6-deploy-subgraph)
  - [Step 7: Verify via E2E Tests](#step-7-verify-via-e2e-tests)
- [✨ Code Quality & Development](#-code-quality--development)
- [🧹 Environment Cleanup](#-environment-cleanup)

---

## 📦 Packages Overview

Detailed documentation, architectural decisions, and **production deployment instructions** are located in the `README.md` of each respective package. Please refer to them for deep dives into specific domains:

| Package                                                         | Description                                                                                                                  |
| :-------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| 📜 **[@ticketpulse/contracts](./packages/contracts/README.md)** | Core Foundry smart contracts (Factory, Event, FIFO marketplace, Royalties).                                                  |
| 🔍 **[@ticketpulse/subgraph](./packages/subgraph/README.md)**   | The Graph indexing layer, optimized for fast frontend GraphQL queries and data aggregation.                                  |
| 🌐 **[@ticketpulse/ipfs](./packages/ipfs/README.md)**           | IPFS integration SDK (Pinata V3 & local Kubo) for uploading and fetching event metadata and images.                          |
| 🧪 **[@ticketpulse/e2e](./packages/e2e/README.md)**             | Full pipeline integration tests verifying the end-to-end flow: Blockchain $\leftrightarrow$ Subgraph $\leftrightarrow$ IPFS. |

> [!NOTE]
> Frontend application will be added to `apps/web` in future updates.

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

---

## ✨ Code Quality & Development

We maintain high standards for code quality across the monorepo using automated tools. These are orchestrated via **Turborepo** for speed.

### Core Commands

| Task           | Command             | Description                                                                     |
| :------------- | :------------------ | :------------------------------------------------------------------------------ |
| **Lint**       | `pnpm lint`         | Runs ESLint for TS/JS and Solhint for Solidity across all packages.             |
| **Format**     | `pnpm format`       | Automatically fixes code style using Prettier (TS/JS) and Forge fmt (Solidity). |
| **Type Check** | `pnpm typecheck`    | Validates TypeScript types and compiles Solidity contracts.                     |
| **Check All**  | `pnpm format:check` | Verifies that code is correctly formatted without modifying files.              |

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
   > [!IMPORTANT]
   > The `-v` flag is critical. It deletes the PostgreSQL database and IPFS storage. Without it, the Graph Node will remember the "old" blockchain state (e.g., block 100) while the new Anvil starts at block 0, causing a permanent synchronization error ("Block not found").

4. **Restart**: Return to **[Step 1](#step-1-install-dependencies)** to re-install (both `pnpm install` and `forge install`) and re-launch the ecosystem from a pristine state.



Readme for ipfs:
# @ticketpulse/ipfs

This package is the **IPFS integration layer** for the TicketPulse monorepo. It provides a clean, unified API for reading and writing data to IPFS across different environments.

### What does this package give us?
This package abstracts all IPFS interactions so that `apps/web` (the Next.js frontend) and our deployment scripts don't have to deal with IPFS APIs directly. It gives the frontend:
1. **Upload methods**: `uploadFile` (for images) and `uploadEventMetadata` (for the JSON description).
2. **Fetch methods**: `fetchEventMetadata` (which implements an automatic fallback mechanism to prevent failed loads if one gateway is down).
3. **Gateway conversion**: Functions to turn `ipfs://Qm...` into standard HTTP URLs that an `<img src="...">` can actually use.

TicketPulse uses IPFS to store off-chain data securely and immutably:
1. **Event Metadata**: JSON containing full event `description`, `location`, and the `ipfsCoverImageCid`. All other fields (like title, dates, etc.) are stored efficiently on-chain and indexed by the Subgraph.
2. **Images**: Cover images, etc.

By keeping heavy text and images off-chain and storing only the resulting CID in the smart contract and subgraph, we save significant gas costs while maintaining decentralization.

---

## 🏗️ Architecture & Environments

The package is designed to work seamlessly in two different environments. You configure this by setting the provider in `IpfsConfig` (via environment variables).

### 1. Local Development (`provider: 'kubo'`)
During local development, we run a local IPFS node called **Kubo** via Docker.
- **Uploads (Writes)** are made to the Kubo RPC API (`http://127.0.0.1:5001`).
- **Downloads (Reads)** are performed through the local HTTP Gateway (`http://127.0.0.1:8080/ipfs/...`).
- Pinning is handled automatically by the local node.
- *Note:* The Graph Node also connects to this same Kubo instance to store the compiled subgraph WASM. If you've already started the subgraph environment, you don't need to do anything else. For details, see the [subgraph README](../subgraph/README.md).

### 2. Production (`provider: 'pinata'`)
In production, we use **Pinata** strictly for **uploading and pinning**, but we use a robust **fallback gateway mechanism** for reading data, completely bypassing Pinata's reading limits.

- **Uploads (Writes)**: Made using the official Pinata V3 SDK (`pinata`), authenticated via a JWT token and your dedicated Pinata Gateway domain. You must create an account at [Pinata](https://pinata.cloud/) and generate an API Key (JWT) along with a Gateway.
- **Downloads (Reads)**: The `fetchEventMetadata` function automatically tries to fetch data through multiple gateways in the following order:
  1. **IPFS.io** (`https://ipfs.io`) - The official public gateway. Primary reliable source.
  2. **Pinata Dedicated Gateway** (via SDK) - Fast and reliable access through your Pinata account (if `provider: 'pinata'` is set).
  3. **Infura** (Optional) - Serves as a great fallback if configured via `infuraGatewayUrl`.

---

## 🛠️ Installation & Building

This package is part of a monorepo. To set it up:

1. **Install Dependencies**: `pnpm install` (from the root or here).
2. **Build**: `pnpm build` (generates the `dist` folder using `tsup`).

For local development using a real IPFS node (Kubo), ensure your infrastructure is running by following the **[Zero-to-Hero Setup Guide](../../README.md#-zero-to-hero-setup-guide)**.

## 📁 Directory Structure

| File | Description |
| :--- | :--- |
| `src/types.ts` | The single source of truth for IPFS schemas. Contains `EventMetadata` containing only off-chain fields. |
| `src/client.ts` | Manages the connection to the IPFS node. Configures `kubo-rpc-client` for local use. |
| `src/uploader.ts` | Functions to write data: `uploadFile()` for raw bytes (images) and `uploadEventMetadata()` for structured JSON. Supports both Kubo and Pinata. |
| `src/fetcher.ts` | Functions to read data: `fetchEventMetadata()` and `fetchFile()`. Implements the production gateway fallback logic. |
| `src/gateway.ts` | Helper functions to convert raw CIDs or `ipfs://...` URIs into full, readable HTTP gateway URLs (e.g. `cidToGatewayUrl` and `getGatewayUrls`). |

---

## ⚙️ Configuration

You can configure the IPFS client either by passing a config object directly or by using environment variables.

### 1. Local Development (Zero Config)
For local development with Docker Kubo, you don't need to set any environment variables. You can simply import and use the `LOCAL_IPFS_CONFIG` constant.

```typescript
import { LOCAL_IPFS_CONFIG, uploadFile } from '@ticketpulse/ipfs';

// Works out of the box with default Docker ports
const result = await uploadFile(imageBytes, LOCAL_IPFS_CONFIG);
```

### 2. Production (Environment Variables)
In production, you should use environment variables to configure the provider and credentials.

**IMPORTANT**: When using this package from the Next.js frontend (`apps/web`), you will need to copy these environment variables into the frontend's `.env` file.

```env
IPFS_PROVIDER=pinata
PINATA_JWT=your_ey..._token
PINATA_GATEWAY=example-gateway.mypinata.cloud
# Optional:
INFURA_GATEWAY_URL=https://my-project.infura-ipfs.io
```

To use these in code:

```typescript
import { IpfsConfig } from '@ticketpulse/ipfs';

const config: IpfsConfig = {
  provider: process.env.IPFS_PROVIDER as 'kubo' | 'pinata',
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
  infuraGatewayUrl: process.env.INFURA_GATEWAY_URL,
};
```

---

## 🚀 Usage Guide

### 1. Uploading an Image and Metadata

Typically used in the frontend application when creating a new Event.

```typescript
import { uploadFile, uploadEventMetadata } from '@ticketpulse/ipfs';

// 1. Upload the image file (Uint8Array)
const coverImageResult = await uploadFile(imageBytes, config);
console.log("Image CID:", coverImageResult.cid);

// 2. Upload the JSON metadata
const metadataResult = await uploadEventMetadata({
  schemaVersion: "1.0.0",
  ipfsCoverImageCid: coverImageResult.cid,
  description: "A week of Ethereum events...",
  location: "Istanbul, Turkey",
}, config);

console.log("Metadata CID:", metadataResult.cid);

// 3. Pass the CID to the smart contract during createEvent()
// InitParams.ipfsCoverImageCid = coverImageResult.cid
// InitParams.ipfsMetadataCid = metadataResult.cid
```

### 2. Reading Metadata & Displaying Images

Typically used in the frontend when displaying an event page.

```typescript
import { fetchEventMetadata, cidToGatewayUrl } from '@ticketpulse/ipfs';

// 1. You receive the metadata CID from a Subgraph GraphQL query
const cidFromSubgraph = "QmXyz...";

// 2. Fetch the JSON content (automatically handles IPFS.io -> Infura fallbacks)
const metadata = await fetchEventMetadata(cidFromSubgraph, config);

console.log(metadata.location);    // "Istanbul, Turkey"
console.log(metadata.description); // "A week of Ethereum events..."

// 3. Get the image URL
const imageUrl = cidToGatewayUrl(metadata.ipfsCoverImageCid, config);
```

---

## 🔍 Inspecting IPFS Data (UI & Desktop)

When working with IPFS locally, you often want to verify that your images and JSON metadata were uploaded correctly.

### 1. IPFS Web UI
The easiest way to see what's happening inside your local node is the **Web UI**. **Official Hosted UI**: [https://webui.ipfs.io](https://webui.ipfs.io)

#### 🧭 How to find your data (The "Explore" tab)
When you upload a file via a test or the frontend, it is stored in the **Local Datastore**. It won't automatically appear in a list because IPFS is content-addressed.
1.  Go to the **"Explore"** tab in the left menu.
2.  In the search bar at the top, paste the **CID** (the `Qm...` or `bafy...` hash) you got from your code or logs.
3.  Click **"Inspect"** — you will see the raw JSON content or the image preview.

#### 📂 "Files" vs. "Explore" (The MFS Distinction)
You might notice that the **"Files"** tab in the UI is empty even after a successful test.
- **Datastore (Explore)**: This is where everything you `add` lives. If you have the CID, the file exists and is pinned. This is what we use for TicketPulse.
- **Files (MFS)**: This is a "Virtual File System" (Mutable File System). It acts like a regular hard drive where you can create folders and name files. Files only appear here if you explicitly copy them to a path (e.g., `ipfs files cp /ipfs/CID /my-folder/image.png`).
- **Summary**: Your E2E tests use the Datastore. Use the **Explore** tab to find them!

### 2. IPFS Desktop
[IPFS Desktop](https://docs.ipfs.tech/install/ipfs-desktop/) is a standalone application that gives you a more "premium" experience than just a browser tab.

---

## 🧪 Development & Testing

We use Vitest for unit tests and ESLint for code quality.

```bash
# Run unit tests (uses mocks, no Docker required)
pnpm test

# Run type checking
pnpm typecheck

# Lint and format code
pnpm lint
pnpm format
```

For full integration tests with a real node and a real blockchain, see the [E2E package](../e2e/README.md).
