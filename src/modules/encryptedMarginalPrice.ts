import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import {
  BatchAuctionHouse,
  Bid as BidEvent,
} from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  EncryptedMarginalPrice,
  EncryptedMarginalPrice__bidsResult,
} from "../../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import {
  BatchAuctionLot,
  BatchBid,
  BatchEncryptedMarginalPriceLot,
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

export const EMP_KEYCODE = "EMP";

export const EmpLotStatus_Created = "created";
export const EmpLotStatus_Decrypted = "decrypted";
export const EmpLotStatus_Settled = "settled";
export const EmpLotStatus_Cancelled = "cancelled";
export const EmpLotStatus_Aborted = "aborted";

export const EmpBidStatus_Submitted = "submitted";
export const EmpBidStatus_Decrypted = "decrypted";
export const EmpBidStatus_Claimed = "claimed";

export function getEncryptedMarginalPriceModule(
  auctionHouseAddress: Address,
  moduleRef: Bytes,
): EncryptedMarginalPrice {
  const auctionHouse: BatchAuctionHouse = getAuctionHouse(auctionHouseAddress);

  const moduleAddress = auctionHouse.getModuleForVeecode(moduleRef);

  return EncryptedMarginalPrice.bind(moduleAddress);
}

function _getLotStatus(status: i32): string {
  switch (status) {
    case 0:
      return EmpLotStatus_Created;
    case 1:
      return EmpLotStatus_Decrypted;
    case 2:
      return EmpLotStatus_Settled;
    default:
      throw "Unknown value: " + status.toString();
  }
}

function _getEncryptedMarginalPriceLotId(
  batchAuctionLot: BatchAuctionLot,
): string {
  return batchAuctionLot.id;
}

function _getEncryptedMarginalPriceLot(
  batchAuctionLot: BatchAuctionLot,
): BatchEncryptedMarginalPriceLot {
  const empLotId = _getEncryptedMarginalPriceLotId(batchAuctionLot);
  const empLot = BatchEncryptedMarginalPriceLot.load(empLotId);

  if (empLot == null) {
    throw new Error(
      "Expected EncryptedMarginalPriceLot to exist for record id " +
        batchAuctionLot.id,
    );
  }

  return empLot;
}

export function createEncryptedMarginalPriceLot(
  batchAuctionLot: BatchAuctionLot,
): void {
  const empLot: BatchEncryptedMarginalPriceLot =
    new BatchEncryptedMarginalPriceLot(
      _getEncryptedMarginalPriceLotId(batchAuctionLot),
    );
  empLot.lot = batchAuctionLot.id;
  log.info(
    "createEncryptedMarginalPriceLot: Adding BatchEncryptedMarginalPriceLot for lot: {}",
    [empLot.lot],
  );

  // Get the EncryptedMarginalPrice module
  const encryptedMarginalPrice = getEncryptedMarginalPriceModule(
    Address.fromBytes(batchAuctionLot.auctionHouse),
    Bytes.fromUTF8(batchAuctionLot.auctionType),
  );

  const quoteToken = getOrCreateToken(batchAuctionLot.quoteToken);
  const baseToken = getOrCreateToken(batchAuctionLot.baseToken);
  const lotAuctionData = encryptedMarginalPrice.auctionData(
    batchAuctionLot.lotId,
  );

  empLot.status = _getLotStatus(lotAuctionData.getStatus());
  empLot.settlementSuccessful = false; // Set to true on successful settlement
  // marginalPrice set on settlement
  empLot.minPrice = toDecimal(
    lotAuctionData.getMinPrice(),
    quoteToken.decimals,
  );
  empLot.minFilled = toDecimal(
    lotAuctionData.getMinFilled(),
    baseToken.decimals,
  );
  empLot.minBidSize = toDecimal(
    lotAuctionData.getMinBidSize(),
    quoteToken.decimals,
  );
  empLot.save();

  log.info(
    "createEncryptedMarginalPriceLot: Created EncryptedMarginalPriceLot for lot: {}",
    [empLot.lot],
  );
}

export function setEncryptedMarginalPriceLotStatusCancelled(
  batchAuctionLot: BatchAuctionLot,
): void {
  const empLot = _getEncryptedMarginalPriceLot(batchAuctionLot);
  empLot.status = EmpLotStatus_Cancelled;
  empLot.save();
}

export function setEncryptedMarginalPriceLotStatusAborted(
  batchAuctionLot: BatchAuctionLot,
): void {
  const empLot = _getEncryptedMarginalPriceLot(batchAuctionLot);
  empLot.status = EmpLotStatus_Aborted;
  empLot.save();
}

export function updateEncryptedMarginalPriceLot(
  batchAuctionLot: BatchAuctionLot,
  lotId: BigInt,
): void {
  const empLot = _getEncryptedMarginalPriceLot(batchAuctionLot);

  // Get the EncryptedMarginalPrice module
  const encryptedMarginalPrice = getEncryptedMarginalPriceModule(
    Address.fromBytes(batchAuctionLot.auctionHouse),
    Bytes.fromUTF8(batchAuctionLot.auctionType),
  );

  const quoteToken = getOrCreateToken(batchAuctionLot.quoteToken);
  const lotAuctionData = encryptedMarginalPrice.auctionData(lotId);

  // Don't update the status if the lot is already cancelled or aborted
  if (
    empLot.status != EmpLotStatus_Cancelled &&
    empLot.status != EmpLotStatus_Aborted
  ) {
    empLot.status = _getLotStatus(lotAuctionData.getStatus());
    log.info(
      "updateEncryptedMarginalPriceLot: Updated status for lot {} to {}",
      [lotId.toString(), empLot.status],
    );
  }

  // No need to set the minPrice, minFilled and minBidSize again

  // If settled/cancelled/aborted
  if (
    empLot.status == EmpLotStatus_Settled ||
    empLot.status == EmpLotStatus_Aborted ||
    empLot.status == EmpLotStatus_Cancelled
  ) {
    // Set the marginal price
    empLot.marginalPrice = toDecimal(
      lotAuctionData.getMarginalPrice(),
      quoteToken.decimals,
    );

    // If the marginal price is not 0 or uint256 max, then the lot was settled successfully
    empLot.settlementSuccessful =
      lotAuctionData.getMarginalPrice().gt(BigInt.zero()) &&
      lotAuctionData.getMarginalPrice() <
        BigInt.fromUnsignedBytes(
          Bytes.fromHexString(
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          ),
        );

    // Detect partial fill (only if the lot is settled)
    const partialFillData = encryptedMarginalPrice.getPartialFill(lotId);
    empLot.hasPartialFill = partialFillData.getHasPartialFill();
    if (empLot.hasPartialFill == true) {
      empLot.partialBidId = partialFillData.getPartialFill().bidId;
    }
  }

  empLot.save();

  log.info(
    "updateEncryptedMarginalPriceLot: Updated EncryptedMarginalPriceLot for lot: {}",
    [empLot.lot],
  );
}

export function updateEncryptedMarginalPriceBidAmount(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
): void {
  const empModule = getEncryptedMarginalPriceModule(
    auctionHouseAddress,
    auctionRef,
  );

  // Get the EMP record
  const empRecord = _getEncryptedMarginalPriceLot(lotRecord);

  // Get the bid record
  const entity = getBidRecordNullable(lotRecord, bidId);
  if (!entity) {
    log.debug(
      "updateEncryptedMarginalPriceBidAmount: Skipping non-existent bid id {} on lot {}",
      [bidId.toString(), lotRecord.id],
    );
    return;
  }

  // Fetch decimals
  const quoteToken = getOrCreateToken(lotRecord.quoteToken);
  const baseToken = getOrCreateToken(lotRecord.baseToken);

  // If the lot status is settled, we can check the bid claim
  if (
    empRecord.status == EmpLotStatus_Settled ||
    empRecord.status == EmpLotStatus_Aborted
  ) {
    // Get the bid claim from the contract
    const bidClaim = empModule.getBidClaim(lotRecord.lotId, bidId);

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
    "updateEncryptedMarginalPriceBidAmount: Updated bid amount for lot {} and bid {}",
    [lotRecord.id, bidId.toString()],
  );
}

function _getBid(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotId: BigInt,
  bidId: BigInt,
): EncryptedMarginalPrice__bidsResult {
  const auctionModule = getEncryptedMarginalPriceModule(
    auctionHouseAddress,
    auctionRef,
  );

  return auctionModule.bids(lotId, bidId);
}

export function getEncryptedMarginalPriceBidStatus(status: i32): string {
  switch (status) {
    case 0:
      return EmpBidStatus_Submitted;
    case 1:
      return EmpBidStatus_Decrypted;
    case 2:
      return EmpBidStatus_Claimed;
    default:
      throw new Error("Unknown bid status: " + status.toString());
  }
}

export function updateEncryptedMarginalPriceBidStatus(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
): void {
  // Fetch the existing bid record
  const entity = getBidRecordNullable(lotRecord, bidId);
  if (!entity) {
    log.debug(
      "updateEncryptedMarginalPriceBidStatus: Skipping non-existent bid id {} on lot {}",
      [bidId.toString(), lotRecord.id],
    );
    return;
  }

  const bid = _getBid(auctionHouseAddress, auctionRef, lotRecord.lotId, bidId);

  entity.status = getEncryptedMarginalPriceBidStatus(bid.getStatus());

  entity.save();

  log.info(
    "updateEncryptedMarginalPriceBidStatus: Updated bid status to {} for bid id {}",
    [entity.status, entity.id],
  );
}

export function createEncryptedMarginalPriceBid(
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

  const entity = new BatchBid(bidRecordId);
  entity.lot = lotRecord.id;
  entity.bidId = bidId;
  entity.bidder = event.params.bidder;
  entity.referrer = bid.getReferrer();

  entity.amountIn = toDecimal(
    event.params.amount,
    getAuctionLot(event.address, lotRecord.lotId).getQuoteTokenDecimals(),
  );
  entity.rawAmountIn = event.params.amount;

  entity.status = getEncryptedMarginalPriceBidStatus(bid.getStatus());

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  log.info("BatchBid event saved with id: {}", [entity.id.toString()]);

  return entity;
}
