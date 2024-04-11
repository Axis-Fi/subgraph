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

    if (event.params.amountOut.gt(BigInt.fromI32(0))) {
      const rawSubmittedPrice = bidEntity.rawAmountIn
        .times(BigInt.fromI32(10).pow(<u8>auctionLot.getQuoteTokenDecimals()))
        .div(event.params.amountOut)
        .plus(BigInt.fromI32(1)); //TODO: CHECK ROUNDUP

      bidEntity.rawSubmittedPrice = rawSubmittedPrice;
      bidEntity.submittedPrice = toDecimal(
        rawSubmittedPrice,
        auctionLot.getQuoteTokenDecimals()
      );
    }

    bidEntity.save();
  }

  // Update the bid status
  updateBid(lotId, event.params.bidId);
}

export function updateBidAmount(
  lotId: BigInt,
  bidId: BigInt
  //remainingCapacity: BigDecimal
): BigDecimal {
  const lot = getAuctionModule(); //TODO: make auction module generic
  const entity = Bid.load(getBidId(lotId, bidId));

  if (!entity) {
    throw new Error("Bid not found: " + getBidId(lotId, bidId));
  }

  //Get marginal price from contract
  const rawMarginalPrice = lot.auctionData(lotId).getMarginalPrice();

  //Get the raw amount out
  const rawAmountOut = entity.rawAmountOut || BigInt.fromI32(0);
  const rawSubmittedPrice = entity.rawSubmittedPrice || BigInt.fromI32(0);

  let settledAmountOut = BigDecimal.fromString("0");
  const ZERO = BigInt.fromI32(0);

  //Ensure the bid has been decrypted and has a valid value
  if (rawAmountOut && rawAmountOut.gt(BigInt.fromI32(0))) {
    //A bid is won if its submitted price is >= than marginalPrice
    if (
      rawSubmittedPrice &&
      rawSubmittedPrice.ge(rawMarginalPrice) &&
      rawSubmittedPrice.gt(ZERO) &&
      rawMarginalPrice.gt(ZERO)
    ) {
      //Calculate the actual amount out
      const rawSettledAmountOut = entity.rawAmountIn.div(rawMarginalPrice);
      //entity.remainingCapacity = remainingCapacity;
      //The lowest winning bid may not be fully filled out
      //So it gets the remaining capacity
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
  //Returns the amount settled to decrease remaining capacity
  return settledAmountOut;
}
