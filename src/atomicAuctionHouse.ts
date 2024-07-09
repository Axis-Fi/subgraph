import {
  Address,
  BigInt,
  Bytes,
  DataSourceContext,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";

import {
  AuctionCancelled as AuctionCancelledEvent,
  AuctionCreated as AuctionCreatedEvent,
  Curated as AuctionCuratedEvent,
  ModuleInstalled as ModuleInstalledEvent,
  ModuleSunset as ModuleSunsetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Purchase as PurchaseEvent,
} from "../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import {
  AtomicAuctionCancelled,
  AtomicAuctionCreated,
  AtomicAuctionCurated,
  AtomicAuctionLot,
  AtomicPurchase,
  AuctionHouseModuleInstalled,
  AuctionHouseModuleSunset,
  AuctionHouseOwnershipTransferred,
} from "../generated/schema";
import { AtomicAuctionInfo } from "../generated/templates";
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
} from "./helpers/atomicAuction";
import { getChain } from "./helpers/chain";
import { toISO8601String } from "./helpers/date";
import { toDecimal } from "./helpers/number";
import { getOrCreateToken } from "./helpers/token";
import {
  createLinearVestingLot,
  LV_KEYCODE,
} from "./modules/atomicLinearVesting";
import { createFixedPriceSaleLot, FPS_KEYCODE } from "./modules/fixedPriceSale";

function _updateAuctionLot(
  auctionHouseAddress: Address,
  lotId: BigInt,
  block: ethereum.Block,
  transactionHash: Bytes,
): void {
  const auctionLot = getAuctionLot(auctionHouseAddress, lotId);

  // Get the auction lot record
  const entity = getLotRecord(auctionHouseAddress, lotId);

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
  entity.lastUpdatedDate = toISO8601String(block.timestamp);
  entity.lastUpdatedTransactionHash = transactionHash;

  const auctionCuration = getAuctionCuration(auctionHouseAddress, lotId);
  entity.curatorApproved = auctionCuration.getCurated();

  entity.save();
}

export function handleAuctionCreated(event: AuctionCreatedEvent): void {
  const lotId = event.params.lotId;

  // Create an AtomicAuctionLot record
  const auctionLot = new AtomicAuctionLot(getLotRecordId(event.address, lotId));
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
  auctionLot.capacityInQuote = auctionLotContractRecord.getCapacityInQuote();
  auctionLot.capacityInitial = toDecimal(
    auctionLotContractRecord.getCapacity(),
    auctionLotContractRecord.getCapacityInQuote()
      ? auctionLotContractRecord.getQuoteTokenDecimals()
      : auctionLotContractRecord.getBaseTokenDecimals(),
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
  auctionLot.curatorApproved = false;
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
  auctionLot.lastUpdatedBlockNumber = event.block.number;
  auctionLot.lastUpdatedBlockTimestamp = event.block.timestamp;
  auctionLot.lastUpdatedDate = toISO8601String(event.block.timestamp);
  auctionLot.lastUpdatedTransactionHash = event.transaction.hash;

  auctionLot.save();

  log.info("AtomicAuctionLot event saved with id: {}", [
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

    AtomicAuctionInfo.createWithContext(
      event.params.infoHash,
      dataSourceContext,
    );
  }

  // If using FixedPriceSale, save details
  if (auctionLot.auctionType.includes(FPS_KEYCODE)) {
    createFixedPriceSaleLot(auctionLot, event);
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
  const entity = new AtomicAuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = auctionLot.id;
  entity.infoHash = event.params.infoHash;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleAuctionCancelled(event: AuctionCancelledEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new AtomicAuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.auctionRef = event.params.auctionRef;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(event.address, lotId, event.block, event.transaction.hash);
}

export function handleCurated(event: AuctionCuratedEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new AtomicAuctionCurated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.curator = event.params.curator;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  _updateAuctionLot(event.address, lotId, event.block, event.transaction.hash);
}

export function handlePurchase(event: PurchaseEvent): void {
  const lotId = event.params.lotId;

  const lotRecord = getLotRecord(event.address, lotId);

  const entity = new AtomicPurchase(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.buyer = event.params.buyer;
  entity.referrer = event.params.referrer;
  const auctionLot = getAuctionLot(event.address, lotId);
  entity.amount = toDecimal(
    event.params.amount,
    auctionLot.getQuoteTokenDecimals(),
  );
  entity.payout = toDecimal(
    event.params.payout,
    auctionLot.getBaseTokenDecimals(),
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  _updateAuctionLot(event.address, lotId, event.block, event.transaction.hash);
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
