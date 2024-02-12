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
  Curated as CuratedEvent,
  ModuleInstalled as ModuleInstalledEvent,
  ModuleSunset as ModuleSunsetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Purchase as PurchaseEvent,
  RefundBid as RefundBidEvent,
  Settle as SettleEvent,
} from "../generated/AuctionHouse/AuctionHouse";
import { ERC20 } from "../generated/AuctionHouse/ERC20";
import {
  AuctionCancelled,
  AuctionCreated,
  AuctionLot,
  Bid,
  Curated,
  ModuleInstalled,
  ModuleSunset,
  OwnershipTransferred,
  Purchase,
  RefundBid,
  Settle,
} from "../generated/schema";
import { Token } from "../generated/schema";
import {
  getAuctionCuration,
  getAuctionHouse,
  getAuctionLot,
} from "./helpers/auction";
import { getBidId } from "./helpers/bid";
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

function _updateAuctionLot(
  lotId: BigInt,
  block: ethereum.Block,
  transactionHash: Bytes,
): void {
  const auctionLot = getAuctionLot(lotId);

  // Get the auction lot record
  const entity = AuctionLot.load(lotId.toString());

  if (entity == null) {
    throw new Error(
      "Expected auction lot to exist for lotId " + lotId.toString(),
    );
  }

  // Update the auction lot record
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
  entity.lastUpdatedBlockNumber = block.number;
  entity.lastUpdatedBlockTimestamp = block.timestamp;
  entity.lastUpdatedTransactionHash = transactionHash;

  const auctionCuration = getAuctionCuration(lotId);
  entity.curatorApproved = auctionCuration.getCurated();

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

  _updateAuctionLot(lotId, event.block, event.transaction.hash);
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const lotId = event.params.lotId;

  // Create an AuctionLot record
  const auctionLot = new AuctionLot(lotId.toString());
  auctionLot.lotId = lotId;
  auctionLot.createdBlockNumber = event.block.number;
  auctionLot.createdBlockTimestamp = event.block.timestamp;
  auctionLot.createdTransactionHash = event.transaction.hash;
  auctionLot.chain = dataSource.network();

  const auctionLotContractRecord = getAuctionLot(lotId);

  auctionLot.capacityInQuote = auctionLotContractRecord.getCapacityInQuote();
  auctionLot.capacityInitial = toDecimal(
    auctionLotContractRecord.getCapacity(),
    auctionLotContractRecord.getCapacityInQuote()
      ? auctionLotContractRecord.getQuoteTokenDecimals()
      : auctionLotContractRecord.getBaseTokenDecimals(),
  );
  auctionLot.start = auctionLotContractRecord.getStart();
  auctionLot.conclusion = auctionLotContractRecord.getConclusion();

  auctionLot.auctionRef = event.params.auctionRef;
  auctionLot.baseToken = _getOrCreateToken(event.params.baseToken).id;
  auctionLot.quoteToken = _getOrCreateToken(event.params.quoteToken).id;

  const auctionHouse = getAuctionHouse();
  const auctionRouting = auctionHouse.lotRouting(lotId);
  auctionLot.owner = auctionRouting.getOwner();
  auctionLot.derivativeRef = auctionRouting.getDerivativeReference();
  auctionLot.wrapDerivative = auctionRouting.getWrapDerivative();

  const auctionCuration = auctionHouse.lotCuration(lotId);
  auctionLot.curator = auctionCuration.getCurator();
  auctionLot.curatorApproved = false;

  // Set initial values
  auctionLot.capacity = auctionLot.capacityInitial;
  auctionLot.sold = toDecimal(
    auctionLotContractRecord.getSold(),
    auctionLotContractRecord.getBaseTokenDecimals(),
  );
  auctionLot.purchased = toDecimal(
    auctionLotContractRecord.getPurchased(),
    auctionLotContractRecord.getQuoteTokenDecimals(),
  );
  auctionLot.lastUpdatedBlockNumber = event.block.number;
  auctionLot.lastUpdatedBlockTimestamp = event.block.timestamp;
  auctionLot.lastUpdatedTransactionHash = event.transaction.hash;

  auctionLot.save();

  // Create the event
  const entity = new AuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = auctionLot.id;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleBid(event: BidEvent): void {
  const lotId = event.params.lotId;
  const bidId = event.params.bidId;

  const entity = new Bid(getBidId(lotId, bidId));
  entity.lot = lotId.toString();
  entity.bidId = bidId;
  entity.bidder = event.params.bidder;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.amount = toDecimal(
    event.params.amount,
    getAuctionLot(lotId).getQuoteTokenDecimals(),
  );
  entity.save();

  const auctionLot = getAuctionLot(lotId);
  entity.amount = toDecimal(
    event.params.amount,
    auctionLot.getQuoteTokenDecimals(),
  );

  _updateAuctionLot(lotId, event.block, event.transaction.hash);
}

export function handleRefundBid(event: RefundBidEvent): void {
  const lotId = event.params.lotId;

  const entity = new RefundBid(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotId.toString();
  entity.bid = getBidId(lotId, event.params.bidId);
  entity.bidder = event.params.bidder;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(lotId, event.block, event.transaction.hash);
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

  _updateAuctionLot(lotId, event.block, event.transaction.hash);
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

  _updateAuctionLot(lotId, event.block, event.transaction.hash);
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

  _updateAuctionLot(lotId, event.block, event.transaction.hash);
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
