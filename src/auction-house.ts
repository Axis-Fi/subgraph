import {
  Address,
  BigInt,
  Bytes,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";

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
  Settle as SettleEvent,
} from "../generated/AuctionHouse/AuctionHouse";
import { ERC20 } from "../generated/AuctionHouse/ERC20";
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionLotSnapshot,
  Bid,
  CancelBid,
  Curated,
  ModuleInstalled,
  ModuleSunset,
  OwnershipTransferred,
  Purchase,
  Settle,
} from "../generated/schema";
import { Token } from "../generated/schema";
import { getAuctionHouse, getAuctionLot } from "./helpers/auction";
import { toDecimal } from "./helpers/number";

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

function _saveLotSnapshot(
  lotId: BigInt,
  block: ethereum.Block,
  transactionHash: Bytes,
  logIndex: BigInt,
): void {
  const auctionLot = getAuctionLot(lotId);

  const entity = new AuctionLotSnapshot(
    transactionHash.concatI32(logIndex.toI32()),
  );
  entity.lot = lotId.toString();

  entity.blockNumber = block.number;
  entity.blockTimestamp = block.timestamp;
  entity.transactionHash = transactionHash;

  entity.capacity = toDecimal(
    auctionLot.getCapacity(),
    auctionLot.getCapacityInQuote()
      ? auctionLot.getQuoteTokenDecimals()
      : auctionLot.getBaseTokenDecimals(),
  );
  entity.sold = toDecimal(
    auctionLot.getSold(),
    auctionLot.getBaseTokenDecimals(),
  );
  entity.purchased = toDecimal(
    auctionLot.getPurchased(),
    auctionLot.getQuoteTokenDecimals(),
  );

  entity.save();
}

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  const lotId = event.params.lotId;

  const entity = new AuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotId.toString();
  entity.auctionRef = event.params.auctionRef;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const lotId = event.params.lotId;

  const entity = new AuctionCreated(lotId.toString());
  entity.lotId = lotId;
  entity.auctionRef = event.params.auctionRef;
  entity.baseToken = _getOrCreateToken(event.params.baseToken).id;
  entity.quoteToken = _getOrCreateToken(event.params.quoteToken).id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.chain = dataSource.network();

  // Get the auction routing
  const auctionHouse = getAuctionHouse();

  const auctionRouting = auctionHouse.lotRouting(entity.lotId);
  entity.owner = auctionRouting.getOwner();
  entity.derivativeRef = auctionRouting.getDerivativeReference();
  entity.wrapDerivative = auctionRouting.getWrapDerivative();

  const auctionCuration = auctionHouse.lotCuration(entity.lotId);
  entity.curator = auctionCuration.getCurator();

  // Get the auction details
  const auctionLot = getAuctionLot(entity.lotId);
  entity.start = auctionLot.getStart();
  entity.conclusion = auctionLot.getConclusion();
  entity.capacityInQuote = auctionLot.getCapacityInQuote();
  entity.capacity = toDecimal(
    auctionLot.getCapacity(),
    auctionLot.getCapacityInQuote()
      ? auctionLot.getQuoteTokenDecimals()
      : auctionLot.getBaseTokenDecimals(),
  );
  entity.save();

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

function _getBidId(lotId: BigInt, bidId: BigInt): string {
  return lotId.toString().concat("-").concat(bidId.toString());
}

export function handleBid(event: BidEvent): void {
  const lotId = event.params.lotId;
  const bidId = event.params.bidId;

  const entity = new Bid(_getBidId(lotId, bidId));
  entity.lot = lotId.toString();
  entity.bidId = bidId;
  entity.bidder = event.params.bidder;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  const auctionLot = getAuctionLot(lotId);
  entity.amount = toDecimal(
    event.params.amount,
    auctionLot.getQuoteTokenDecimals(),
  );

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

export function handleCancelBid(event: CancelBidEvent): void {
  const lotId = event.params.lotId;

  const entity = new CancelBid(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotId.toString();
  entity.bid = _getBidId(lotId, event.params.bidId);
  entity.bidder = event.params.bidder;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

export function handleCurated(event: CuratedEvent): void {
  const lotId = event.params.lotId;

  const entity = new Curated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotId.toString();
  entity.curator = event.params.curator;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

export function handlePurchase(event: PurchaseEvent): void {
  const lotId = event.params.lotId;

  const entity = new Purchase(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotId.toString();
  entity.buyer = event.params.buyer;
  entity.referrer = event.params.referrer;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  const auctionLot = getAuctionLot(lotId);
  entity.amount = toDecimal(
    event.params.amount,
    auctionLot.getQuoteTokenDecimals(),
  );
  entity.payout = toDecimal(
    event.params.payout,
    auctionLot.getBaseTokenDecimals(),
  );

  entity.save();

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

export function handleSettle(event: SettleEvent): void {
  const lotId = event.params.lotId;

  const entity = new Settle(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotId.toString();
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _saveLotSnapshot(lotId, event.block, event.transaction.hash, event.logIndex);
}

// Administrative events

export function handleModuleInstalled(event: ModuleInstalledEvent): void {
  const entity = new ModuleInstalled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.keycode = event.params.keycode;
  entity.version = event.params.version;
  entity.address = event.params.location;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleModuleSunset(event: ModuleSunsetEvent): void {
  const entity = new ModuleSunset(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.keycode = event.params.keycode;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  const entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.caller = event.params.user;
  entity.newOwner = event.params.newOwner;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
