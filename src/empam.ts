import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BidDecrypted as BidDecryptedEvent } from "../generated/EncryptedMarginalPriceAuctionModule/EncryptedMarginalPriceAuctionModule";
import { Bid, BidDecrypted } from "../generated/schema";
import { getAuctionLot } from "./helpers/auction";
import { getBidId, updateBid, getAuctionModule } from "./helpers/bid";
import { toDecimal } from "./helpers/number";

export function handleBidDecrypted(event: BidDecryptedEvent): void {
  const lotId = event.params.lotId;

  const entity = new BidDecrypted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.lot = event.params.lotId.toString();
  entity.bid = getBidId(lotId, event.params.bidId);

  const auctionLot = getAuctionLot(lotId);
  entity.amountIn = toDecimal(
    event.params.amountIn,
    auctionLot.getQuoteTokenDecimals()
  );
  entity.amountOut = toDecimal(
    event.params.amountOut,
    auctionLot.getBaseTokenDecimals()
  );

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update the bid amount
  const bidEntity = Bid.load(getBidId(lotId, event.params.bidId));
  if (bidEntity) {
    bidEntity.amountOut = entity.amountOut;
    bidEntity.rawAmountOut = event.params.amountOut;
    bidEntity.save();
  }

  // Update the bid status
  updateBid(lotId, event.params.bidId);
}

export function updateBidAmount(lotId: BigInt, bidId: BigInt): void {
  const lot = getAuctionModule(); //TODO: make auction module generic

  const entity = Bid.load(getBidId(lotId, bidId));
  if (!entity) {
    throw new Error("Bid not found: " + getBidId(lotId, bidId));
  }
  const auctionLot = getAuctionLot(lotId);

  const rawMarginalPrice = lot.auctionData(lotId).getMarginalPrice();

  const rawAmountOut = entity.rawAmountOut || BigInt.fromI32(0);

  if (rawAmountOut && rawAmountOut.gt(BigInt.fromI32(0))) {
    const rawSubmittedPrice = entity.rawAmountIn.div(rawAmountOut);
    entity.rawSubmittedPrice = rawSubmittedPrice;
    entity.rawMarginalPrice = rawMarginalPrice;

    if (
      rawSubmittedPrice.ge(rawMarginalPrice) &&
      rawMarginalPrice.gt(BigInt.fromI32(0))
    ) {
      const rawSettledAmountOut = entity.rawAmountIn.div(rawMarginalPrice);
      entity.settledAmountOut = toDecimal(
        rawSettledAmountOut,
        auctionLot.getBaseTokenDecimals()
      );
    }
  }

  entity.save();
}
