import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  type Abi,
} from 'viem'

import {
  ticketPulseEventAbi,
  ticketPulseFactoryAbi,
} from '../contracts/__generated__/abis'
import type { ContractErrorName } from '../types/contracts'

/**
 * Decoded view of a `viem` revert error — what the UI actually needs to show.
 *
 * `name` is the Solidity custom-error identifier (e.g. `SoldOut`), used by
 * the UI to switch between user-friendly messages and remediation hints.
 */
export interface DecodedContractError {
  /** Best-effort match against `ContractErrorName`. `null` for unknown errors. */
  name: ContractErrorName | null
  /** Original short message from viem — useful for logs. */
  shortMessage: string
  /** Whether the user explicitly rejected the wallet prompt. */
  userRejected: boolean
}

const allAbis: readonly Abi[] = [ticketPulseEventAbi, ticketPulseFactoryAbi]

/**
 * Best-effort decoder over a `viem` error. We walk the cause chain
 * looking for `ContractFunctionRevertedError` and try to match the
 * `errorName` against our known custom errors.
 */
export function decodeContractError(error: unknown): DecodedContractError {
  if (!(error instanceof BaseError)) {
    return {
      name: null,
      shortMessage:
        error instanceof Error ? error.message : 'Unknown error',
      userRejected: false,
    }
  }

  if (error.walk((e) => e instanceof UserRejectedRequestError)) {
    return {
      name: null,
      shortMessage: 'Transaction rejected in wallet',
      userRejected: true,
    }
  }

  const reverted = error.walk(
    (e) => e instanceof ContractFunctionRevertedError,
  ) as ContractFunctionRevertedError | undefined

  const errorName = reverted?.data?.errorName as string | undefined
  const matched = errorName && isKnownErrorName(errorName) ? errorName : null

  return {
    name: matched,
    shortMessage: reverted?.shortMessage ?? error.shortMessage,
    userRejected: false,
  }
}

function isKnownErrorName(name: string): name is ContractErrorName {
  // Cheap structural check — full enumeration would duplicate the union.
  return allAbis.some((abi) =>
    abi.some(
      (entry) =>
        typeof entry === 'object' &&
        entry.type === 'error' &&
        entry.name === name,
    ),
  )
}

/**
 * Map a decoded error onto a human-friendly message + a suggested next step.
 * Returned strings are deliberately translation-key-shaped so apps/web can
 * swap them into `next-intl`'s message catalog later.
 */
export function contractErrorMessage(
  decoded: DecodedContractError,
): { title: string; description: string } {
  if (decoded.userRejected) {
    return {
      title: 'Transaction cancelled',
      description: 'You declined the request in your wallet. Nothing was charged.',
    }
  }

  switch (decoded.name) {
    case 'EventNotInSalePhase':
      return {
        title: 'Sale window closed',
        description: 'Tickets can only be minted before the event starts.',
      }
    case 'EventStarted':
      return {
        title: 'Event already started',
        description: 'Listings and buy orders are frozen once the event begins.',
      }
    case 'EventNotEnded':
      return {
        title: 'Event still running',
        description: 'Organiser withdrawals unlock after the event ends.',
      }
    case 'SoldOut':
      return {
        title: 'Sold out',
        description:
          'All primary-sale tickets are gone — try the secondary market or join the buy queue.',
      }
    case 'WalletLimitExceeded':
      return {
        title: 'Wallet limit reached',
        description:
          'This wallet has hit the per-wallet ticket cap set by the organiser.',
      }
    case 'IncorrectPayment':
      return {
        title: 'Incorrect amount',
        description:
          'Send exactly the listed price. The contract refuses partial or over-payment.',
      }
    case 'NotTicketOwner':
      return {
        title: 'You do not own this ticket',
        description: 'Only the current ticket holder can list it for sale.',
      }
    case 'TicketAlreadyListed':
      return {
        title: 'Already listed',
        description: 'This ticket is already in the sell queue.',
      }
    case 'TicketNotListed':
      return {
        title: 'Not listed',
        description: 'This ticket is not currently for sale.',
      }
    case 'NoBuyOrder':
      return {
        title: 'No buy order',
        description: 'You do not have an active buy order to cancel.',
      }
    case 'NoSellOrder':
      return {
        title: 'No sell order matched',
        description: 'No tickets are currently listed at the fixed resale price.',
      }
    case 'BuyOrderNotOwner':
      return {
        title: 'Not your buy order',
        description: 'Only the buyer who placed the order can cancel it.',
      }
    case 'BuyOrderAlreadyMatched':
      return {
        title: 'Already matched',
        description:
          'This buy order has already been filled — the ticket is in your wallet.',
      }
    case 'NothingToWithdraw':
      return {
        title: 'Nothing to withdraw',
        description: 'Your balance for this event is already zero.',
      }
    case 'TransferFailed':
      return {
        title: 'Transfer failed',
        description:
          'The ETH transfer was rejected by the recipient. Try again or contact support.',
      }
    case 'InvalidParams':
      return {
        title: 'Invalid event parameters',
        description:
          'One of the event settings is out of range — double-check dates, supply, and percentages.',
      }
    case 'MaxBatchExceeded':
      return {
        title: 'Too many tickets per transaction',
        description: 'Mint at most 6 tickets per call for stable gas usage.',
      }
    case 'InsufficientGasForQueueScan':
      return {
        title: 'Network is busy',
        description:
          'The queue cleanup ran out of gas. Try again — the next call will continue from where we left off.',
      }
    case 'DirectTransfersDisabled':
      return {
        title: 'Direct transfers disabled',
        description:
          'Tickets can only move through the marketplace so royalties are always collected.',
      }
    case 'AlreadyInBuyQueue':
      return {
        title: 'Already in queue',
        description:
          'You already have an active buy order for this event — cancel it first to place a new one.',
      }
    default:
      return {
        title: 'Transaction failed',
        description: decoded.shortMessage,
      }
  }
}
