import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  DataSourceContext,
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
  BatchBidClaimed,
  BatchBidCreated,
  BatchBidRefunded,
} from "../generated/schema";
import { BatchAuctionInfo } from "../generated/templates";
import {
  KEY_AUCTION_LOT_ID,
  KEY_LOG_INDEX,
  KEY_TRANSACTION_HASH,
} from "./constants";
import {
  getAuctionCuration,
  getAuctionHouse,
  getAuctionLot,
  getLotRecord,
  getLotRecordId,
} from "./helpers/batchAuction";
import {
  getBidId,
  updateBidsAmounts,
  updateBidsStatus,
  updateBidStatus,
} from "./helpers/bid";
import { getChain } from "./helpers/chain";
import { toISO8601String } from "./helpers/date";
import { toDecimal } from "./helpers/number";
import { getOrCreateToken } from "./helpers/token";
import {
  createLinearVestingLot,
  hasLinearVestingLot,
  LV_KEYCODE,
} from "./modules/batchLinearVesting";
import {
  createEncryptedMarginalPriceBid,
  createEncryptedMarginalPriceLot,
  EMP_KEYCODE,
  setEncryptedMarginalPriceLotStatusAborted,
  setEncryptedMarginalPriceLotStatusCancelled,
  updateEncryptedMarginalPriceLot,
} from "./modules/encryptedMarginalPrice";
import {
  createFixedPriceBatchBid,
  createFixedPriceBatchLot,
  FPB_KEYCODE,
  setFixedPriceBatchLotStatusAborted,
  setFixedPriceBatchLotStatusCancelled,
  updateFixedPriceBatchLot,
} from "./modules/fixedPriceBatch";

function _setAuctionStatusCancelled(
  auctionHouseAddress: Address,
  lotId: BigInt,
): void {
  // Get the auction lot record
  const entity = getLotRecord(auctionHouseAddress, lotId);

  if (entity.auctionType.includes(EMP_KEYCODE)) {
    setEncryptedMarginalPriceLotStatusCancelled(entity);
  } else if (entity.auctionType.includes(FPB_KEYCODE)) {
    setFixedPriceBatchLotStatusCancelled(entity);
  }

  log.info("Auction lot status set to cancelled for lotId: {}", [
    lotId.toString(),
  ]);
}

function _setAuctionStatusAborted(
  auctionHouseAddress: Address,
  lotId: BigInt,
): void {
  // Get the auction lot record
  const entity = getLotRecord(auctionHouseAddress, lotId);

  if (entity.auctionType.includes(EMP_KEYCODE)) {
    setEncryptedMarginalPriceLotStatusAborted(entity);
  } else if (entity.auctionType.includes(FPB_KEYCODE)) {
    setFixedPriceBatchLotStatusAborted(entity);
  }

  log.info("Auction lot status set to aborted for lotId: {}", [
    lotId.toString(),
  ]);
}

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

  // Update the conclusion time (as it is amended when cancelling)
  entity.conclusion = auctionLot.getConclusion();

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
  // If using FixedPriceBatch, update details
  else if (entity.auctionType.includes(FPB_KEYCODE)) {
    updateFixedPriceBatchLot(entity, lotId);
  } else {
    throw new Error("Unsupported auction type: " + entity.auctionType);
  }

  entity.save();
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const lotId = event.params.lotId;

  // Create a BatchAuctionLot record
  const recordId = getLotRecordId(event.address, lotId);

  const auctionLot = new BatchAuctionLot(recordId);
  auctionLot.chain = getChain();
  auctionLot.auctionHouse = event.address;
  auctionLot.lotId = lotId;
  auctionLot.infoHash = event.params.infoHash;

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
  auctionLot.callbacks = auctionRouting.getCallbacks();

  // Fee details
  const auctionFees = auctionHouse.lotFees(lotId);
  auctionLot.curator = auctionFees.getCurator().equals(Address.zero())
    ? null
    : auctionFees.getCurator();
  auctionLot.curatorApproved = false; // Cannot be approved at this time
  auctionLot.curatorFee =
    auctionFees.getCurator() == Address.zero()
      ? BigDecimal.zero()
      : toDecimal(auctionFees.getCuratorFee(), 5);
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

  log.info("BatchAuctionLot event saved with id: {}", [
    auctionLot.id.toString(),
  ]);

  // Load IPFS data if the hash is set
  if (event.params.infoHash != "") {
    const dataSourceContext = new DataSourceContext();
    dataSourceContext.setString(KEY_AUCTION_LOT_ID, auctionLot.id.toString());
    dataSourceContext.setString(
      KEY_TRANSACTION_HASH,
      event.transaction.hash.toString(),
    );
    dataSourceContext.setString(KEY_LOG_INDEX, event.logIndex.toString());

    BatchAuctionInfo.createWithContext(
      event.params.infoHash,
      dataSourceContext,
    );
  }

  // If using EncryptedMarginalPrice, save details
  if (auctionLot.auctionType.includes(EMP_KEYCODE)) {
    createEncryptedMarginalPriceLot(auctionLot);
  }
  // If using FixedPriceBatch, save details
  else if (auctionLot.auctionType.includes(FPB_KEYCODE)) {
    createFixedPriceBatchLot(auctionLot);
  } else {
    throw new Error("Unsupported auction type: " + auctionLot.auctionType);
  }

  // If using LinearVesting, save details
  const derivativeTypeNotNull: string =
    auctionLot.derivativeType === null
      ? ""
      : (auctionLot.derivativeType as string);
  if (derivativeTypeNotNull.includes(LV_KEYCODE)) {
    const moduleAddress = auctionHouse.getModuleForVeecode(
      Bytes.fromUTF8(derivativeTypeNotNull),
    );

    // In production, it is highly unlikely that there would be a BatchLinearVestingLot already created with the same tokenId, but we protect against that.
    if (
      hasLinearVestingLot(
        auctionLot,
        moduleAddress,
        auctionRouting.getDerivativeParams(),
      )
    ) {
      log.warning("BatchLinearVestingLot already exists for lot: {}", [
        auctionLot.id.toString(),
      ]);
    } else {
      createLinearVestingLot(
        auctionLot,
        moduleAddress,
        auctionRouting.getDerivativeParams(),
      );
    }
  }

  // Create the event
  const entity = new BatchAuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = auctionLot.id;
  entity.infoHash = event.params.infoHash;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  log.info("BatchAuctionCreated record saved for lot id: {}", [
    auctionLot.lotId.toString(),
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

  log.info("BatchAuctionCancelled record saved for lot id: {}", [
    lotRecord.lotId.toString(),
  ]);

  _setAuctionStatusCancelled(event.address, lotId);

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

  log.info("BatchAuctionCurated record saved for lot id: {}", [
    lotRecord.id.toString(),
  ]);

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

  log.info("BatchAuctionSettled record saved for lot id: {}", [
    lotRecord.id.toString(),
  ]);

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

  log.info("BatchAuctionAborted record saved for lot id: {}", [
    lotRecord.id.toString(),
  ]);

  _setAuctionStatusAborted(event.address, lotId);

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

  // Get the auction lot
  const lotRecord: BatchAuctionLot = getLotRecord(event.address, lotId);

  // Create the BatchBid record based on the auction type
  if (lotRecord.auctionType.includes(EMP_KEYCODE)) {
    createEncryptedMarginalPriceBid(lotRecord, event, bidId);
  } else if (lotRecord.auctionType.includes(FPB_KEYCODE)) {
    createFixedPriceBatchBid(lotRecord, event, bidId);
  } else {
    throw new Error("Unsupported auction type: " + lotRecord.auctionType);
  }

  // Record the bid event
  const entity = new BatchBidCreated(
    event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .concatI32(lotId.toI32())
      .concatI32(bidId.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.bid = getBidId(lotRecord, bidId);
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  log.info("BatchBidCreated record saved for lot id {} and bid id {}", [
    lotId.toString(),
    bidId.toString(),
  ]);

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
  const bidId = event.params.bidId;

  const lotRecord: BatchAuctionLot = getLotRecord(event.address, lotId);
  const bidRecordId = getBidId(lotRecord, bidId);

  const entity = new BatchBidRefunded(
    event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .concatI32(lotId.toI32())
      .concatI32(bidId.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.bid = bidRecordId;
  entity.bidder = event.params.bidder;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  log.info("BatchBidRefunded record saved for lot id {} and bid id {}", [
    lotId.toString(),
    bidId.toString(),
  ]);

  // Update the bid record
  updateBidStatus(
    event.address,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
    bidId,
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
  const bidId = event.params.bidId;

  const lotRecord: BatchAuctionLot = getLotRecord(event.address, lotId);
  const bidRecordId = getBidId(lotRecord, bidId);

  const entity = new BatchBidClaimed(
    event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .concatI32(lotId.toI32())
      .concatI32(bidId.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.bid = bidRecordId;
  entity.bidder = event.params.bidder;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  log.info("BatchBidClaimed record saved for lot id {} and bid id", [
    lotId.toString(),
    bidId.toString(),
  ]);

  const auctionLot: BatchAuctionLot = getLotRecord(event.address, lotId);

  // Update the bid record
  updateBidStatus(
    event.address,
    Bytes.fromUTF8(auctionLot.auctionType),
    auctionLot,
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
