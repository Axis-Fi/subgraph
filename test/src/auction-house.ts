import {
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  Bid as BidEvent,
  CancelBid as CancelBidEvent,
  Curated as CuratedEvent,
  ModuleInstalled as ModuleInstalledEvent,
  ModuleSunset as ModuleSunsetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Purchase as PurchaseEvent,
  Settle as SettleEvent
} from "../generated/AuctionHouse/AuctionHouse"
import {
  AuctionCancelled,
  AuctionCreated,
  Bid,
  CancelBid,
  Curated,
  ModuleInstalled,
  ModuleSunset,
  OwnershipTransferred,
  Purchase,
  Settle
} from "../generated/schema"

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  let entity = new AuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.AuctionHouse_id = event.params.id
  entity.auctionRef = event.params.auctionRef

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  let entity = new AuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.AuctionHouse_id = event.params.id
  entity.auctionRef = event.params.auctionRef
  entity.baseToken = event.params.baseToken
  entity.quoteToken = event.params.quoteToken

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBid(event: BidEvent): void {
  let entity = new Bid(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.lotId_ = event.params.lotId_
  entity.bidId_ = event.params.bidId_
  entity.bidder = event.params.bidder
  entity.amount = event.params.amount

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCancelBid(event: CancelBidEvent): void {
  let entity = new CancelBid(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lotId_ = event.params.lotId_
  entity.bidId_ = event.params.bidId_
  entity.bidder = event.params.bidder

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleCurated(event: CuratedEvent): void {
  let entity = new Curated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.AuctionHouse_id = event.params.id
  entity.curator = event.params.curator

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleModuleInstalled(event: ModuleInstalledEvent): void {
  let entity = new ModuleInstalled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.keycode_ = event.params.keycode_
  entity.version_ = event.params.version_
  entity.address_ = event.params.address_

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleModuleSunset(event: ModuleSunsetEvent): void {
  let entity = new ModuleSunset(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.keycode_ = event.params.keycode_

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePurchase(event: PurchaseEvent): void {
  let entity = new Purchase(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lotId_ = event.params.lotId_
  entity.buyer = event.params.buyer
  entity.referrer = event.params.referrer
  entity.amount = event.params.amount
  entity.payout = event.params.payout

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleSettle(event: SettleEvent): void {
  let entity = new Settle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lotId_ = event.params.lotId_

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
