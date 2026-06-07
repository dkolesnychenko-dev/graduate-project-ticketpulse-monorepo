/**
 * Strongly typed ABI exports for the TicketPulse contracts.
 *
 * The `as const` literals come from `scripts/sync-abis.mjs`, which reads the
 * Foundry artifacts in `packages/contracts/out/`. Re-run it after every
 * contract change:
 *
 *   pnpm --filter @ticketpulse/sdk codegen
 *
 * Importing `* as const` ABIs gives full type inference for `viem`'s
 * `readContract` / `writeContract` and for `wagmi`'s `useReadContract` etc.
 */
export {
  ticketPulseFactoryAbi,
  ticketPulseEventAbi,
} from './__generated__/abis'
