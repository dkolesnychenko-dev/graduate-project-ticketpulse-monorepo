// ═══════════════════════════════════════════════════════════════════
// TicketPulse Subgraph — Event Handlers (AssemblyScript / graph-ts)
// ═══════════════════════════════════════════════════════════════════
//
// Best practices applied:
//   1. getOrCreate pattern for User/Balance (idempotent, no crashes)
//   2. All counters maintained incrementally (no store.loadRelated)
//   3. Every mutation updates `updatedAt` / `updatedTxHash`
//   4. ActivityLog for EVERY event (full audit trail)
//   5. ID conventions: deterministic, collision-free
//   6. No eth_call — all data derived from event params
//   7. BigInt.zero() for monetary defaults (never leave required null)
// ═══════════════════════════════════════════════════════════════════

import { BigInt, Bytes, Address, ethereum, log } from '@graphprotocol/graph-ts'

import { EventCreated } from '../generated/TicketPulseFactory/TicketPulseFactory'
import { TicketPulseEvent as TicketPulseEventTemplate } from '../generated/templates'
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
import {
  User,
  Event,
  Ticket,
  SellOrder,
  BuyOrder,
  Balance,
  ActivityLog,
} from '../generated/schema'

// ─── Constants ──────────────────────────────────────────────────────
const ZERO = BigInt.zero()
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

// ─── ID helpers ─────────────────────────────────────────────────────

function ticketId(eventAddr: string, tokenId: BigInt): string {
  return eventAddr + '-' + tokenId.toString()
}

function sellOrderId(txHash: Bytes, logIndex: BigInt): string {
  return txHash.toHexString() + '-' + logIndex.toString()
}

function buyOrderEntityId(eventAddr: string, orderId: BigInt): string {
  return eventAddr + '-' + orderId.toString()
}

function balanceId(eventAddr: string, userAddr: string): string {
  return eventAddr + '-' + userAddr
}

function activityLogId(txHash: Bytes, logIndex: BigInt): string {
  return txHash.toHexString() + '-' + logIndex.toString()
}

// ─── getOrCreate helpers ────────────────────────────────────────────

function getOrCreateUser(address: Address, timestamp: BigInt): User {
  let id = address.toHexString()
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
    user.totalEventsCreated = 0
    user.totalTicketsBought = 0
    user.totalTicketsSold = 0
    user.createdAt = timestamp
    user.updatedAt = timestamp
  }
  return user
}

function getOrCreateBalance(eventAddr: string, userAddr: string): Balance {
  let id = balanceId(eventAddr, userAddr)
  let balance = Balance.load(id)
  if (balance == null) {
    balance = new Balance(id)
    balance.event = eventAddr
    balance.user = userAddr
    balance.primarySalesBalance = ZERO
    balance.royaltyBalance = ZERO
    balance.sellerBalance = ZERO
  }
  return balance
}

// ─── Activity Log factory ───────────────────────────────────────────

function createActivityLog(
  ev: ethereum.Event,
  activityType: string,
  eventAddr: string,
  initiatorAddr: string,
): ActivityLog {
  let id = activityLogId(ev.transaction.hash, ev.logIndex)
  let al = new ActivityLog(id)
  al.type = activityType
  al.createdAt = ev.block.timestamp
  al.blockNumber = ev.block.number
  al.txHash = ev.transaction.hash
  al.logIndex = ev.logIndex.toI32()
  al.event = eventAddr
  al.initiator = initiatorAddr
  return al
}

// ═══════════════════════════════════════════════════════════════════
// 1. FACTORY  →  handleEventCreated
// ═══════════════════════════════════════════════════════════════════

export function handleEventCreated(event: EventCreated): void {
  let eventAddr = event.params.eventContract
  let organizerAddr = event.params.organizer

  // Spin up dynamic data source for the new clone
  TicketPulseEventTemplate.create(eventAddr)

  // Create skeleton Event entity (filled by handleEventInitialized)
  let ev = new Event(eventAddr.toHexString())
  let organizer = getOrCreateUser(organizerAddr, event.block.timestamp)
  organizer.totalEventsCreated += 1
  organizer.updatedAt = event.block.timestamp
  organizer.save()

  ev.organizer = organizer.id
  ev.createdAt = event.block.timestamp
  ev.createdTxHash = event.transaction.hash
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash

  // Defaults — will be overwritten by EventInitialized
  ev.startTime = ZERO
  ev.endTime = ZERO
  ev.nominalPrice = ZERO
  ev.maxSupply = 0
  ev.maxTicketsPerWallet = 0
  ev.totalMinted = 0
  ev.royaltyPercentage = 0
  ev.markupPercentage = 0
  ev.secondaryMarketPrice = ZERO

  ev.totalPrimaryVolume = ZERO
  ev.totalSecondaryVolume = ZERO
  ev.totalRoyaltiesCollected = ZERO
  ev.totalResales = 0

  ev.activeSellOrdersCount = 0
  ev.activeBuyOrdersCount = 0

  ev.save()

  // Activity log
  let al = createActivityLog(event, 'EVENT_CREATED', ev.id, organizer.id)
  al.save()
}

// ═══════════════════════════════════════════════════════════════════
// 2. CLONE  →  handleEventInitialized
// ═══════════════════════════════════════════════════════════════════

export function handleEventInitialized(event: EventInitialized): void {
  let eventAddr = event.address.toHexString()
  let ev = Event.load(eventAddr)
  if (ev == null) {
    log.warning('[handleEventInitialized] Event {} not found', [eventAddr])
    return
  }

  let p = event.params

  ev.startTime = p.startTime
  ev.endTime = p.endTime
  ev.nominalPrice = p.nominalPrice
  ev.maxSupply = p.maxSupply.toI32()
  ev.maxTicketsPerWallet = p.maxTicketsPerWallet
  ev.royaltyPercentage = p.royaltyPct
  ev.markupPercentage = p.markupPct
  ev.secondaryMarketPrice = p.secondaryPrice

  ev.title = p.title
  ev.ticketType = p.ticketType
  ev.ticketSymbol = p.ticketSymbol
  ev.ipfsCoverImageCid = p.ipfsCoverImageCid
  ev.ipfsMetadataCid = p.ipfsMetadataCid

  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash

  ev.save()

  // Create organizer balance for this event
  let balance = getOrCreateBalance(eventAddr, ev.organizer)
  balance.save()
}

// ═══════════════════════════════════════════════════════════════════
// 3. PRIMARY MARKET  →  handleTicketMinted
// ═══════════════════════════════════════════════════════════════════

export function handleTicketMinted(event: TicketMinted): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let ev = Event.load(eventAddr)
  if (ev == null) return

  // --- User (buyer) ---
  let buyer = getOrCreateUser(p.buyer, event.block.timestamp)
  buyer.totalTicketsBought += 1
  buyer.updatedAt = event.block.timestamp
  buyer.save()

  // --- Ticket ---
  let tId = ticketId(eventAddr, p.tokenId)
  let ticket = new Ticket(tId)
  ticket.tokenId = p.tokenId.toI32()
  ticket.event = eventAddr
  ticket.currentOwner = buyer.id
  ticket.originalMinter = buyer.id
  ticket.identityHash = p.identityHash
  ticket.isOnSale = false
  ticket.mintPrice = p.price
  ticket.mintedAt = event.block.timestamp
  ticket.mintedTxHash = event.transaction.hash
  ticket.updatedAt = event.block.timestamp
  ticket.updatedTxHash = event.transaction.hash
  ticket.save()

  // --- Event counters ---
  ev.totalMinted += 1
  ev.totalPrimaryVolume = ev.totalPrimaryVolume.plus(p.price)
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash
  ev.save()

  // --- Organizer balance (primary sales) ---
  let balance = getOrCreateBalance(eventAddr, ev.organizer)
  balance.primarySalesBalance = balance.primarySalesBalance.plus(p.price)
  balance.save()

  // --- Activity log ---
  let al = createActivityLog(event, 'TICKET_MINTED', eventAddr, buyer.id)
  al.ticket = tId
  al.to = buyer.id
  al.price = p.price
  al.save()
}

// ═══════════════════════════════════════════════════════════════════
// 4. SECONDARY MARKET — SELL SIDE
// ═══════════════════════════════════════════════════════════════════

export function handleSellOrderCreated(event: SellOrderCreated): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let ev = Event.load(eventAddr)
  if (ev == null) return

  let seller = getOrCreateUser(p.seller, event.block.timestamp)
  seller.updatedAt = event.block.timestamp
  seller.save()

  let tId = ticketId(eventAddr, p.tokenId)
  let soId = sellOrderId(event.transaction.hash, event.logIndex)

  // --- SellOrder ---
  let so = new SellOrder(soId)
  so.event = eventAddr
  so.ticket = tId
  so.seller = seller.id
  so.price = p.price
  so.createdAt = event.block.timestamp
  so.createdTxHash = event.transaction.hash
  so.createdLogIndex = event.logIndex.toI32()
  so.status = 'ACTIVE'
  so.save()

  // --- Ticket ---
  let ticket = Ticket.load(tId)
  if (ticket != null) {
    ticket.isOnSale = true
    ticket.activeSellOrder = soId
    ticket.updatedAt = event.block.timestamp
    ticket.updatedTxHash = event.transaction.hash
    ticket.save()
  }

  // --- Event counters ---
  ev.activeSellOrdersCount += 1
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash
  ev.save()

  // --- Activity log ---
  let al = createActivityLog(event, 'SELL_ORDER_CREATED', eventAddr, seller.id)
  al.ticket = tId
  al.from = seller.id
  al.price = p.price
  al.sellOrder = soId
  al.save()
}

export function handleSellOrderCancelled(event: SellOrderCancelled): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let ev = Event.load(eventAddr)
  if (ev == null) return

  let seller = getOrCreateUser(p.seller, event.block.timestamp)
  seller.updatedAt = event.block.timestamp
  seller.save()

  let tId = ticketId(eventAddr, p.tokenId)

  // Find the active SellOrder for this ticket
  let ticket = Ticket.load(tId)
  let soId: string | null = null
  if (ticket != null) {
    soId = ticket.activeSellOrder
    ticket.isOnSale = false
    ticket.activeSellOrder = null
    ticket.updatedAt = event.block.timestamp
    ticket.updatedTxHash = event.transaction.hash
    ticket.save()
  }

  // Update SellOrder status
  if (soId != null) {
    let so = SellOrder.load(soId!)
    if (so != null) {
      so.status = 'CANCELLED'
      so.cancelledAt = event.block.timestamp
      so.cancelledTxHash = event.transaction.hash
      so.save()
    }
  }

  // Event counters
  ev.activeSellOrdersCount =
    ev.activeSellOrdersCount > 0 ? ev.activeSellOrdersCount - 1 : 0
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash
  ev.save()

  // Activity log
  let al = createActivityLog(
    event,
    'SELL_ORDER_CANCELLED',
    eventAddr,
    seller.id,
  )
  al.ticket = tId
  al.from = seller.id
  if (soId != null) al.sellOrder = soId
  al.save()
}

// ═══════════════════════════════════════════════════════════════════
// 5. SECONDARY MARKET — BUY SIDE
// ═══════════════════════════════════════════════════════════════════

export function handleBuyOrderCreated(event: BuyOrderCreated): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let ev = Event.load(eventAddr)
  if (ev == null) return

  let buyer = getOrCreateUser(p.buyer, event.block.timestamp)
  buyer.updatedAt = event.block.timestamp
  buyer.save()

  let boId = buyOrderEntityId(eventAddr, p.buyOrderId)

  let bo = new BuyOrder(boId)
  bo.orderId = p.buyOrderId.toI32()
  bo.event = eventAddr
  bo.buyer = buyer.id
  bo.amountLocked = p.amountLocked
  bo.identityHash = p.identityHash
  bo.createdAt = event.block.timestamp
  bo.createdTxHash = event.transaction.hash
  bo.status = 'ACTIVE'
  bo.save()

  // Event counters
  ev.activeBuyOrdersCount += 1
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash
  ev.save()

  // Activity log
  let al = createActivityLog(event, 'BUY_ORDER_CREATED', eventAddr, buyer.id)
  al.to = buyer.id
  al.price = p.amountLocked
  al.buyOrder = boId
  al.save()
}

export function handleBuyOrderCancelled(event: BuyOrderCancelled): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let ev = Event.load(eventAddr)
  if (ev == null) return

  let buyer = getOrCreateUser(p.buyer, event.block.timestamp)
  buyer.updatedAt = event.block.timestamp
  buyer.save()

  // The buyOrderId from the event is the queue index used as activeBuyOrderId
  let boId = buyOrderEntityId(eventAddr, p.buyOrderId)
  let bo = BuyOrder.load(boId)
  if (bo != null) {
    bo.status = 'CANCELLED'
    bo.cancelledAt = event.block.timestamp
    bo.cancelledTxHash = event.transaction.hash
    bo.refundedAmount = p.refundedAmount
    bo.save()
  }

  // Event counters
  ev.activeBuyOrdersCount =
    ev.activeBuyOrdersCount > 0 ? ev.activeBuyOrdersCount - 1 : 0
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash
  ev.save()

  // Activity log
  let al = createActivityLog(event, 'BUY_ORDER_CANCELLED', eventAddr, buyer.id)
  al.to = buyer.id
  al.price = p.refundedAmount
  if (bo != null) al.buyOrder = boId
  al.save()
}

// ═══════════════════════════════════════════════════════════════════
// 6. MATCHING ENGINE  →  handleOrderMatched
// ═══════════════════════════════════════════════════════════════════

export function handleOrderMatched(event: OrderMatched): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let ev = Event.load(eventAddr)
  if (ev == null) return

  let tId = ticketId(eventAddr, p.tokenId)

  // --- Users ---
  let seller = getOrCreateUser(p.seller, event.block.timestamp)
  seller.totalTicketsSold += 1
  seller.updatedAt = event.block.timestamp
  seller.save()

  let buyer = getOrCreateUser(p.buyer, event.block.timestamp)
  buyer.totalTicketsBought += 1
  buyer.updatedAt = event.block.timestamp
  buyer.save()

  // --- Resolve SellOrder BEFORE clearing ticket.activeSellOrder ---
  //
  // Contract matching paths:
  //   Path A (_matchWithBuyer): seller calls listForSale → instant match
  //            sellOrderId = 0 (never queued), buyOrderId = queue index
  //   Path B (_matchWithSeller): buyer calls placeBuyOrder → instant match
  //            sellOrderId = queue index, buyOrderId = 0 (never queued)
  //
  // sellOrderId == 0 means seller matched immediately (no SellOrder entity exists)
  // buyOrderId  == 0 means buyer  matched immediately (no BuyOrder entity exists)

  let sellOrderIdVal = p.sellOrderId
  let buyOrderIdVal = p.buyOrderId

  let soEntityId: string | null = null
  let boEntityId: string | null = null

  // Read ticket.activeSellOrder BEFORE we clear it
  let ticket = Ticket.load(tId)
  if (ticket != null && sellOrderIdVal.gt(ZERO)) {
    soEntityId = ticket.activeSellOrder
  }

  // --- Ticket update ---
  if (ticket != null) {
    ticket.currentOwner = buyer.id
    ticket.identityHash = p.newIdentityHash
    ticket.isOnSale = false
    ticket.activeSellOrder = null
    ticket.lastResalePrice = p.price
    ticket.updatedAt = event.block.timestamp
    ticket.updatedTxHash = event.transaction.hash
    ticket.save()
  }

  // --- Update SellOrder if it was queued (Path B) ---
  if (soEntityId != null) {
    let so = SellOrder.load(soEntityId!)
    if (so != null) {
      so.status = 'COMPLETED'
      so.executedAt = event.block.timestamp
      so.executedTxHash = event.transaction.hash
      so.buyer = buyer.id
      so.royaltyPaid = p.royaltyAmount
      so.sellerReceived = p.sellerReceived
      so.save()
    }

    ev.activeSellOrdersCount =
      ev.activeSellOrdersCount > 0 ? ev.activeSellOrdersCount - 1 : 0
  }

  // --- Update BuyOrder if it was queued (Path A) ---
  if (buyOrderIdVal.gt(ZERO)) {
    boEntityId = buyOrderEntityId(eventAddr, buyOrderIdVal)
    let bo = BuyOrder.load(boEntityId)
    if (bo != null) {
      bo.status = 'COMPLETED'
      bo.executedAt = event.block.timestamp
      bo.executedTxHash = event.transaction.hash
      bo.matchedTicket = tId
      bo.seller = seller.id
      bo.save()
    }

    ev.activeBuyOrdersCount =
      ev.activeBuyOrdersCount > 0 ? ev.activeBuyOrdersCount - 1 : 0
  }

  // --- Balances ---
  // Organizer always gets royalty on every resale
  let orgBalance = getOrCreateBalance(eventAddr, ev.organizer)
  orgBalance.royaltyBalance = orgBalance.royaltyBalance.plus(p.royaltyAmount)
  orgBalance.save()

  // Path B (_matchWithSeller): seller funds go to on-chain sellerBalance (pull pattern)
  // Path A (_matchWithBuyer):  ETH pushed directly to seller, no balance to track
  if (sellOrderIdVal.gt(ZERO)) {
    let sellerBal = getOrCreateBalance(eventAddr, seller.id)
    sellerBal.sellerBalance = sellerBal.sellerBalance.plus(p.sellerReceived)
    sellerBal.save()
  }

  // --- Event statistics ---
  ev.totalSecondaryVolume = ev.totalSecondaryVolume.plus(p.price)
  ev.totalRoyaltiesCollected = ev.totalRoyaltiesCollected.plus(p.royaltyAmount)
  ev.totalResales += 1
  ev.updatedAt = event.block.timestamp
  ev.updatedTxHash = event.transaction.hash
  ev.save()

  // --- Activity log ---
  let al = createActivityLog(
    event,
    'ORDER_MATCHED',
    eventAddr,
    event.transaction.from.toHexString(),
  )
  al.ticket = tId
  al.from = seller.id
  al.to = buyer.id
  al.price = p.price
  al.royaltyAmount = p.royaltyAmount
  if (soEntityId != null) al.sellOrder = soEntityId
  if (boEntityId != null) al.buyOrder = boEntityId
  al.save()
}

// ═══════════════════════════════════════════════════════════════════
// 7. ERC-721 TRANSFER (ownership tracking)
// ═══════════════════════════════════════════════════════════════════

export function handleTransfer(event: Transfer): void {
  let eventAddr = event.address.toHexString()
  let p = event.params
  let fromAddr = p.from.toHexString()
  let toAddr = p.to.toHexString()

  // Skip mint transfers (from == 0x0) — handled by TicketMinted
  if (fromAddr == ZERO_ADDRESS) return

  // Skip burn transfers (to == 0x0) — not expected in this contract
  if (toAddr == ZERO_ADDRESS) return

  // Secondary market transfers are handled by OrderMatched.
  // This handler ensures currentOwner stays correct for any edge case.
  let tId = ticketId(eventAddr, p.tokenId)
  let ticket = Ticket.load(tId)
  if (ticket != null) {
    // Ensure the new owner User entity exists
    let newOwner = getOrCreateUser(p.to, event.block.timestamp)
    newOwner.updatedAt = event.block.timestamp
    newOwner.save()

    ticket.currentOwner = newOwner.id
    ticket.updatedAt = event.block.timestamp
    ticket.updatedTxHash = event.transaction.hash
    ticket.save()
  }
}

// ═══════════════════════════════════════════════════════════════════
// 8. WITHDRAWALS
// ═══════════════════════════════════════════════════════════════════

export function handleOrganizerPrimaryWithdrawal(
  event: OrganizerPrimaryWithdrawal,
): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let organizer = getOrCreateUser(p.organizer, event.block.timestamp)
  organizer.updatedAt = event.block.timestamp
  organizer.save()

  // Zero out the primary sales balance
  let balance = getOrCreateBalance(eventAddr, organizer.id)
  balance.primarySalesBalance = ZERO
  balance.save()

  // Update Event
  let ev = Event.load(eventAddr)
  if (ev != null) {
    ev.updatedAt = event.block.timestamp
    ev.updatedTxHash = event.transaction.hash
    ev.save()
  }

  // Activity log
  let al = createActivityLog(
    event,
    'ORGANIZER_PRIMARY_WITHDRAWAL',
    eventAddr,
    organizer.id,
  )
  al.price = p.amount
  al.save()
}

export function handleOrganizerRoyaltyWithdrawal(
  event: OrganizerRoyaltyWithdrawal,
): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let organizer = getOrCreateUser(p.organizer, event.block.timestamp)
  organizer.updatedAt = event.block.timestamp
  organizer.save()

  let balance = getOrCreateBalance(eventAddr, organizer.id)
  balance.royaltyBalance = ZERO
  balance.save()

  let ev = Event.load(eventAddr)
  if (ev != null) {
    ev.updatedAt = event.block.timestamp
    ev.updatedTxHash = event.transaction.hash
    ev.save()
  }

  let al = createActivityLog(
    event,
    'ORGANIZER_ROYALTY_WITHDRAWAL',
    eventAddr,
    organizer.id,
  )
  al.price = p.amount
  al.save()
}

export function handleSellerWithdrawal(event: SellerWithdrawal): void {
  let eventAddr = event.address.toHexString()
  let p = event.params

  let seller = getOrCreateUser(p.seller, event.block.timestamp)
  seller.updatedAt = event.block.timestamp
  seller.save()

  let balance = getOrCreateBalance(eventAddr, seller.id)
  balance.sellerBalance = balance.sellerBalance.minus(p.amount)
  // Clamp to zero (safety)
  if (balance.sellerBalance.lt(ZERO)) {
    balance.sellerBalance = ZERO
  }
  balance.save()

  let ev = Event.load(eventAddr)
  if (ev != null) {
    ev.updatedAt = event.block.timestamp
    ev.updatedTxHash = event.transaction.hash
    ev.save()
  }

  let al = createActivityLog(event, 'SELLER_WITHDRAWAL', eventAddr, seller.id)
  al.price = p.amount
  al.save()
}

// ═══════════════════════════════════════════════════════════════════
// 9. GAS LIMIT  →  handleQueueGasLimitReached
// ═══════════════════════════════════════════════════════════════════

export function handleQueueGasLimitReached(event: QueueGasLimitReached): void {
  let eventAddr = event.address.toHexString()

  let ev = Event.load(eventAddr)
  if (ev != null) {
    ev.updatedAt = event.block.timestamp
    ev.updatedTxHash = event.transaction.hash
    ev.save()
  }

  let al = createActivityLog(
    event,
    'QUEUE_BATCH_CLEANUP',
    eventAddr,
    event.transaction.from.toHexString(),
  )
  al.save()
}
