import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { BatchAuctionHouse } from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import { EncryptedMarginalPrice } from "../../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import {
  BatchAuctionLot,
  BatchEncryptedMarginalPriceLot,
} from "../../generated/schema";
import { getAuctionHouse } from "../helpers/batchAuction";
import { getBidRecord } from "../helpers/bid";
import { toDecimal } from "../helpers/number";
import { getOrCreateToken } from "../helpers/token";

export const EMP_KEYCODE = "EMP";

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
      return "Started";
    case 1:
      return "Decrypted";
    case 2:
      return "Settled";
    default:
      throw "Unknown value";
  }
}

function _getEncryptedMarginalPriceLotId(
  batchAuctionLot: BatchAuctionLot,
): string {
  return batchAuctionLot.id;
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
  if (empLot.status == "Settled") {
    // Set the marginal price
    empLot.marginalPrice = toDecimal(
      lotAuctionData.getMarginalPrice(),
      quoteToken.decimals,
    );

    // Detect partial fill
    const partialFillData = encryptedMarginalPrice.getPartialFill(lotId);
    empLot.hasPartialFill = partialFillData.getHasPartialFill();
    if (empLot.hasPartialFill == true) {
      empLot.partialBidId = partialFillData.getPartialFill().bidId;
    }
  }

  empLot.save();
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

  // Get the bid record
  const entity = getBidRecord(lotRecord, bidId);

  // Fetch decimals
  const quoteToken = getOrCreateToken(lotRecord.quoteToken);
  const baseToken = getOrCreateToken(lotRecord.baseToken);

  // Get the bid claim from the contract
  const bidClaim = empModule.getBidClaim(lotRecord.lotId, bidId);

  entity.settledAmountInRefunded = toDecimal(
    bidClaim.refund,
    quoteToken.decimals,
  );
  entity.settledAmountIn = toDecimal(bidClaim.paid, quoteToken.decimals).minus(
    entity.settledAmountInRefunded,
  );
  entity.settledAmountOut = toDecimal(bidClaim.payout, baseToken.decimals);

  // Set the status
  // If there is a payout and a refund, it is a partial fill
  if (bidClaim.refund.gt(BigInt.zero()) && bidClaim.payout.gt(BigInt.zero())) {
    entity.status = "won - partial fill";
  }
  // If there is a payout, it is won
  else if (bidClaim.payout.gt(BigInt.zero())) {
    entity.status = "won";
  }
  // If there is a refund, it is lost
  else {
    entity.status = "lost";
  }

  entity.save();
}
