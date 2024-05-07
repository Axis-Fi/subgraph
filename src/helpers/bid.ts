import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  EncryptedMarginalPrice__bidsResult,
  EncryptedMarginalPrice__encryptedBidsResult,
} from "../../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import { BatchAuctionLot, BatchBid } from "../../generated/schema";
import {
  getEncryptedMarginalPriceModule,
  updateBidAmount,
} from "../modules/encryptedMarginalPrice";

export function getBidId(lot: BatchAuctionLot, bidId: BigInt): string {
  return lot.id.concat("-").concat(bidId.toString());
}

export function getBidRecord(lot: BatchAuctionLot, bidId: BigInt): BatchBid {
  const bidRecordId = getBidId(lot, bidId);
  const entity = BatchBid.load(bidRecordId);

  if (!entity) {
    throw new Error("Bid not found: " + bidRecordId);
  }

  return entity as BatchBid;
}

export function getEncryptedBid(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotId: BigInt,
  bidId: BigInt,
): EncryptedMarginalPrice__encryptedBidsResult {
  const auctionModule = getEncryptedMarginalPriceModule(
    auctionHouseAddress,
    auctionRef,
  );

  return auctionModule.encryptedBids(lotId, bidId);
}

export function getBid(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotId: BigInt,
  bidId: BigInt,
): EncryptedMarginalPrice__bidsResult {
  const auctionModule = getEncryptedMarginalPriceModule(
    auctionHouseAddress,
    auctionRef,
  );

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

export function updateBid(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
): void {
  // Fetch the existing bid record
  const entity = getBidRecord(lotRecord, bidId);

  const bid = getBid(auctionHouseAddress, auctionRef, lotRecord.lotId, bidId);

  entity.status = getBidStatus(bid.getStatus());

  entity.save();
}

export function updateBidsStatus(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
): void {
  // Fetch the auction lot
  const maxBidId = lotRecord.maxBidId;

  for (
    let i = BigInt.fromI32(1);
    i.le(maxBidId);
    i = i.plus(BigInt.fromI32(1))
  ) {
    updateBid(auctionHouseAddress, auctionRef, lotRecord, i);
  }
}

export function updateBidsAmounts(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
): void {
  const maxBidId = lotRecord.maxBidId;

  for (
    let i = BigInt.fromI32(1);
    i.lt(maxBidId);
    i = i.plus(BigInt.fromI32(1))
  ) {
    updateBidAmount(auctionHouseAddress, auctionRef, lotRecord, i);
  }
}
