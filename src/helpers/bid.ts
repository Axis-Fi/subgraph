import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import {
  EncryptedMarginalPriceAuctionModule,
  EncryptedMarginalPriceAuctionModule__bidsResult,
  EncryptedMarginalPriceAuctionModule__encryptedBidsResult,
} from "../../generated/EncryptedMarginalPriceAuctionModule/EncryptedMarginalPriceAuctionModule";
import { AuctionLot, Bid } from "../../generated/schema";
import { EMPAM_ADDRESS } from "../constants";
import { updateBidAmount } from "../empam";
import { getAuctionLot } from "./auction";

export function getAuctionModule(): EncryptedMarginalPriceAuctionModule {
  return EncryptedMarginalPriceAuctionModule.bind(
    Address.fromString(EMPAM_ADDRESS)
  );
}

export function getBidId(lotId: BigInt, bidId: BigInt): string {
  return lotId.toString().concat("-").concat(bidId.toString());
}

export function getEncryptedBid(
  lotId: BigInt,
  bidId: BigInt
): EncryptedMarginalPriceAuctionModule__encryptedBidsResult {
  const auctionModule = getAuctionModule();

  return auctionModule.encryptedBids(lotId, bidId);
}

export function getBid(
  lotId: BigInt,
  bidId: BigInt
): EncryptedMarginalPriceAuctionModule__bidsResult {
  const auctionModule = getAuctionModule();
  return auctionModule.bids(lotId, bidId);
}

export function getBidStatus(status: i32): string {
  switch (status) {
    case 0:
      return "submitted";
    case 1:
      return "decrypted";
    case 2:
      return "claimed";
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

  const bid = getBid(lotId, bidId);

  entity.status = getBidStatus(bid.getStatus());

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
    let i = BigInt.fromI32(1);
    i.le(maxBidId);
    i = i.plus(BigInt.fromI32(1))
  ) {
    updateBid(lotId, i);
  }
}

export function updateBidsAmounts(lotId: BigInt): void {
  // Fetch the auction lot
  const entity = AuctionLot.load(lotId.toString());

  if (!entity) {
    throw new Error("Auction lot not found: " + lotId.toString());
  }

  const maxBidId = entity.maxBidId;
  //let capacity = entity.capacityInitial;

  for (
    let i = BigInt.fromI32(1);
    i.lt(maxBidId);
    i = i.plus(BigInt.fromI32(1))
  ) {
    updateBidAmount(lotId, i);
    //capacity = capacity.minus(remaining);
  }
}
