import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import {
  BatchAuctionHouse,
  Bid as BidEvent,
} from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  FixedPriceBatch,
  FixedPriceBatch__getBidResultBidStruct,
} from "../../generated/BatchAuctionHouse/FixedPriceBatch";
import {
  BatchAuctionLot,
  BatchBid,
  BatchFixedPriceLot,
} from "../../generated/schema";
import { getAuctionHouse, getAuctionLot } from "../helpers/batchAuction";
import {
  BidOutcome_Lost,
  BidOutcome_Won,
  BidOutcome_WonPartialFill,
  getBidId,
  getBidRecordNullable,
} from "../helpers/bid";
import { toISO8601String } from "../helpers/date";
import { toDecimal } from "../helpers/number";
import { getOrCreateToken } from "../helpers/token";

export const FPB_KEYCODE = "FPB";

export const FpbLotStatus_Created = "created";
export const FpbLotStatus_Settled = "settled";
export const FpbLotStatus_Cancelled = "cancelled";
export const FpbLotStatus_Aborted = "aborted";

export const FpbBidStatus_Submitted = "submitted";
export const FpbBidStatus_Claimed = "claimed";

export function getFixedPriceBatchModule(
  auctionHouseAddress: Address,
  moduleRef: Bytes,
): FixedPriceBatch {
  const auctionHouse: BatchAuctionHouse = getAuctionHouse(auctionHouseAddress);

  const moduleAddress = auctionHouse.getModuleForVeecode(moduleRef);

  return FixedPriceBatch.bind(moduleAddress);
}

function _getFixedPriceBatchLotId(batchAuctionLot: BatchAuctionLot): string {
  return batchAuctionLot.id;
}

function _getFixedPriceBatchLot(
  batchAuctionLot: BatchAuctionLot,
): BatchFixedPriceLot {
  const lotId = _getFixedPriceBatchLotId(batchAuctionLot);
  const lot = BatchFixedPriceLot.load(lotId);

  if (lot == null) {
    throw new Error(
      "Expected BatchFixedPriceLot to exist for record id " +
        batchAuctionLot.id,
    );
  }

  return lot;
}

function _getLotStatus(status: i32): string {
  switch (status) {
    case 0:
      return FpbLotStatus_Created;
    case 1:
      return FpbLotStatus_Settled;
    default:
      throw "Unknown value: " + status.toString();
  }
}

export function createFixedPriceBatchLot(
  batchAuctionLot: BatchAuctionLot,
): void {
  const fpbLot: BatchFixedPriceLot = new BatchFixedPriceLot(
    _getFixedPriceBatchLotId(batchAuctionLot),
  );
  fpbLot.lot = batchAuctionLot.id;
  log.info("createFixedPriceBatchLot: Adding BatchFixedPriceLot for lot: {}", [
    fpbLot.lot,
  ]);

  // Get the FixedPriceBatch module
  const fpbModule = getFixedPriceBatchModule(
    Address.fromBytes(batchAuctionLot.auctionHouse),
    Bytes.fromUTF8(batchAuctionLot.auctionType),
  );

  const quoteToken = getOrCreateToken(batchAuctionLot.quoteToken);
  const baseToken = getOrCreateToken(batchAuctionLot.baseToken);
  const lotAuctionData = fpbModule.getAuctionData(batchAuctionLot.lotId);

  fpbLot.module = fpbModule._address;
  fpbLot.status = _getLotStatus(lotAuctionData.status);
  fpbLot.settlementSuccessful = false; // Set to true on successful settlement
  fpbLot.price = toDecimal(lotAuctionData.price, quoteToken.decimals);
  fpbLot.minFilled = toDecimal(lotAuctionData.minFilled, baseToken.decimals);
  fpbLot.save();

  log.info("createFixedPriceBatchLot: Created BatchFixedPriceLot for lot: {}", [
    fpbLot.lot,
  ]);
}

export function setFixedPriceBatchLotStatusCancelled(
  batchAuctionLot: BatchAuctionLot,
): void {
  const fpbLot = _getFixedPriceBatchLot(batchAuctionLot);
  fpbLot.status = FpbLotStatus_Cancelled;
  fpbLot.save();
}

export function setFixedPriceBatchLotStatusAborted(
  batchAuctionLot: BatchAuctionLot,
): void {
  const fpbLot = _getFixedPriceBatchLot(batchAuctionLot);
  fpbLot.status = FpbLotStatus_Aborted;
  fpbLot.save();
}

export function updateFixedPriceBatchLot(
  batchAuctionLot: BatchAuctionLot,
  lotId: BigInt,
): void {
  const fpbLot = _getFixedPriceBatchLot(batchAuctionLot);

  // Get the auction module
  const auctionModule = getFixedPriceBatchModule(
    Address.fromBytes(batchAuctionLot.auctionHouse),
    Bytes.fromUTF8(batchAuctionLot.auctionType),
  );

  const lotAuctionData = auctionModule.getAuctionData(lotId);

  // Don't change the status if already cancelled or aborted
  if (
    fpbLot.status != FpbLotStatus_Cancelled &&
    fpbLot.status != FpbLotStatus_Aborted
  ) {
    fpbLot.status = _getLotStatus(lotAuctionData.status);
    log.info("updateFixedPriceBatchLot: Updated status for lot {} to {}", [
      lotId.toString(),
      fpbLot.status,
    ]);
  }

  // If settled/cancelled/aborted
  if (
    fpbLot.status == FpbLotStatus_Settled ||
    fpbLot.status == FpbLotStatus_Cancelled ||
    fpbLot.status == FpbLotStatus_Aborted
  ) {
    // If the sold amount is at least the minimum filled amount, it is successful
    if (batchAuctionLot.sold >= fpbLot.minFilled) {
      fpbLot.settlementSuccessful = true;
    }

    // Detect partial fill (only if the lot is settled)
    const partialFillData = auctionModule.getPartialFill(lotId);
    fpbLot.hasPartialFill = partialFillData.getHasPartialFill();
    if (fpbLot.hasPartialFill == true) {
      fpbLot.partialBidId = partialFillData.getPartialFill().bidId;
    }
  }

  fpbLot.save();

  log.info("updateFixedPriceBatchLot: Updated BatchFixedPriceLot for lot: {}", [
    fpbLot.lot,
  ]);
}

function _getBid(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotId: BigInt,
  bidId: BigInt,
): FixedPriceBatch__getBidResultBidStruct {
  const auctionModule = getFixedPriceBatchModule(
    auctionHouseAddress,
    auctionRef,
  );

  return auctionModule.getBid(lotId, bidId);
}

export function updateFixedPriceBatchBidAmount(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
): void {
  const fpbModule = getFixedPriceBatchModule(auctionHouseAddress, auctionRef);

  // Get the FPB record
  const fpbRecord: BatchFixedPriceLot = _getFixedPriceBatchLot(lotRecord);

  // Get the bid record
  const entity = getBidRecordNullable(lotRecord, bidId);
  if (!entity) {
    log.debug(
      "updateFixedPriceBatchBidAmount: Skipping non-existent bid id {} on lot {}",
      [bidId.toString(), lotRecord.id],
    );
    return;
  }

  // Fetch decimals
  const quoteToken = getOrCreateToken(lotRecord.quoteToken);
  const baseToken = getOrCreateToken(lotRecord.baseToken);

  // If the lot status is settled, we can check the bid claim
  if (
    fpbRecord.status == FpbLotStatus_Settled ||
    fpbRecord.status == FpbLotStatus_Aborted
  ) {
    // Get the bid claim from the contract
    const bidClaim = fpbModule.getBidClaim(lotRecord.lotId, bidId);

    const settledAmountInRefunded = toDecimal(
      bidClaim.refund,
      quoteToken.decimals,
    );
    entity.settledAmountInRefunded = settledAmountInRefunded;
    entity.settledAmountIn = toDecimal(
      bidClaim.paid,
      quoteToken.decimals,
    ).minus(settledAmountInRefunded);
    entity.settledAmountOut = toDecimal(bidClaim.payout, baseToken.decimals);

    // Set the status
    // If there is a payout and a refund, it is a partial fill
    if (
      bidClaim.refund.gt(BigInt.zero()) &&
      bidClaim.payout.gt(BigInt.zero())
    ) {
      entity.outcome = BidOutcome_WonPartialFill;
    }
    // If there is a payout, it is won
    else if (bidClaim.payout.gt(BigInt.zero())) {
      entity.outcome = BidOutcome_Won;
    }
    // If there is a refund, it is lost
    else {
      entity.outcome = BidOutcome_Lost;
    }
  }

  entity.save();

  log.info(
    "updateFixedPriceBatchBidAmount: Updated bid amount for lot {} and bid {}",
    [lotRecord.id, bidId.toString()],
  );
}

export function getFixedPriceBatchBidStatus(status: i32): string {
  switch (status) {
    case 0:
      return FpbBidStatus_Submitted;
    case 1:
      return FpbBidStatus_Claimed;
    default:
      throw new Error("Unknown bid status: " + status.toString());
  }
}

export function updateFixedPriceBatchBidStatus(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
): void {
  // Fetch the existing bid record
  const entity = getBidRecordNullable(lotRecord, bidId);
  if (!entity) {
    log.debug(
      "updateFixedPriceBatchBidStatus: Skipping non-existent bid id {} on lot {}",
      [bidId.toString(), lotRecord.id],
    );
    return;
  }

  const bid = _getBid(auctionHouseAddress, auctionRef, lotRecord.lotId, bidId);

  entity.status = getFixedPriceBatchBidStatus(bid.status);

  entity.save();

  log.info(
    "updateFixedPriceBatchBidStatus: Updated bid status to {} for bid id {}",
    [entity.status, entity.id],
  );
}

export function createFixedPriceBatchBid(
  lotRecord: BatchAuctionLot,
  event: BidEvent,
  bidId: BigInt,
): BatchBid {
  const bidRecordId = getBidId(lotRecord, bidId);

  // Get the bid record
  const bid = _getBid(
    Address.fromBytes(lotRecord.auctionHouse),
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord.lotId,
    bidId,
  );

  const fpbModule = getFixedPriceBatchModule(
    Address.fromBytes(lotRecord.auctionHouse),
    Bytes.fromUTF8(lotRecord.auctionType),
  );
  const auctionLot = getAuctionLot(
    Address.fromBytes(lotRecord.auctionHouse),
    lotRecord.lotId,
  );
  const lotAuctionData = fpbModule.getAuctionData(lotRecord.lotId);

  const entity = new BatchBid(bidRecordId);
  entity.lot = lotRecord.id;
  entity.bidId = bidId;
  entity.bidder = event.params.bidder;
  entity.referrer = bid.referrer;

  entity.amountIn = toDecimal(
    event.params.amount,
    auctionLot.getQuoteTokenDecimals(),
  );
  entity.rawAmountIn = event.params.amount;

  // Set amount out (since the price is known)
  const amountOut = event.params.amount
    .times(BigInt.fromI32(10).pow(<u8>auctionLot.getBaseTokenDecimals()))
    .div(lotAuctionData.price); // amount in * 10^quote token decimals / price
  entity.rawAmountOut = amountOut;
  entity.amountOut = toDecimal(amountOut, auctionLot.getBaseTokenDecimals());

  // Set submitted price (since the price is known)
  entity.rawSubmittedPrice = lotAuctionData.price;
  entity.submittedPrice = toDecimal(
    lotAuctionData.price,
    auctionLot.getQuoteTokenDecimals(),
  );

  entity.status = getFixedPriceBatchBidStatus(bid.status);

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  log.info("createFixedPriceBatchBid: BatchBid event saved with id: {}", [
    entity.id.toString(),
  ]);

  return entity;
}
