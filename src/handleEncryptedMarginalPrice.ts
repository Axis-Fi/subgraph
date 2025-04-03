import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import {
  BidDecrypted as BidDecryptedEvent,
  EncryptedMarginalPrice,
  PrivateKeySubmitted as PrivateKeySubmittedEvent,
} from "../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import {
  BatchAuctionLot,
  BatchBidDecrypted,
  BatchEncryptedMarginalPricePrivateKeySubmitted,
} from "../generated/schema";
import { getAuctionLot, getLotRecord } from "./helpers/batchAuction";
import { getBidId, getBidRecord } from "./helpers/bid";
import { toISO8601String } from "./helpers/date";
import { toDecimal } from "./helpers/number";
import {
  updateEncryptedMarginalPriceBidStatus,
  updateEncryptedMarginalPriceLot,
} from "./modules/encryptedMarginalPrice";

export function handleBidDecrypted(event: BidDecryptedEvent): void {
  const lotId = event.params.lotId;
  const bidId = event.params.bidId;

  // Get the module
  const empModule = EncryptedMarginalPrice.bind(event.address);
  const auctionHouseAddress = empModule.PARENT();

  // Get the lot record
  const lotRecord: BatchAuctionLot = getLotRecord(auctionHouseAddress, lotId);

  const bidRecordId = getBidId(lotRecord, event.params.bidId);
  const entity = new BatchBidDecrypted(
    event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .concatI32(lotId.toI32())
      .concatI32(bidId.toI32()),
  );
  entity.lot = lotRecord.id;
  entity.bid = bidRecordId;
  log.info("Adding BatchBidDecrypted record for lot id {} and bid id", [
    lotId.toString(),
    bidId.toString(),
  ]);

  const auctionLot = getAuctionLot(auctionHouseAddress, lotId);
  entity.amountIn = toDecimal(
    event.params.amountIn,
    auctionLot.getQuoteTokenDecimals(),
  );
  entity.amountOut = toDecimal(
    event.params.amountOut,
    auctionLot.getBaseTokenDecimals(),
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update the bid amount
  const bidEntity = getBidRecord(lotRecord, event.params.bidId);
  bidEntity.amountOut = entity.amountOut;
  bidEntity.rawAmountOut = event.params.amountOut;

  if (event.params.amountOut.gt(BigInt.fromI32(0))) {
    const rawSubmittedPrice = bidEntity.rawAmountIn
      .times(BigInt.fromI32(10).pow(<u8>auctionLot.getBaseTokenDecimals()))
      .div(event.params.amountOut)
      .plus(BigInt.fromI32(1)); // TODO: CHECK ROUNDUP

    bidEntity.rawSubmittedPrice = rawSubmittedPrice;
    bidEntity.submittedPrice = toDecimal(
      rawSubmittedPrice,
      auctionLot.getQuoteTokenDecimals(),
    );

    bidEntity.save();
  }

  // Update the bid status
  updateEncryptedMarginalPriceBidStatus(
    auctionHouseAddress,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
    event.params.bidId,
  );
}

export function handlePrivateKeySubmitted(
  event: PrivateKeySubmittedEvent,
): void {
  const lotId = event.params.lotId;

  // No need to handle bid decryption, as a separate event is emitted for that
  // To handle an auction lot without bids, we need to handle the PrivateKeySubmitted event

  // Get the module
  const empModule = EncryptedMarginalPrice.bind(event.address);
  const auctionHouseAddress = empModule.PARENT();

  // Get the auction lot record
  const lotRecord = getLotRecord(auctionHouseAddress, lotId);

  // Create a new record
  const entity = new BatchEncryptedMarginalPricePrivateKeySubmitted(
    event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .concatI32(lotId.toI32()),
  );
  entity.empLot = lotRecord.id; // EMP lot record id is same
  entity.module = event.address;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;
  entity.save();

  log.info(
    "Adding BatchEncryptedMarginalPricePrivateKeySubmitted record with id: {}",
    [lotRecord.id],
  );

  // Update the EMP lot record
  updateEncryptedMarginalPriceLot(lotRecord, lotId);
}
