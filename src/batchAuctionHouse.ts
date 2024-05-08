import {
  Address,
  BigInt,
  Bytes,
  dataSource,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";

import {
  Abort as AbortEvent,
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  Bid as BidEvent,
  ClaimBid as ClaimBidEvent,
  Curated as CuratedEvent,
  ModuleInstalled as ModuleInstalledEvent,
  ModuleSunset as ModuleSunsetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RefundBid as RefundBidEvent,
  Settle as SettleEvent,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  AuctionHouseModuleInstalled,
  AuctionHouseModuleSunset,
  AuctionHouseOwnershipTransferred,
  BatchAuctionAborted,
  BatchAuctionCancelled,
  BatchAuctionCreated,
  BatchAuctionCurated,
  BatchAuctionLot,
  BatchAuctionSettled,
  BatchBid,
  BatchBidClaimed,
  BatchBidRefunded,
} from "../generated/schema";
import {
  getAuctionCuration,
  getAuctionHouse,
  getAuctionLot,
  getLotRecord,
  getLotRecordId,
} from "./helpers/batchAuction";
import {
  getBid,
  getBidId,
  getBidStatus,
  updateBid,
  updateBidsAmounts,
  updateBidsStatus,
} from "./helpers/bid";
import { toISO8601String } from "./helpers/date";
import { toDecimal } from "./helpers/number";
import { getOrCreateToken } from "./helpers/token";
import {
  createLinearVestingLot,
  LV_KEYCODE,
} from "./modules/batchLinearVesting";
import {
  createEncryptedMarginalPriceLot,
  EMP_KEYCODE,
  updateEncryptedMarginalPriceLot,
} from "./modules/encryptedMarginalPrice";

function _updateAuctionLot(
  auctionHouseAddress: Address,
  lotId: BigInt,
  block: ethereum.Block,
  transactionHash: Bytes,
  bidId: BigInt | null,
): void {
  const auctionLot = getAuctionLot(auctionHouseAddress, lotId);

  // Get the auction lot record
  const entity = getLotRecord(auctionHouseAddress, lotId);

  // Update the auction lot record
  entity.capacity = toDecimal(
    auctionLot.getCapacity(),
    auctionLot.getBaseTokenDecimals(),
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
  entity.lastUpdatedDate = toISO8601String(block.timestamp);
  entity.lastUpdatedTransactionHash = transactionHash;

  // Update the maxBidId if applicable
  if (bidId !== null && entity.maxBidId.lt(bidId)) {
    entity.maxBidId = bidId;
  }

  const auctionCuration = getAuctionCuration(auctionHouseAddress, lotId);
  entity.curatorApproved = auctionCuration.getCurated();

  // If using EncryptedMarginalPrice, update details
  if (entity.auctionType.includes(EMP_KEYCODE)) {
    updateEncryptedMarginalPriceLot(entity, lotId);
  }

  entity.save();
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const lotId = event.params.lotId;

  // Create a BatchAuctionLot record
  const recordId = getLotRecordId(event.address, lotId);
  log.info("Adding BatchAuctionLot record with id: {}", [recordId]);

  const auctionLot = new BatchAuctionLot(recordId);
  auctionLot.chain = dataSource.network();
  auctionLot.auctionHouse = event.address;
  auctionLot.lotId = lotId;

  auctionLot.createdBlockNumber = event.block.number;
  auctionLot.createdBlockTimestamp = event.block.timestamp;
  auctionLot.createdDate = toISO8601String(event.block.timestamp);
  auctionLot.createdTransactionHash = event.transaction.hash;

  // Lot details
  const auctionLotContractRecord = getAuctionLot(event.address, lotId);
  auctionLot.capacityInitial = toDecimal(
    auctionLotContractRecord.getCapacity(),
    auctionLotContractRecord.getBaseTokenDecimals(),
  );
  auctionLot.start = auctionLotContractRecord.getStart();
  auctionLot.conclusion = auctionLotContractRecord.getConclusion();

  // Routing details
  const auctionHouse = getAuctionHouse(event.address);
  const auctionRouting = auctionHouse.lotRouting(lotId);
  auctionLot.auctionType = event.params.auctionRef.toString();
  auctionLot.baseToken = getOrCreateToken(auctionRouting.getBaseToken()).id;
  auctionLot.quoteToken = getOrCreateToken(auctionRouting.getQuoteToken()).id;
  auctionLot.seller = auctionRouting.getSeller();
  auctionLot.derivativeType =
    auctionRouting.getDerivativeReference() == Address.zero()
      ? null
      : auctionRouting.getDerivativeReference().toString();
  auctionLot.wrapDerivative = auctionRouting.getWrapDerivative();

  // Fee details
  const auctionFees = auctionHouse.lotFees(lotId);
  auctionLot.curator = auctionFees.getCurator().equals(Address.zero())
    ? null
    : auctionFees.getCurator();
  auctionLot.curatorApproved = false; // Cannot be approved at this time
  auctionLot.curatorFee = toDecimal(auctionFees.getCuratorFee(), 5);
  auctionLot.protocolFee = toDecimal(auctionFees.getProtocolFee(), 5);
  auctionLot.referrerFee = toDecimal(auctionFees.getReferrerFee(), 5);

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

  // Set initial values for bids
  auctionLot.maxBidId = BigInt.fromI32(0);

  auctionLot.lastUpdatedBlockNumber = event.block.number;
  auctionLot.lastUpdatedBlockTimestamp = event.block.timestamp;
  auctionLot.lastUpdatedDate = toISO8601String(event.block.timestamp);
  auctionLot.lastUpdatedTransactionHash = event.transaction.hash;

  auctionLot.save();

  // If using EncryptedMarginalPrice, save details
  if (auctionLot.auctionType.includes(EMP_KEYCODE)) {
    createEncryptedMarginalPriceLot(auctionLot);
  }

  // If using LinearVesting, save details
  const derivativeTypeNotNull: string =
    auctionLot.derivativeType === null
      ? ""
      : (auctionLot.derivativeType as string);
  if (derivativeTypeNotNull.includes(LV_KEYCODE)) {
    createLinearVestingLot(
      auctionLot,
      event,
      auctionRouting.getDerivativeParams(),
    );
  }

  // Create the event
  const entity = new BatchAuctionCreated(auctionLot.id);
  entity.lot = auctionLot.id;
  entity.infoHash = event.params.infoHash;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  log.info("BatchAuctionCreated event saved with id: {}", [
    entity.id.toString(),
  ]);
}

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new BatchAuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.auctionRef = event.params.auctionRef;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    null,
  );
}

export function handleCurated(event: CuratedEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new BatchAuctionCurated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.curator = event.params.curator;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    null,
  );
}

export function handleSettle(event: SettleEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new BatchAuctionSettled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    null,
  );

  // Iterate over all bids and update their status
  updateBidsStatus(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
  );
  updateBidsAmounts(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
  );
}

export function handleAbort(event: AbortEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new BatchAuctionAborted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    null,
  );

  // Iterate over all bids and update their status
  updateBidsStatus(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
  );
  updateBidsAmounts(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
  );
}

export function handleBid(event: BidEvent): void {
  const lotId = event.params.lotId;
  const bidId = event.params.bidId;

  // Get the encrypted bid
  const lotRecord: BatchAuctionLot = getLotRecord(event.address, lotId);
  const bid = getBid(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotId,
    bidId,
  );

  const entity = new BatchBid(getBidId(lotRecord, bidId));
  entity.lot = lotRecord.id;
  entity.bidId = bidId;
  entity.bidder = event.params.bidder;
  log.info("Adding BatchBid for lot ({}) with bid id: {}", [
    entity.lot,
    entity.bidId.toString(),
  ]);

  entity.amountIn = toDecimal(
    event.params.amount,
    getAuctionLot(event.address, lotId).getQuoteTokenDecimals(),
  );
  entity.rawAmountIn = event.params.amount;

  entity.status = getBidStatus(bid.getStatus());

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    bidId,
  );
}

export function handleRefundBid(event: RefundBidEvent): void {
  const lotId = event.params.lotId;

  const lotRecord: BatchAuctionLot = getLotRecord(event.address, lotId);

  const entity = new BatchBidRefunded(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.bid = getBidId(lotRecord, event.params.bidId);
  entity.bidder = event.params.bidder;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update the bid record
  updateBid(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
    event.params.bidId,
  );

  // Update the auction record
  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    null,
  );
}

export function handleBidClaimed(event: ClaimBidEvent): void {
  const lotId = event.params.lotId;

  const lotRecord: BatchAuctionLot = getLotRecord(event.address, lotId);

  const entity = new BatchBidClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.bid = getBidId(lotRecord, event.params.bidId);
  entity.bidder = event.params.bidder;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update the bid record
  const auctionLot: BatchAuctionLot = getLotRecord(event.address, lotId);
  updateBid(
    event.address,
    Bytes.fromUTF8(auctionLot.auctionType),
    lotRecord,
    event.params.bidId,
  );

  // Update the auction record
  _updateAuctionLot(
    event.address,
    lotId,
    event.block,
    event.transaction.hash,
    null,
  );
}

// Administrative events
export function handleModuleInstalled(event: ModuleInstalledEvent): void {
  const entity = new AuctionHouseModuleInstalled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.auctionHouse = event.address;
  entity.keycode = event.params.keycode;
  entity.version = event.params.version;
  entity.address = event.params.location;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleModuleSunset(event: ModuleSunsetEvent): void {
  const entity = new AuctionHouseModuleSunset(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.auctionHouse = event.address;
  entity.keycode = event.params.keycode;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  const entity = new AuctionHouseOwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.auctionHouse = event.address;
  entity.caller = event.params.user;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
