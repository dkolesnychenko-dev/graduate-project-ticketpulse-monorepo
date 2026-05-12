# 🎟️ @ticketpulse/ipfs

> **The IPFS integration layer for the TicketPulse monorepo.**
> 
> Provides a clean, unified API for reading and writing data to IPFS across different environments. Abstracts all IPFS interactions so that apps/web and deployment scripts don't have to deal with APIs directly.

---

## 📑 Table of Contents

- [✨ Overview](#-overview)
- [🏗️ Architecture & Environments](#️-architecture--environments)
- [🛠️ Installation & Building](#️-installation--building)
- [📁 Directory Structure](#-directory-structure)
- [⚙️ Configuration](#️-configuration)
- [🚀 Usage Guide](#-usage-guide)
- [🔍 Inspecting IPFS Data (UI & Desktop)](#-inspecting-ipfs-data-ui--desktop)
- [🧪 Development & Testing](#-development--testing)

---

## ✨ Overview

This package gives us:
1. **Upload methods**: `uploadFile` (for images) and `uploadEventMetadata` (for the JSON description).
2. **Fetch methods**: `fetchEventMetadata` (implements an automatic fallback mechanism to prevent failed loads if one gateway is down).
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

> [!NOTE]
> The Graph Node also connects to this same Kubo instance to store the compiled subgraph WASM. If you've already started the subgraph environment, you don't need to do anything else. For details, see the [subgraph README](../subgraph/README.md).

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

---

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

> [!IMPORTANT]
> When using this package from the Next.js frontend (`apps/web`), you will need to copy these environment variables into the frontend's `.env` file.

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
1. Go to the **"Explore"** tab in the left menu.
2. In the search bar at the top, paste the **CID** (the `Qm...` or `bafy...` hash) you got from your code or logs.
3. Click **"Inspect"** — you will see the raw JSON content or the image preview.

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

