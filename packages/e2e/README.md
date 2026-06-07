# 🎟️ @ticketpulse/e2e & Seeding Data

> **End-to-End (E2E) Integration Tests and Database Seeding for TicketPulse.**
>
> Verifies the entire indexing pipeline by interacting with a real blockchain and a real Graph Node, and provides tools to quickly populate the local environment with rich dummy data.

---

## 📑 Table of Contents

- [🌱 Seeding Local Data](#-seeding-local-data)
  - [Account Roles & Login Details](#account-roles--login-details)
  - [Customizing Event Photos](#customizing-event-photos)
- [🚀 Full Pipeline E2E Integration Testing](#-full-pipeline-e2e-integration-testing)
- [🏗️ The E2E Workflow](#️-the-e2e-workflow)
- [🚦 Running E2E Tests](#-running-e2e-tests)
- [💡 Why is this important?](#-why-is-this-important)

---

## 🌱 Seeding Local Data

When developing the frontend or testing out the subgraph, an empty database isn't very helpful. The **Seed Script** automatically populates your local Anvil blockchain and Graph Node with multiple rich events, minted tickets, secondary market listings (sell orders), and purchase requests (buy orders).

### How to Run the Seed Script

Ensure your entire local environment is running (Anvil, Graph Node, IPFS, Postgres) and that your smart contracts have been deployed locally.

Run the seeder using the following command from the monorepo root:

```bash
pnpm --filter @ticketpulse/e2e seed
```


### Account Roles & Login Details

The script utilizes the pre-funded Anvil accounts provided by local Foundry. To see the seeded data correctly in the UI, import these private keys into your local MetaMask (or preferred wallet) and connect to the local `localhost:8545` network:

| Role        | Address | Private Key (Import to MetaMask) | Expected Data Visibility |
| ----------- | ------- | --------------------------------- | ------------------------- |
| **Organizer** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Organizer Dashboard, Event statistics, created events. |
| **Buyer 1**   | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Minted tickets, active sell listings, matched buy orders. |
| **Buyer 2**   | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Minted tickets, active buy orders (in queue). |
| **Buyer 3**   | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | Minted tickets, completed secondary purchases. |

### Customizing Event Photos

By default, if no images are found, the script uses a 1x1 dummy transparent pixel to avoid breaking the IPFS gateway.

To use **real, rich images** for your events:

1. Create a folder at `packages/e2e/assets/events/`.
2. Add your custom images into that directory using the exact following names:
   - `blockchain_summit.jpg`
   - `music_festival.jpg`
   - `pitch_night.jpg`
   - `art_exhibition.jpg`
3. Rerun the seed script! It will automatically detect these images, upload them to IPFS, and link them directly to the on-chain events.

---

## 🚀 Full Pipeline E2E Integration Testing

Beyond unit tests, we implement **End-to-End (E2E) Integration Tests**. While Matchstick tests subgraph logic in isolation using mocks, E2E tests verify the **entire indexing pipeline** by interacting with a real blockchain and a real Graph Node.

---

## 🏗️ The E2E Workflow

The test suite (located in `tests/e2e.test.ts`) automates the following "Real World" scenario:

1. **IPFS Upload**: Uploads a dummy cover image and event metadata JSON to the local IPFS node (`kubo`).
2. **On-chain Action**: Uses `viem` to broadcast a real transaction to your local Anvil node, calling `createEvent` with the real IPFS CIDs.
3. **Indexing**: The transaction is picked up by the local **Graph Node** container, which processes the event and updates the PostgreSQL database.
4. **Subgraph Verification**: The test script performs a **GraphQL query** to the Subgraph API and asserts that the returned data matches the expected state, including the CIDs.
5. **IPFS Resolution Verification**: Fetches the metadata JSON back from the local IPFS Gateway using the CID returned by the subgraph, ensuring the full read/write cycle works.

---

## 🚦 Running E2E Tests

The E2E suite requires a fully operational local environment (Docker, Anvil, and deployed contracts/subgraph).

For a step-by-step guide on how to launch the entire ecosystem, please follow the **[Zero-to-Hero Setup Guide](../../README.md#-zero-to-hero-setup-guide)** in the root directory.

Once your environment is ready, execute the tests:

```bash
# From the monorepo root
pnpm --filter @ticketpulse/e2e test

# Or from inside packages/e2e
pnpm test
```

> [!WARNING]
> If the tests fail with a timeout, ensure that your Graph Node is fully synchronized and that you have deployed the contracts *after* your last Anvil restart.

---

## 💡 Why is this important?

- **Pipeline Integrity**: Verifies that the Graph Node can successfully communicate with your RPC node.
- **IPFS Integration**: Ensures the local IPFS node is reachable for both uploading and gateway resolution, and that CIDs correctly pass through the smart contract to the subgraph.
- **ABI Synchronization**: Catches errors if your smart contract ABIs and Subgraph manifest fall out of sync.
- **Race Conditions**: Tests how the subgraph handles real block confirmations and event ordering.

---

## 🧨 High-Concurrency Load Testing (100k+ Users)

A core requirement for mainstream ticket sales is handling immense traffic spikes when a popular event goes live. To validate how the TicketPulse stack behaves under severe pressure, we provide a **Load Testing Script** capable of simulating tens of thousands of concurrent users.

### How to Run the Load Test

You can run the script against your local Anvil environment:

```bash
# Run the default read load test (10,000 requests)
pnpm --filter @ticketpulse/e2e load-test

# Or configure environment variables for custom loads:
TARGET_REQUESTS=100000 CHUNK_SIZE=1000 MODE=read pnpm --filter @ticketpulse/e2e load-test
```

### Understanding 100k Concurrent Users in Web3

Handling 100,000 concurrent actions in Web3 differs significantly from traditional Web2 architectures:

1. **RPC Node Bottlenecks**: A single Ethereum node (or local Anvil) will crash if bombarded with 100k parallel HTTP requests. The `loadTest.ts` script uses **batching** (`http(RPC_URL, { batch: true })`) and **chunking** to throttle requests dynamically, ensuring the RPC remains stable.
2. **Read vs Write**: 
   - **Read (eth_call)**: Reading smart contract data (e.g., checking `maxSupply` or ticket balances) scales efficiently. Testing 100k read operations is handled smoothly by RPC batching.
   - **Write (eth_sendTransaction)**: Generating 100k concurrent `mintTickets` transactions locally is constrained by Anvil's mempool and block mining rate. In production, L2 solutions (like Arbitrum) and decentralized RPC providers (like Alchemy) distribute this load, but transactions will still queue in the mempool during extreme spikes.
3. **Subgraph Indexing**: Emitting 100k events requires the Graph Node to process massive block bodies. Our architecture separates the reading layer (Subgraph API) from the writing layer (Blockchain), meaning high write volume does not degrade the read performance of the frontend.

By running this load test in both `MODE=read` and `MODE=write`, you can observe how the local infrastructure bottlenecks and understand the architectural necessities for scaling Web3 event ticketing.
