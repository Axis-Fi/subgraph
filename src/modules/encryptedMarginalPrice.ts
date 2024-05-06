import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  log,
} from "@graphprotocol/graph-ts";

import {
  AuctionCreated,
  BatchAuctionHouse,
} from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
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

export function createEncryptedMarginalPriceLot(
  batchAuctionLot: BatchAuctionLot,
  createdEvent: AuctionCreated,
): void {
  const empLot: BatchEncryptedMarginalPriceLot =
    new BatchEncryptedMarginalPriceLot(
      createdEvent.transaction.hash.concatI32(createdEvent.logIndex.toI32()),
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

export function updateBidAmount(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
  // remainingCapacity: BigDecimal
): BigDecimal {
  const empModule = getEncryptedMarginalPriceModule(
    auctionHouseAddress,
    auctionRef,
  );

  // Get the bid record
  const entity = getBidRecord(lotRecord, bidId);

  // Get marginal price from contract
  const rawMarginalPrice = empModule
    .auctionData(lotRecord.lotId)
    .getMarginalPrice();

  // Get the raw amount out
  const rawAmountOut = entity.rawAmountOut || BigInt.fromI32(0);
  const rawSubmittedPrice = entity.rawSubmittedPrice || BigInt.fromI32(0);

  const settledAmountOut = BigDecimal.fromString("0");
  const ZERO = BigInt.fromI32(0);

  // Ensure the bid has been decrypted and has a valid value
  if (rawAmountOut && rawAmountOut.gt(BigInt.fromI32(0))) {
    // A bid is won if its submitted price is >= than marginalPrice
    if (
      rawSubmittedPrice &&
      rawSubmittedPrice.ge(rawMarginalPrice) &&
      rawSubmittedPrice.gt(ZERO) &&
      rawMarginalPrice.gt(ZERO)
    ) {
      // Calculate the actual amount out
      const rawSettledAmountOut = entity.rawAmountIn.div(rawMarginalPrice);
      // entity.remainingCapacity = remainingCapacity;
      // The lowest winning bid may not be fully filled out
      // So it gets the remaining capacity
      // settledAmountOut = rawSettledAmountOut
      //   .toBigDecimal()
      //   .gt(remainingCapacity)
      //   ? remainingCapacity
      //   : rawSettledAmountOut.toBigDecimal();

      entity.settledAmountOut = rawSettledAmountOut.toBigDecimal();
      entity.status = "won";
    } else {
      entity.status = "lost";
    }
  }

  entity.save();
  // Returns the amount settled to decrease remaining capacity
  return settledAmountOut;
}
