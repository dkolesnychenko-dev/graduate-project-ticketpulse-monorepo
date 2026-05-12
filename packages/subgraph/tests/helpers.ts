// ═══════════════════════════════════════════════════════════════════
// Test Helpers — shared constants, mock event factories, and utilities
// ═══════════════════════════════════════════════════════════════════

import { newMockEvent } from 'matchstick-as'
import { ethereum, Address, BigInt, Bytes } from '@graphprotocol/graph-ts'

import { EventCreated } from '../generated/TicketPulseFactory/TicketPulseFactory'
import {
  EventInitialized,
  TicketMinted,
  SellOrderCreated,
  SellOrderCancelled,
  BuyOrderCreated,
  BuyOrderCancelled,
  OrderMatched,
  Transfer,
  OrganizerPrimaryWithdrawal,
  OrganizerRoyaltyWithdrawal,
  SellerWithdrawal,
  QueueGasLimitReached,
} from '../generated/templates/TicketPulseEvent/TicketPulseEvent'

// ─── Addresses ──────────────────────────────────────────────────────
export const FACTORY_ADDRESS = Address.fromString(
  '0xface000000000000000000000000000000000001',
)
export const EVENT_ADDRESS = Address.fromString(
  '0xede0000000000000000000000000000000000001',
)
export const ORGANIZER = Address.fromString(
  '0x00000000000000000000000000000000000000A1',
)
export const BUYER_1 = Address.fromString(
  '0x00000000000000000000000000000000000000B1',
)
export const BUYER_2 = Address.fromString(
  '0x00000000000000000000000000000000000000B2',
)
export const SELLER_1 = Address.fromString(
  '0x00000000000000000000000000000000000000C1',
)
export const ZERO_ADDRESS = Address.fromString(
  '0x0000000000000000000000000000000000000000',
)

// ─── Numeric constants ──────────────────────────────────────────────
export const NOMINAL_PRICE = BigInt.fromI64(100_000_000_000_000_000) // 0.1 ETH
export const SECONDARY_PRICE = BigInt.fromI64(120_000_000_000_000_000) // 0.12 ETH (20% markup)
export const ROYALTY_AMOUNT = BigInt.fromI64(12_000_000_000_000_000) // 10% of secondary
export const SELLER_RECEIVED = BigInt.fromI64(108_000_000_000_000_000) // secondary - royalty
export const TIMESTAMP_1 = BigInt.fromI32(1700000000)
export const TIMESTAMP_2 = BigInt.fromI32(1700001000)
export const BLOCK_1 = BigInt.fromI32(100)
export const TOKEN_ID_1 = BigInt.fromI32(1)
export const TOKEN_ID_2 = BigInt.fromI32(2)
export const START_TIME = BigInt.fromI64(1700100000)
export const END_TIME = BigInt.fromI64(1700200000)

export const IDENTITY_HASH = Bytes.fromHexString(
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
) as Bytes

export const NEW_IDENTITY_HASH = Bytes.fromHexString(
  '0x1111111111111111111111111111111111111111111111111111111111111111',
) as Bytes

export const TX_HASH_1 = Bytes.fromHexString(
  '0xaaaa000000000000000000000000000000000000000000000000000000000001',
) as Bytes

export const TX_HASH_2 = Bytes.fromHexString(
  '0xaaaa000000000000000000000000000000000000000000000000000000000002',
) as Bytes

export const TX_HASH_3 = Bytes.fromHexString(
  '0xaaaa000000000000000000000000000000000000000000000000000000000003',
) as Bytes

// ─── Mock Event Factories ───────────────────────────────────────────

export function mockEventCreated(
  eventContract: Address = EVENT_ADDRESS,
  organizer: Address = ORGANIZER,
  eventIndex: BigInt = BigInt.fromI32(0),
): EventCreated {
  let ev = changetype<EventCreated>(newMockEvent())
  ev.transaction.hash = TX_HASH_1
  ev.block.timestamp = TIMESTAMP_1
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(0)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'eventContract',
      ethereum.Value.fromAddress(eventContract),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('organizer', ethereum.Value.fromAddress(organizer)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'eventIndex',
      ethereum.Value.fromUnsignedBigInt(eventIndex),
    ),
  )

  return ev
}

export function mockEventInitialized(
  eventAddr: Address = EVENT_ADDRESS,
): EventInitialized {
  let ev = changetype<EventInitialized>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = TX_HASH_1
  ev.block.timestamp = TIMESTAMP_1
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(1)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam('organizer', ethereum.Value.fromAddress(ORGANIZER)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'startTime',
      ethereum.Value.fromUnsignedBigInt(START_TIME),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'endTime',
      ethereum.Value.fromUnsignedBigInt(END_TIME),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'nominalPrice',
      ethereum.Value.fromUnsignedBigInt(NOMINAL_PRICE),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'maxSupply',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000)),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('maxTicketsPerWallet', ethereum.Value.fromI32(6)),
  )
  ev.parameters.push(
    new ethereum.EventParam('royaltyPct', ethereum.Value.fromI32(10)),
  )
  ev.parameters.push(
    new ethereum.EventParam('markupPct', ethereum.Value.fromI32(20)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'secondaryPrice',
      ethereum.Value.fromUnsignedBigInt(SECONDARY_PRICE),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'title',
      ethereum.Value.fromString('Test Concert 2026'),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('ticketType', ethereum.Value.fromString('VIP')),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'ticketSymbol',
      ethereum.Value.fromString('TVIP26'),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'ipfsCoverImageCid',
      ethereum.Value.fromString('QmCoverHash123'),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'ipfsMetadataCid',
      ethereum.Value.fromString('QmMetaHash456'),
    ),
  )

  return ev
}

export function mockTicketMinted(
  buyer: Address = BUYER_1,
  tokenId: BigInt = TOKEN_ID_1,
  price: BigInt = NOMINAL_PRICE,
  identityHash: Bytes = IDENTITY_HASH,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_2,
  logIdx: i32 = 0,
): TicketMinted {
  let ev = changetype<TicketMinted>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('price', ethereum.Value.fromUnsignedBigInt(price)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'identityHash',
      ethereum.Value.fromFixedBytes(identityHash),
    ),
  )

  return ev
}

export function mockSellOrderCreated(
  sellOrderId: BigInt = BigInt.fromI32(1),
  tokenId: BigInt = TOKEN_ID_1,
  seller: Address = SELLER_1,
  price: BigInt = SECONDARY_PRICE,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_2,
  logIdx: i32 = 0,
): SellOrderCreated {
  let ev = changetype<SellOrderCreated>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'sellOrderId',
      ethereum.Value.fromUnsignedBigInt(sellOrderId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('seller', ethereum.Value.fromAddress(seller)),
  )
  ev.parameters.push(
    new ethereum.EventParam('price', ethereum.Value.fromUnsignedBigInt(price)),
  )

  return ev
}

export function mockSellOrderCancelled(
  sellOrderId: BigInt = BigInt.fromI32(1),
  tokenId: BigInt = TOKEN_ID_1,
  seller: Address = SELLER_1,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
): SellOrderCancelled {
  let ev = changetype<SellOrderCancelled>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'sellOrderId',
      ethereum.Value.fromUnsignedBigInt(sellOrderId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('seller', ethereum.Value.fromAddress(seller)),
  )

  return ev
}

export function mockBuyOrderCreated(
  buyOrderId: BigInt = BigInt.fromI32(1),
  buyer: Address = BUYER_1,
  amountLocked: BigInt = SECONDARY_PRICE,
  identityHash: Bytes = IDENTITY_HASH,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_2,
  logIdx: i32 = 0,
): BuyOrderCreated {
  let ev = changetype<BuyOrderCreated>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'buyOrderId',
      ethereum.Value.fromUnsignedBigInt(buyOrderId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'amountLocked',
      ethereum.Value.fromUnsignedBigInt(amountLocked),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'identityHash',
      ethereum.Value.fromFixedBytes(identityHash),
    ),
  )

  return ev
}

export function mockBuyOrderCancelled(
  buyOrderId: BigInt = BigInt.fromI32(1),
  buyer: Address = BUYER_1,
  refundedAmount: BigInt = SECONDARY_PRICE,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
): BuyOrderCancelled {
  let ev = changetype<BuyOrderCancelled>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'buyOrderId',
      ethereum.Value.fromUnsignedBigInt(buyOrderId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'refundedAmount',
      ethereum.Value.fromUnsignedBigInt(refundedAmount),
    ),
  )

  return ev
}

export function mockOrderMatched(
  tokenId: BigInt = TOKEN_ID_1,
  seller: Address = SELLER_1,
  buyer: Address = BUYER_1,
  price: BigInt = SECONDARY_PRICE,
  royaltyAmount: BigInt = ROYALTY_AMOUNT,
  sellerReceived: BigInt = SELLER_RECEIVED,
  sellOrderId: BigInt = BigInt.fromI32(0),
  buyOrderId: BigInt = BigInt.fromI32(0),
  newIdentityHash: Bytes = NEW_IDENTITY_HASH,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
  txFrom: Address = BUYER_1,
): OrderMatched {
  let ev = changetype<OrderMatched>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.transaction.from = txFrom
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam('seller', ethereum.Value.fromAddress(seller)),
  )
  ev.parameters.push(
    new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)),
  )
  ev.parameters.push(
    new ethereum.EventParam('price', ethereum.Value.fromUnsignedBigInt(price)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'royaltyAmount',
      ethereum.Value.fromUnsignedBigInt(royaltyAmount),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'sellerReceived',
      ethereum.Value.fromUnsignedBigInt(sellerReceived),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'sellOrderId',
      ethereum.Value.fromUnsignedBigInt(sellOrderId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'buyOrderId',
      ethereum.Value.fromUnsignedBigInt(buyOrderId),
    ),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'newIdentityHash',
      ethereum.Value.fromFixedBytes(newIdentityHash),
    ),
  )

  return ev
}

export function mockTransfer(
  from: Address,
  to: Address,
  tokenId: BigInt = TOKEN_ID_1,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
): Transfer {
  let ev = changetype<Transfer>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam('from', ethereum.Value.fromAddress(from)),
  )
  ev.parameters.push(
    new ethereum.EventParam('to', ethereum.Value.fromAddress(to)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  )

  return ev
}

export function mockOrganizerPrimaryWithdrawal(
  organizer: Address = ORGANIZER,
  amount: BigInt = NOMINAL_PRICE,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
): OrganizerPrimaryWithdrawal {
  let ev = changetype<OrganizerPrimaryWithdrawal>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam('organizer', ethereum.Value.fromAddress(organizer)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  )

  return ev
}

export function mockOrganizerRoyaltyWithdrawal(
  organizer: Address = ORGANIZER,
  amount: BigInt = ROYALTY_AMOUNT,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
): OrganizerRoyaltyWithdrawal {
  let ev = changetype<OrganizerRoyaltyWithdrawal>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam('organizer', ethereum.Value.fromAddress(organizer)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  )

  return ev
}

export function mockSellerWithdrawal(
  seller: Address = SELLER_1,
  amount: BigInt = SELLER_RECEIVED,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
): SellerWithdrawal {
  let ev = changetype<SellerWithdrawal>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam('seller', ethereum.Value.fromAddress(seller)),
  )
  ev.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  )

  return ev
}

export function mockQueueGasLimitReached(
  isBuyQueue: boolean = true,
  eventAddr: Address = EVENT_ADDRESS,
  txHash: Bytes = TX_HASH_3,
  logIdx: i32 = 0,
  txFrom: Address = BUYER_1,
): QueueGasLimitReached {
  let ev = changetype<QueueGasLimitReached>(newMockEvent())
  ev.address = eventAddr
  ev.transaction.hash = txHash
  ev.transaction.from = txFrom
  ev.block.timestamp = TIMESTAMP_2
  ev.block.number = BLOCK_1
  ev.logIndex = BigInt.fromI32(logIdx)

  ev.parameters = new Array<ethereum.EventParam>()
  ev.parameters.push(
    new ethereum.EventParam(
      'isBuyQueue',
      ethereum.Value.fromBoolean(isBuyQueue),
    ),
  )

  return ev
}

// ─── Composite setup helpers ────────────────────────────────────────

/**
 * Seeds store with Event + organizer User by running
 * handleEventCreated → handleEventInitialized.
 * Import and call from your test files.
 */
export function seedEventWithInit(
  handleEventCreated: (e: EventCreated) => void,
  handleEventInitialized: (e: EventInitialized) => void,
): void {
  handleEventCreated(mockEventCreated())
  handleEventInitialized(mockEventInitialized())
}

/**
 * Seeds a minted ticket (calls seedEventWithInit first).
 */
export function seedMintedTicket(
  handleEventCreated: (e: EventCreated) => void,
  handleEventInitialized: (e: EventInitialized) => void,
  handleTicketMinted: (e: TicketMinted) => void,
  buyer: Address = BUYER_1,
  tokenId: BigInt = TOKEN_ID_1,
): void {
  seedEventWithInit(handleEventCreated, handleEventInitialized)
  handleTicketMinted(mockTicketMinted(buyer, tokenId))
}
