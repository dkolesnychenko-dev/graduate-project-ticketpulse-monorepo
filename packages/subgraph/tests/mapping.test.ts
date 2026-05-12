import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
} from 'matchstick-as/assembly/index'
import { BigInt, Bytes, Address, ethereum } from '@graphprotocol/graph-ts'
import {
  handleEventCreated,
  handleEventInitialized,
  handleTicketMinted,
  handleSellOrderCreated,
  handleSellOrderCancelled,
  handleBuyOrderCreated,
  handleBuyOrderCancelled,
  handleOrderMatched,
  handleTransfer,
  handleOrganizerPrimaryWithdrawal,
  handleOrganizerRoyaltyWithdrawal,
  handleSellerWithdrawal,
  handleQueueGasLimitReached,
} from '../src/mapping'
import {
  ORGANIZER,
  EVENT_ADDRESS,
  BUYER_1,
  BUYER_2,
  SELLER_1,
  ZERO_ADDRESS,
  NOMINAL_PRICE,
  SECONDARY_PRICE,
  ROYALTY_AMOUNT,
  SELLER_RECEIVED,
  TIMESTAMP_1,
  TIMESTAMP_2,
  TOKEN_ID_1,
  TOKEN_ID_2,
  IDENTITY_HASH,
  NEW_IDENTITY_HASH,
  TX_HASH_1,
  TX_HASH_2,
  TX_HASH_3,
  mockEventCreated,
  mockEventInitialized,
  mockTicketMinted,
  mockSellOrderCreated,
  mockSellOrderCancelled,
  mockBuyOrderCreated,
  mockBuyOrderCancelled,
  mockOrderMatched,
  mockTransfer,
  mockOrganizerPrimaryWithdrawal,
  mockOrganizerRoyaltyWithdrawal,
  mockSellerWithdrawal,
  mockQueueGasLimitReached,
  seedEventWithInit,
  seedMintedTicket,
} from './helpers'

// ═══════════════════════════════════════════════════════════════
// Reusable IDs
// ═══════════════════════════════════════════════════════════════
let eventId = EVENT_ADDRESS.toHexString()
let organizerId = ORGANIZER.toHexString()
let buyer1Id = BUYER_1.toHexString()
let buyer2Id = BUYER_2.toHexString()
let seller1Id = SELLER_1.toHexString()
let ticketId1 = eventId + '-' + TOKEN_ID_1.toString()
let balanceId = eventId + '-' + organizerId

afterEach(() => {
  clearStore()
})

// ═══════════════════════════════════════════════════════════════
// 1. handleEventCreated
// ═══════════════════════════════════════════════════════════════
describe('handleEventCreated', () => {
  test('creates Event entity with defaults', () => {
    handleEventCreated(mockEventCreated())

    assert.entityCount('Event', 1)
    assert.fieldEquals('Event', eventId, 'organizer', organizerId)
    assert.fieldEquals('Event', eventId, 'totalMinted', '0')
    assert.fieldEquals('Event', eventId, 'totalPrimaryVolume', '0')
    assert.fieldEquals('Event', eventId, 'totalSecondaryVolume', '0')
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '0')
    assert.fieldEquals('Event', eventId, 'activeBuyOrdersCount', '0')
    assert.fieldEquals('Event', eventId, 'createdAt', TIMESTAMP_1.toString())
    assert.fieldEquals(
      'Event',
      eventId,
      'createdTxHash',
      TX_HASH_1.toHexString(),
    )
  })

  test('creates organizer User with totalEventsCreated=1', () => {
    handleEventCreated(mockEventCreated())

    assert.entityCount('User', 1)
    assert.fieldEquals('User', organizerId, 'totalEventsCreated', '1')
    assert.fieldEquals('User', organizerId, 'totalTicketsBought', '0')
    assert.fieldEquals('User', organizerId, 'totalTicketsSold', '0')
  })

  test('increments organizer.totalEventsCreated on second event', () => {
    handleEventCreated(mockEventCreated())
    let ev2Addr = Address.fromString(
      '0xede0000000000000000000000000000000000002',
    )
    handleEventCreated(mockEventCreated(ev2Addr, ORGANIZER, BigInt.fromI32(1)))

    assert.fieldEquals('User', organizerId, 'totalEventsCreated', '2')
    assert.entityCount('Event', 2)
  })

  test('creates ActivityLog with type EVENT_CREATED', () => {
    handleEventCreated(mockEventCreated())
    let alId = TX_HASH_1.toHexString() + '-0'
    assert.entityCount('ActivityLog', 1)
    assert.fieldEquals('ActivityLog', alId, 'type', 'EVENT_CREATED')
    assert.fieldEquals('ActivityLog', alId, 'event', eventId)
    assert.fieldEquals('ActivityLog', alId, 'initiator', organizerId)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. handleEventInitialized
// ═══════════════════════════════════════════════════════════════
describe('handleEventInitialized', () => {
  test('fills Event metadata fields', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)

    assert.fieldEquals('Event', eventId, 'title', 'Test Concert 2026')
    assert.fieldEquals('Event', eventId, 'ticketType', 'VIP')
    assert.fieldEquals('Event', eventId, 'ticketSymbol', 'TVIP26')
    assert.fieldEquals('Event', eventId, 'ipfsCoverImageCid', 'QmCoverHash123')
    assert.fieldEquals('Event', eventId, 'ipfsMetadataCid', 'QmMetaHash456')
    assert.fieldEquals(
      'Event',
      eventId,
      'nominalPrice',
      NOMINAL_PRICE.toString(),
    )
    assert.fieldEquals('Event', eventId, 'maxSupply', '1000')
    assert.fieldEquals('Event', eventId, 'maxTicketsPerWallet', '6')
    assert.fieldEquals('Event', eventId, 'royaltyPercentage', '10')
    assert.fieldEquals('Event', eventId, 'markupPercentage', '20')
    assert.fieldEquals(
      'Event',
      eventId,
      'secondaryMarketPrice',
      SECONDARY_PRICE.toString(),
    )
  })

  test('creates organizer Balance entity', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)

    assert.entityCount('Balance', 1)
    assert.fieldEquals('Balance', balanceId, 'primarySalesBalance', '0')
    assert.fieldEquals('Balance', balanceId, 'royaltyBalance', '0')
    assert.fieldEquals('Balance', balanceId, 'sellerBalance', '0')
  })

  test('no-ops when Event entity missing', () => {
    handleEventInitialized(mockEventInitialized())
    // Should not crash; Event count stays 0
    assert.entityCount('Balance', 0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. handleTicketMinted
// ═══════════════════════════════════════════════════════════════
describe('handleTicketMinted', () => {
  test('creates Ticket and updates Event counters', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
    )

    assert.entityCount('Ticket', 1)
    assert.fieldEquals('Ticket', ticketId1, 'tokenId', '1')
    assert.fieldEquals('Ticket', ticketId1, 'currentOwner', buyer1Id)
    assert.fieldEquals('Ticket', ticketId1, 'originalMinter', buyer1Id)
    assert.fieldEquals('Ticket', ticketId1, 'isOnSale', 'false')
    assert.fieldEquals(
      'Ticket',
      ticketId1,
      'mintPrice',
      NOMINAL_PRICE.toString(),
    )
    assert.fieldEquals(
      'Ticket',
      ticketId1,
      'identityHash',
      IDENTITY_HASH.toHexString(),
    )

    assert.fieldEquals('Event', eventId, 'totalMinted', '1')
    assert.fieldEquals(
      'Event',
      eventId,
      'totalPrimaryVolume',
      NOMINAL_PRICE.toString(),
    )
  })

  test('increments buyer.totalTicketsBought', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
    )
    assert.fieldEquals('User', buyer1Id, 'totalTicketsBought', '1')
  })

  test('adds to organizer primarySalesBalance', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
    )
    assert.fieldEquals(
      'Balance',
      balanceId,
      'primarySalesBalance',
      NOMINAL_PRICE.toString(),
    )
  })

  test('creates TICKET_MINTED activity log', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
    )
    let alId = TX_HASH_2.toHexString() + '-0'
    assert.fieldEquals('ActivityLog', alId, 'type', 'TICKET_MINTED')
    assert.fieldEquals('ActivityLog', alId, 'ticket', ticketId1)
    assert.fieldEquals('ActivityLog', alId, 'to', buyer1Id)
    assert.fieldEquals('ActivityLog', alId, 'price', NOMINAL_PRICE.toString())
  })

  test('multiple mints accumulate volumes', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleTicketMinted(mockTicketMinted(BUYER_1, TOKEN_ID_1))
    handleTicketMinted(
      mockTicketMinted(
        BUYER_2,
        TOKEN_ID_2,
        NOMINAL_PRICE,
        IDENTITY_HASH,
        EVENT_ADDRESS,
        TX_HASH_3,
        1,
      ),
    )

    assert.fieldEquals('Event', eventId, 'totalMinted', '2')
    let doubleVol = NOMINAL_PRICE.times(BigInt.fromI32(2))
    assert.fieldEquals(
      'Event',
      eventId,
      'totalPrimaryVolume',
      doubleVol.toString(),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. handleSellOrderCreated
// ═══════════════════════════════════════════════════════════════
describe('handleSellOrderCreated', () => {
  test('creates SellOrder and marks ticket on sale', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    let ev = mockSellOrderCreated()
    handleSellOrderCreated(ev)

    let soId = TX_HASH_2.toHexString() + '-0'
    assert.entityCount('SellOrder', 1)
    assert.fieldEquals('SellOrder', soId, 'status', 'ACTIVE')
    assert.fieldEquals('SellOrder', soId, 'price', SECONDARY_PRICE.toString())
    assert.fieldEquals('SellOrder', soId, 'seller', seller1Id)
    assert.fieldEquals('Ticket', ticketId1, 'isOnSale', 'true')
    assert.fieldEquals('Ticket', ticketId1, 'activeSellOrder', soId)
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '1')
  })

  test('creates SELL_ORDER_CREATED activity log', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleSellOrderCreated(mockSellOrderCreated())

    let alId = TX_HASH_2.toHexString() + '-0'
    assert.fieldEquals('ActivityLog', alId, 'type', 'SELL_ORDER_CREATED')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. handleSellOrderCancelled
// ═══════════════════════════════════════════════════════════════
describe('handleSellOrderCancelled', () => {
  test('cancels SellOrder and clears ticket sale flag', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleSellOrderCreated(mockSellOrderCreated())
    handleSellOrderCancelled(mockSellOrderCancelled())

    let soId = TX_HASH_2.toHexString() + '-0'
    assert.fieldEquals('SellOrder', soId, 'status', 'CANCELLED')
    assert.fieldEquals('Ticket', ticketId1, 'isOnSale', 'false')
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '0')
  })

  test('counter does not go below zero', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    // Cancel without a prior create (edge case)
    handleSellOrderCancelled(mockSellOrderCancelled())
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '0')
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. handleBuyOrderCreated
// ═══════════════════════════════════════════════════════════════
describe('handleBuyOrderCreated', () => {
  test('creates BuyOrder ACTIVE entity', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleBuyOrderCreated(mockBuyOrderCreated())

    let boId = eventId + '-1'
    assert.entityCount('BuyOrder', 1)
    assert.fieldEquals('BuyOrder', boId, 'status', 'ACTIVE')
    assert.fieldEquals(
      'BuyOrder',
      boId,
      'amountLocked',
      SECONDARY_PRICE.toString(),
    )
    assert.fieldEquals('BuyOrder', boId, 'buyer', buyer1Id)
    assert.fieldEquals(
      'BuyOrder',
      boId,
      'identityHash',
      IDENTITY_HASH.toHexString(),
    )
    assert.fieldEquals('Event', eventId, 'activeBuyOrdersCount', '1')
  })

  test('creates BUY_ORDER_CREATED activity log', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleBuyOrderCreated(mockBuyOrderCreated())
    let alId = TX_HASH_2.toHexString() + '-0'
    assert.fieldEquals('ActivityLog', alId, 'type', 'BUY_ORDER_CREATED')
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. handleBuyOrderCancelled
// ═══════════════════════════════════════════════════════════════
describe('handleBuyOrderCancelled', () => {
  test('sets BuyOrder to CANCELLED with refund', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleBuyOrderCreated(mockBuyOrderCreated())
    handleBuyOrderCancelled(mockBuyOrderCancelled())

    let boId = eventId + '-1'
    assert.fieldEquals('BuyOrder', boId, 'status', 'CANCELLED')
    assert.fieldEquals(
      'BuyOrder',
      boId,
      'refundedAmount',
      SECONDARY_PRICE.toString(),
    )
    assert.fieldEquals('Event', eventId, 'activeBuyOrdersCount', '0')
  })

  test('counter clamp to zero', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleBuyOrderCancelled(mockBuyOrderCancelled())
    assert.fieldEquals('Event', eventId, 'activeBuyOrdersCount', '0')
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. handleOrderMatched — Path A (seller lists, buyer in queue)
// ═══════════════════════════════════════════════════════════════
describe('handleOrderMatched — Path A (_matchWithBuyer)', () => {
  test('transfers ticket and completes BuyOrder', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleBuyOrderCreated(mockBuyOrderCreated())
    let boId = eventId + '-1'

    // Path A: sellOrderId=0, buyOrderId>0
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(0),
        BigInt.fromI32(1),
        NEW_IDENTITY_HASH,
      ),
    )

    assert.fieldEquals('Ticket', ticketId1, 'currentOwner', buyer1Id)
    assert.fieldEquals('Ticket', ticketId1, 'isOnSale', 'false')
    assert.fieldEquals(
      'Ticket',
      ticketId1,
      'lastResalePrice',
      SECONDARY_PRICE.toString(),
    )
    assert.fieldEquals(
      'Ticket',
      ticketId1,
      'identityHash',
      NEW_IDENTITY_HASH.toHexString(),
    )

    assert.fieldEquals('BuyOrder', boId, 'status', 'COMPLETED')
    assert.fieldEquals('BuyOrder', boId, 'matchedTicket', ticketId1)

    assert.fieldEquals('User', seller1Id, 'totalTicketsSold', '1')
    assert.fieldEquals('User', buyer1Id, 'totalTicketsBought', '1')
  })

  test('updates Event secondary stats', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleBuyOrderCreated(mockBuyOrderCreated())
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(0),
        BigInt.fromI32(1),
      ),
    )

    assert.fieldEquals(
      'Event',
      eventId,
      'totalSecondaryVolume',
      SECONDARY_PRICE.toString(),
    )
    assert.fieldEquals(
      'Event',
      eventId,
      'totalRoyaltiesCollected',
      ROYALTY_AMOUNT.toString(),
    )
    assert.fieldEquals('Event', eventId, 'totalResales', '1')
    assert.fieldEquals('Event', eventId, 'activeBuyOrdersCount', '0')
  })

  test('organizer royaltyBalance increases', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(0),
        BigInt.fromI32(1),
      ),
    )
    assert.fieldEquals(
      'Balance',
      balanceId,
      'royaltyBalance',
      ROYALTY_AMOUNT.toString(),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. handleOrderMatched — Path B (buyer places, seller in queue)
// ═══════════════════════════════════════════════════════════════
describe('handleOrderMatched — Path B (_matchWithSeller)', () => {
  test('completes SellOrder and credits seller balance', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleSellOrderCreated(mockSellOrderCreated())
    let soId = TX_HASH_2.toHexString() + '-0'

    // Path B: sellOrderId>0, buyOrderId=0
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(1),
        BigInt.fromI32(0),
      ),
    )

    assert.fieldEquals('SellOrder', soId, 'status', 'COMPLETED')
    assert.fieldEquals(
      'SellOrder',
      soId,
      'royaltyPaid',
      ROYALTY_AMOUNT.toString(),
    )
    assert.fieldEquals(
      'SellOrder',
      soId,
      'sellerReceived',
      SELLER_RECEIVED.toString(),
    )

    let sellerBalId = eventId + '-' + seller1Id
    assert.fieldEquals(
      'Balance',
      sellerBalId,
      'sellerBalance',
      SELLER_RECEIVED.toString(),
    )
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '0')
  })

  test('creates ORDER_MATCHED activity log', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleSellOrderCreated(mockSellOrderCreated())
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(1),
        BigInt.fromI32(0),
      ),
    )

    let alId = TX_HASH_3.toHexString() + '-0'
    assert.fieldEquals('ActivityLog', alId, 'type', 'ORDER_MATCHED')
    assert.fieldEquals('ActivityLog', alId, 'from', seller1Id)
    assert.fieldEquals('ActivityLog', alId, 'to', buyer1Id)
    assert.fieldEquals(
      'ActivityLog',
      alId,
      'royaltyAmount',
      ROYALTY_AMOUNT.toString(),
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. handleTransfer (ERC-721)
// ═══════════════════════════════════════════════════════════════
describe('handleTransfer', () => {
  test('skips mint transfer (from=0x0)', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      BUYER_1,
    )
    let usersBefore = 2 // organizer + buyer1
    handleTransfer(mockTransfer(ZERO_ADDRESS, BUYER_1))
    // Should not create a duplicate user
    assert.fieldEquals('Ticket', ticketId1, 'currentOwner', buyer1Id)
  })

  test('updates currentOwner for non-zero transfer', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      BUYER_1,
    )
    handleTransfer(mockTransfer(BUYER_1, BUYER_2))
    assert.fieldEquals('Ticket', ticketId1, 'currentOwner', buyer2Id)
  })

  test('creates User entity for new recipient', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      BUYER_1,
    )
    handleTransfer(mockTransfer(BUYER_1, BUYER_2))
    assert.fieldEquals('User', buyer2Id, 'totalTicketsBought', '0')
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. Withdrawal handlers
// ═══════════════════════════════════════════════════════════════
describe('handleOrganizerPrimaryWithdrawal', () => {
  test('zeros out primarySalesBalance', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
    )
    handleOrganizerPrimaryWithdrawal(mockOrganizerPrimaryWithdrawal())

    assert.fieldEquals('Balance', balanceId, 'primarySalesBalance', '0')
  })

  test('creates ORGANIZER_PRIMARY_WITHDRAWAL log', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
    )
    handleOrganizerPrimaryWithdrawal(mockOrganizerPrimaryWithdrawal())
    let alId = TX_HASH_3.toHexString() + '-0'
    assert.fieldEquals(
      'ActivityLog',
      alId,
      'type',
      'ORGANIZER_PRIMARY_WITHDRAWAL',
    )
    assert.fieldEquals('ActivityLog', alId, 'price', NOMINAL_PRICE.toString())
  })
})

describe('handleOrganizerRoyaltyWithdrawal', () => {
  test('zeros out royaltyBalance', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    // Generate some royalty via match
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(0),
        BigInt.fromI32(1),
      ),
    )
    handleOrganizerRoyaltyWithdrawal(mockOrganizerRoyaltyWithdrawal())

    assert.fieldEquals('Balance', balanceId, 'royaltyBalance', '0')
  })
})

describe('handleSellerWithdrawal', () => {
  test('decrements sellerBalance and clamps to zero', () => {
    seedMintedTicket(
      handleEventCreated,
      handleEventInitialized,
      handleTicketMinted,
      SELLER_1,
    )
    handleSellOrderCreated(mockSellOrderCreated())
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(1),
        BigInt.fromI32(0),
      ),
    )
    let sellerBalId = eventId + '-' + seller1Id
    handleSellerWithdrawal(mockSellerWithdrawal())
    assert.fieldEquals('Balance', sellerBalId, 'sellerBalance', '0')
  })

  test('creates SELLER_WITHDRAWAL log', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleSellerWithdrawal(mockSellerWithdrawal())
    let alId = TX_HASH_3.toHexString() + '-0'
    assert.fieldEquals('ActivityLog', alId, 'type', 'SELLER_WITHDRAWAL')
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. handleQueueGasLimitReached
// ═══════════════════════════════════════════════════════════════
describe('handleQueueGasLimitReached', () => {
  test('creates QUEUE_BATCH_CLEANUP activity log', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleQueueGasLimitReached(mockQueueGasLimitReached())

    let alId = TX_HASH_3.toHexString() + '-0'
    assert.fieldEquals('ActivityLog', alId, 'type', 'QUEUE_BATCH_CLEANUP')
    assert.fieldEquals('ActivityLog', alId, 'event', eventId)
  })

  test('updates Event.updatedAt', () => {
    seedEventWithInit(handleEventCreated, handleEventInitialized)
    handleQueueGasLimitReached(mockQueueGasLimitReached())
    assert.fieldEquals('Event', eventId, 'updatedAt', TIMESTAMP_2.toString())
  })
})

// ═══════════════════════════════════════════════════════════════
// Integration: Full lifecycle scenario
// ═══════════════════════════════════════════════════════════════
describe('Full lifecycle — mint → list → match → withdraw', () => {
  test('end-to-end flow', () => {
    // 1. Create event
    handleEventCreated(mockEventCreated())
    handleEventInitialized(mockEventInitialized())

    // 2. Mint ticket to seller
    handleTicketMinted(mockTicketMinted(SELLER_1, TOKEN_ID_1))
    assert.fieldEquals('Event', eventId, 'totalMinted', '1')

    // 3. Seller lists ticket
    handleSellOrderCreated(mockSellOrderCreated())
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '1')

    // 4. Match (Path B: buyer places, seller in queue)
    handleOrderMatched(
      mockOrderMatched(
        TOKEN_ID_1,
        SELLER_1,
        BUYER_1,
        SECONDARY_PRICE,
        ROYALTY_AMOUNT,
        SELLER_RECEIVED,
        BigInt.fromI32(1),
        BigInt.fromI32(0),
      ),
    )

    // Verify final state
    assert.fieldEquals('Ticket', ticketId1, 'currentOwner', buyer1Id)
    assert.fieldEquals('Event', eventId, 'totalResales', '1')
    assert.fieldEquals('Event', eventId, 'activeSellOrdersCount', '0')
    assert.fieldEquals(
      'Balance',
      balanceId,
      'royaltyBalance',
      ROYALTY_AMOUNT.toString(),
    )

    // 5. Withdrawals
    handleOrganizerPrimaryWithdrawal(mockOrganizerPrimaryWithdrawal())
    assert.fieldEquals('Balance', balanceId, 'primarySalesBalance', '0')

    handleOrganizerRoyaltyWithdrawal(mockOrganizerRoyaltyWithdrawal())
    assert.fieldEquals('Balance', balanceId, 'royaltyBalance', '0')

    handleSellerWithdrawal(mockSellerWithdrawal())
    let sellerBalId = eventId + '-' + seller1Id
    assert.fieldEquals('Balance', sellerBalId, 'sellerBalance', '0')
  })
})
