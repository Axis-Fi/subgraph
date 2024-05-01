import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  BidDecrypted as BidDecryptedEvent,
  EncryptedMarginalPrice,
} from "../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import {
  BatchAuctionLot,
  BatchBid,
  BatchBidDecrypted,
} from "../generated/schema";
import { getAuctionLot } from "./helpers/atomicAuction";
import { getLotRecord } from "./helpers/batchAuction";
import { getBidId, getBidRecord, updateBid } from "./helpers/bid";
import { toDecimal } from "./helpers/number";

export function handleBidDecrypted(event: BidDecryptedEvent): void {
  const lotId = event.params.lotId;

  // Get the module
  const empModule = EncryptedMarginalPrice.bind(event.address);
  const auctionHouseAddress = empModule.PARENT();

  // Get the lot record
  const lotRecord: BatchAuctionLot = getLotRecord(auctionHouseAddress, lotId);

  const entity = new BatchBidDecrypted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = event.params.lotId.toString();
  entity.bid = getBidId(lotRecord, event.params.bidId);

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
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update the bid amount
  const bidEntity = getBidRecord(lotRecord, event.params.bidId);
  bidEntity.amountOut = entity.amountOut;
  bidEntity.rawAmountOut = event.params.amountOut;

  if (event.params.amountOut.gt(BigInt.fromI32(0))) {
    const rawSubmittedPrice = bidEntity.rawAmountIn
      .times(BigInt.fromI32(10).pow(<u8>auctionLot.getQuoteTokenDecimals()))
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
  updateBid(
    auctionHouseAddress,
    Bytes.fromUTF8(lotRecord.auctionType),
    lotRecord,
    event.params.bidId,
  );
}
