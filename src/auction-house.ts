import { Address, Bytes } from "@graphprotocol/graph-ts";
import {
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  AuctionHouse,
  Bid as BidEvent,
  CancelBid as CancelBidEvent,
  Curated as CuratedEvent,
  ModuleInstalled as ModuleInstalledEvent,
  ModuleSunset as ModuleSunsetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Purchase as PurchaseEvent,
  Settle as SettleEvent
} from "../generated/AuctionHouse/AuctionHouse";
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
} from "../generated/schema";
import { Token } from "../generated/schema";
import { ERC20 } from "../generated/AuctionHouse/ERC20";

const AUCTION_HOUSE = "0x6837fa8E3aF4C82f5EA7ac6ecBEcFE65dae8877f";

function _getAuctionHouse(): AuctionHouse {
  return AuctionHouse.bind(Address.fromString(AUCTION_HOUSE));
}

function _getERC20Contract(address: Bytes): ERC20 {
  return ERC20.bind(Address.fromBytes(address));
}

function _getOrCreateToken(address: Bytes): Token {
  let token = Token.load(address);
  if (token == null) {
    token = new Token(address);

    // Populate token data
    token.address = address;

    const tokenContract: ERC20 = _getERC20Contract(address);

    token.name = tokenContract.name();
    token.symbol = tokenContract.symbol();
    token.decimals = tokenContract.decimals();

    token.save();
  }

  return token as Token;
}

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  let entity = new AuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.lotId = event.params.id
  entity.auctionRef = event.params.auctionRef

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const entity = new AuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lotId = event.params.id;
  entity.auctionRef = event.params.auctionRef;
  entity.baseToken = _getOrCreateToken(event.params.baseToken).id;
  entity.quoteToken = _getOrCreateToken(event.params.quoteToken).id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  // Get the auction routing
  const auctionHouse = _getAuctionHouse();

  const auctionRouting = auctionHouse.lotRouting(entity.lotId);
  entity.owner = auctionRouting.getOwner();
  entity.derivativeRef = auctionRouting.getDerivativeReference();
  entity.wrapDerivative = auctionRouting.getWrapDerivative();

  const auctionCuration = auctionHouse.lotCuration(entity.lotId);
  entity.curator = auctionCuration.getCurator();

  entity.save();
}

export function handleBid(event: BidEvent): void {
  let entity = new Bid(event.transaction.hash.concatI32(event.logIndex.toI32()));
  entity.lotId = event.params.lotId_;
  entity.bidId = event.params.bidId_;
  entity.bidder = event.params.bidder;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleCancelBid(event: CancelBidEvent): void {
  let entity = new CancelBid(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lotId = event.params.lotId_;
  entity.bidId = event.params.bidId_;
  entity.bidder = event.params.bidder;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleCurated(event: CuratedEvent): void {
  let entity = new Curated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lotId = event.params.id;
  entity.curator = event.params.curator;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleModuleInstalled(event: ModuleInstalledEvent): void {
  let entity = new ModuleInstalled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.keycode = event.params.keycode_;
  entity.version = event.params.version_;
  entity.address = event.params.address_;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleModuleSunset(event: ModuleSunsetEvent): void {
  let entity = new ModuleSunset(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.keycode = event.params.keycode_;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.caller = event.params.user;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handlePurchase(event: PurchaseEvent): void {
  let entity = new Purchase(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lotId = event.params.lotId_;
  entity.buyer = event.params.buyer;
  entity.referrer = event.params.referrer;
  entity.amount = event.params.amount;
  entity.payout = event.params.payout;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleSettle(event: SettleEvent): void {
  let entity = new Settle(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lotId = event.params.lotId_;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
