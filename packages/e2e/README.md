# 🎟️ @ticketpulse/e2e

> **End-to-End (E2E) Integration Tests for the TicketPulse monorepo.**
> 
> Verifies the entire indexing pipeline by interacting with a real blockchain and a real Graph Node.

---

## 📑 Table of Contents

- [🚀 Full Pipeline E2E Integration Testing](#-full-pipeline-e2e-integration-testing)
- [🏗️ The E2E Workflow](#️-the-e2e-workflow)
- [🚦 Running E2E Tests](#-running-e2e-tests)
- [💡 Why is this important?](#-why-is-this-important)

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

