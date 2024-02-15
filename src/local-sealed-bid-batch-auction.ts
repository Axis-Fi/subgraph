import { BidDecrypted as BidDecryptedEvent } from "../generated/LocalSealedBidBatchAuction/LocalSealedBidBatchAuction";
import { Bid, BidDecrypted } from "../generated/schema";
import { getAuctionLot } from "./helpers/auction";
import { getBidId, updateBid } from "./helpers/bid";
import { toDecimal } from "./helpers/number";

export function handleBidDecrypted(event: BidDecryptedEvent): void {
  const lotId = event.params.lotId;

  const entity = new BidDecrypted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lot = event.params.lotId.toString();
  entity.bid = getBidId(lotId, event.params.bidId);

  const auctionLot = getAuctionLot(lotId);
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
  const bidEntity = Bid.load(getBidId(lotId, event.params.bidId));
  if (bidEntity) {
    bidEntity.amountOut = entity.amountOut;
    bidEntity.save();
  }

  // Update the bid status
  updateBid(lotId, event.params.bidId);
}
