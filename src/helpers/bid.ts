import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  LocalSealedBidBatchAuction,
  LocalSealedBidBatchAuction__lotEncryptedBidsResult,
} from "../../generated/LocalSealedBidBatchAuction/LocalSealedBidBatchAuction";
import { AuctionLot, Bid } from "../../generated/schema";

const LSBBA_MODULE = "0xcE56d3E3E145b44597B61E99c64cb82FB209Da04";

function getAuctionModule(): LocalSealedBidBatchAuction {
  return LocalSealedBidBatchAuction.bind(Address.fromString(LSBBA_MODULE));
}

export function getBidId(lotId: BigInt, bidId: BigInt): string {
  return lotId.toString().concat("-").concat(bidId.toString());
}

export function getEncryptedBid(
  lotId: BigInt,
  bidId: BigInt,
): LocalSealedBidBatchAuction__lotEncryptedBidsResult {
  const auctionModule = getAuctionModule();

  return auctionModule.lotEncryptedBids(lotId, bidId);
}

export function getBidStatus(status: i32): string {
  switch (status) {
    case 0:
      return "submitted";
    case 1:
      return "decrypted";
    case 2:
      return "won";
    case 3:
      return "refunded";
    default:
      throw new Error("Unknown bid status: " + status.toString());
  }
}

export function updateBid(lotId: BigInt, bidId: BigInt): void {
  // Fetch the existing bid record
  const entity = Bid.load(getBidId(lotId, bidId));
  if (!entity) {
    throw new Error("Bid not found: " + getBidId(lotId, bidId));
  }

  const encryptedBid = getEncryptedBid(lotId, bidId);
  entity.status = getBidStatus(encryptedBid.getStatus());

  entity.save();
}

export function updateBidsStatus(lotId: BigInt): void {
  // Fetch the auction lot
  const entity = AuctionLot.load(lotId.toString());
  if (!entity) {
    throw new Error("Auction lot not found: " + lotId.toString());
  }
  const maxBidId = entity.maxBidId;

  for (
    let i = BigInt.fromI32(0);
    i.lt(maxBidId);
    i = i.plus(BigInt.fromI32(1))
  ) {
    updateBid(lotId, i);
  }
}
