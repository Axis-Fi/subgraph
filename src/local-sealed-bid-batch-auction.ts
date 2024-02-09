import { BidDecrypted as BidDecryptedEvent } from "../generated/LocalSealedBidBatchAuction/LocalSealedBidBatchAuction";
import { BidDecrypted } from "../generated/schema";
import { getAuctionLot } from "./helpers/auction";
import { toDecimal } from "./helpers/number";

export function handleBidDecrypted(event: BidDecryptedEvent): void {
  const lotId = event.params.lotId;

  const entity = new BidDecrypted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.lotId = event.params.lotId;
  entity.bidId = event.params.bidId;

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
}
