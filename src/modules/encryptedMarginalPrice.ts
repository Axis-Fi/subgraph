import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { BatchAuctionHouse } from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import { EncryptedMarginalPrice } from "../../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import {
  BatchAuctionLot,
  BatchEncryptedMarginalPriceLot,
} from "../../generated/schema";
import { getAuctionHouse } from "../helpers/batchAuction";
import {
  BidOutcome_Lost,
  BidOutcome_Won,
  BidOutcome_WonPartialFill,
  getBidRecordNullable,
} from "../helpers/bid";
import { toDecimal } from "../helpers/number";
import { getOrCreateToken } from "../helpers/token";

export const EMP_KEYCODE = "EMP";

export const EmpLotStatus_Created = "Created";
export const EmpLotStatus_Decrypted = "Decrypted";
export const EmpLotStatus_Settled = "Settled";

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
  log.info("Adding BatchEncryptedMarginalPriceLot for lot: {}", [empLot.lot]);

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

  log.info("Created EncryptedMarginalPriceLot for lot: {}", [empLot.lot]);
}

export function updateEncryptedMarginalPriceLot(
  batchAuctionLot: BatchAuctionLot,
  lotId: BigInt,
): void {
  const empLot = BatchEncryptedMarginalPriceLot.load(
    _getEncryptedMarginalPriceLotId(batchAuctionLot),
  );

  // Check if null
  if (empLot == null) {
    throw new Error(
      "Expected EncryptedMarginalPriceLot to exist for record id " +
        batchAuctionLot.id,
    );
  }

  // Get the EncryptedMarginalPrice module
  const encryptedMarginalPrice = getEncryptedMarginalPriceModule(
    Address.fromBytes(batchAuctionLot.auctionHouse),
    Bytes.fromUTF8(batchAuctionLot.auctionType),
  );

  const quoteToken = getOrCreateToken(batchAuctionLot.quoteToken);
  const lotAuctionData = encryptedMarginalPrice.auctionData(lotId);

  empLot.status = _getLotStatus(lotAuctionData.getStatus());

  // No need to set the minPrice, minFilled and minBidSize again

  // If settled
  if (empLot.status == EmpLotStatus_Settled) {
    // Set the marginal price
    empLot.marginalPrice = toDecimal(
      lotAuctionData.getMarginalPrice(),
      quoteToken.decimals,
    );

    // Detect partial fill (only if the lot is settled)
    const partialFillData = encryptedMarginalPrice.getPartialFill(lotId);
    empLot.hasPartialFill = partialFillData.getHasPartialFill();
    if (empLot.hasPartialFill == true) {
      empLot.partialBidId = partialFillData.getPartialFill().bidId;
    }
  }

  empLot.save();

  log.info("Updated EncryptedMarginalPriceLot for lot: {}", [empLot.lot]);
}

export function updateBidAmount(
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
    log.debug("updateBidAmount: Skipping non-existent bid id {} on lot {}", [
      bidId.toString(),
      lotRecord.id,
    ]);
    return;
  }

  // Fetch decimals
  const quoteToken = getOrCreateToken(lotRecord.quoteToken);
  const baseToken = getOrCreateToken(lotRecord.baseToken);

  // If the lot status is settled, we can check the bid claim
  if (empRecord.status == EmpLotStatus_Settled) {
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

  log.info("Updated bid amount for lot {} and bid {}", [
    lotRecord.id,
    bidId.toString(),
  ]);
}
