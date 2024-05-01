import {
  Address,
  BigInt,
  Bytes,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";

import { AuctionCancelled as AuctionCancelledEvent, AuctionCreated as AuctionCreatedEvent, Curated as AuctionCuratedEvent, ModuleInstalled as ModuleInstalledEvent, ModuleSunset as ModuleSunsetEvent, OwnershipTransferred as OwnershipTransferredEvent,Purchase as PurchaseEvent } from "../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import { ERC20 } from "../generated/AtomicAuctionHouse/ERC20";
import { AtomicAuctionCancelled, AtomicAuctionCreated, AtomicAuctionCurated, AtomicAuctionHouseOwnershipTransferred, AtomicAuctionLot, AtomicModuleInstalled, AtomicModuleSunset, AtomicPurchase, Token } from "../generated/schema";
import { getAuctionCuration, getAuctionHouse, getAuctionLot } from "./helpers/atomicAuction";
import { toISO8601String } from "./helpers/date";
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
    token.totalSupply = tokenContract.totalSupply();

    token.save();
  }

  return token as Token;
}

function _getLotRecordId(
  auctionHouseAddress: Address,
  lotId: BigInt
): string {
  return dataSource.network() + "-" + auctionHouseAddress.toHexString() + "-" + lotId.toString();
}

function _updateAuctionLot(
  auctionHouseAddress: Address,
  lotId: BigInt,
  block: ethereum.Block,
  transactionHash: Bytes
): void {
  const auctionLot = getAuctionLot(auctionHouseAddress, lotId);

  // Get the auction lot record
  const entity = AtomicAuctionLot.load(_getLotRecordId(
    auctionHouseAddress,
    lotId
  ));

  if (entity == null) {
    throw new Error(
      "Expected auction lot to exist for lotId " + _getLotRecordId(
        auctionHouseAddress,
        lotId
      )
    );
  }

  // Update the auction lot record
  entity.capacity = toDecimal(
    auctionLot.getCapacity(),
    auctionLot.getCapacityInQuote()
      ? auctionLot.getQuoteTokenDecimals()
      : auctionLot.getBaseTokenDecimals()
  );
  entity.sold = toDecimal(
    auctionLot.getSold(),
    auctionLot.getBaseTokenDecimals()
  );
  entity.purchased = toDecimal(
    auctionLot.getPurchased(),
    auctionLot.getQuoteTokenDecimals()
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
  const auctionLot = new AtomicAuctionLot(_getLotRecordId(
    event.address,
    lotId
  ));
  auctionLot.chain = dataSource.network();
  auctionLot.auctionHouse = event.address;
  auctionLot.lotId = lotId;

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
      : auctionLotContractRecord.getBaseTokenDecimals()
  );
  auctionLot.start = auctionLotContractRecord.getStart();
  auctionLot.conclusion = auctionLotContractRecord.getConclusion();

  // Routing details
  const auctionHouse = getAuctionHouse(event.address);
  const auctionRouting = auctionHouse.lotRouting(lotId);
  auctionLot.auctionRef = event.params.auctionRef;
  auctionLot.auctionType = event.params.auctionRef.toString();
  auctionLot.baseToken = _getOrCreateToken(auctionRouting.getBaseToken()).id;
  auctionLot.quoteToken = _getOrCreateToken(auctionRouting.getQuoteToken()).id;
  auctionLot.seller = auctionRouting.getSeller();
  auctionLot.derivativeRef = auctionRouting.getDerivativeReference();
  auctionLot.wrapDerivative = auctionRouting.getWrapDerivative();

  // Fee details
  const auctionFees = auctionHouse.lotFees(lotId);
  auctionLot.curator = auctionFees.getCurator();
  auctionLot.curatorApproved = false;
  auctionLot.curatorFee = toDecimal(
    auctionFees.getCuratorFee(),
    10 ** 5
  );
  auctionLot.protocolFee = toDecimal(
    auctionFees.getProtocolFee(),
    10 ** 5
  );
  auctionLot.referrerFee = toDecimal(
    auctionFees.getReferrerFee(),
    10 ** 5
  );

  // Set initial values
  auctionLot.capacity = auctionLot.capacityInitial;
  auctionLot.sold = toDecimal(
    auctionLotContractRecord.getSold(),
    auctionLotContractRecord.getBaseTokenDecimals()
  );
  auctionLot.purchased = toDecimal(
    auctionLotContractRecord.getPurchased(),
    auctionLotContractRecord.getQuoteTokenDecimals()
  );
  auctionLot.lastUpdatedBlockNumber = event.block.number;
  auctionLot.lastUpdatedBlockTimestamp = event.block.timestamp;
  auctionLot.lastUpdatedDate = toISO8601String(event.block.timestamp);
  auctionLot.lastUpdatedTransactionHash = event.transaction.hash;

  auctionLot.save();

  // Create the event
  const entity = new AtomicAuctionCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
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

  const entity = new AtomicAuctionCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lot = lotId.toString();
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

  const entity = new AtomicAuctionCurated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lot = lotId.toString();
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

  const entity = new AtomicPurchase(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lot = lotId.toString();
  entity.buyer = event.params.buyer;
  entity.referrer = event.params.referrer;
  const auctionLot = getAuctionLot(event.address, lotId);
  entity.amount = toDecimal(
    event.params.amount,
    auctionLot.getQuoteTokenDecimals()
  );
  entity.payout = toDecimal(
    event.params.payout,
    auctionLot.getBaseTokenDecimals()
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
  const entity = new AtomicModuleInstalled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
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
  const entity = new AtomicModuleSunset(
    event.transaction.hash.concatI32(event.logIndex.toI32())
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
  event: OwnershipTransferredEvent
): void {
  const entity = new AtomicAuctionHouseOwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
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
