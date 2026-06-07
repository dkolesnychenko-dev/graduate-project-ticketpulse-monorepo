import type { Address, Hex } from 'viem'

/**
 * Mirror of the Solidity struct `TicketPulseEvent.InitParams` —
 * the payload passed to `TicketPulseFactory.createEvent()`.
 *
 * Validation invariants (enforced on-chain — fail fast in `initialize()`):
 *   - startTime  > current block.timestamp (event must be in the future)
 *   - endTime    > startTime
 *   - nominalPrice > 0
 *   - maxSupply  ∈ [1, 10_000_000]
 *   - maxTicketsPerWallet ∈ [1, 6]
 *   - royaltyPct ∈ [0, 20]
 *   - markupPct  ∈ [0, 100]
 *
 * Off-chain (`ipfsMetadataCid`, `location`) is only emitted in `EventInitialized`
 * — it lives in IPFS, not contract storage.
 */
export interface CreateEventInitParams {
  organizer: Address
  startTime: bigint
  endTime: bigint
  nominalPrice: bigint
  maxSupply: number
  maxTicketsPerWallet: number
  royaltyPct: number
  markupPct: number
  title: string
  ticketType: string
  ticketSymbol: string
  ipfsCoverImageCid: string
  ipfsMetadataCid: string
  location: string
}

/**
 * Identifies which contract revert path the user hit.
 * Mapped from custom errors declared in `TicketPulseEvent.sol`.
 */
export type ContractErrorName =
  | 'AlreadyInitialized'
  | 'NotOrganizer'
  | 'EventNotInSalePhase'
  | 'EventStarted'
  | 'EventNotEnded'
  | 'SoldOut'
  | 'WalletLimitExceeded'
  | 'IncorrectPayment'
  | 'NotTicketOwner'
  | 'TicketAlreadyListed'
  | 'TicketNotListed'
  | 'NoBuyOrder'
  | 'NoSellOrder'
  | 'BuyOrderNotOwner'
  | 'BuyOrderAlreadyMatched'
  | 'NothingToWithdraw'
  | 'TransferFailed'
  | 'InvalidParams'
  | 'MaxBatchExceeded'
  | 'InsufficientGasForQueueScan'
  | 'DirectTransfersDisabled'
  | 'AlreadyInBuyQueue'

/** A transaction status as observed by the frontend (separate from on-chain status). */
export type TxStatus =
  | 'idle'
  | 'preparing'
  | 'awaiting-signature'
  | 'pending'
  | 'confirming'
  | 'confirmed'
  | 'failed'

/** A tracked transaction record used by the UI's transaction tracker store. */
export interface TrackedTx {
  hash: Hex
  status: TxStatus
  description: string
  startedAt: number
  confirmedAt?: number
  blockNumber?: bigint
  error?: { name?: ContractErrorName; message: string }
  /**
   * Optional explorer URL (Basescan) — built from chain + hash so the toast
   * always links to the right network.
   */
  explorerUrl: string
}
