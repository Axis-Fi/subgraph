import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import { BatchAuctionLot, BatchBid } from "../../generated/schema";
import {
  EMP_KEYCODE,
  updateEncryptedMarginalPriceBidAmount,
  updateEncryptedMarginalPriceBidStatus,
} from "../modules/encryptedMarginalPrice";
import {
  FPB_KEYCODE,
  updateFixedPriceBatchBidAmount,
  updateFixedPriceBatchBidStatus,
} from "../modules/fixedPriceBatch";

export const BidOutcome_Won = "won";
export const BidOutcome_WonPartialFill = "won - partial fill";
export const BidOutcome_Lost = "lost";

export function getBidId(lot: BatchAuctionLot, bidId: BigInt): string {
  return lot.id.concat("-").concat(bidId.toString());
}

export function getBidRecordNullable(
  lot: BatchAuctionLot,
  bidId: BigInt,
): BatchBid | null {
  const bidRecordId = getBidId(lot, bidId);
  const entity = BatchBid.load(bidRecordId);

  return entity;
}

export function getBidRecord(lot: BatchAuctionLot, bidId: BigInt): BatchBid {
  const entity = getBidRecordNullable(lot, bidId);

  if (!entity) {
    const bidRecordId = getBidId(lot, bidId);
    throw new Error("Bid not found: " + bidRecordId);
  }

  return entity as BatchBid;
}

export function updateBidStatus(
  auctionHouseAddress: Address,
  auctionRef: Bytes,
  lotRecord: BatchAuctionLot,
  bidId: BigInt,
): void {
  if (lotRecord.auctionType.includes(EMP_KEYCODE)) {
    updateEncryptedMarginalPriceBidStatus(
      auctionHouseAddress,
      auctionRef,
      lotRecord,
      bidId,
    );
  } else if (lotRecord.auctionType.includes(FPB_KEYCODE)) {
    updateFixedPriceBatchBidStatus(
      auctionHouseAddress,
      auctionRef,
      lotRecord,
      bidId,
    );
  } else {
    throw new Error("Unsupported auction type: " + lotRecord.auctionType);
  }
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
    updateBidStatus(auctionHouseAddress, auctionRef, lotRecord, i);
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
    i.le(maxBidId);
    i = i.plus(BigInt.fromI32(1))
  ) {
    if (lotRecord.auctionType.includes(EMP_KEYCODE)) {
      updateEncryptedMarginalPriceBidAmount(
        auctionHouseAddress,
        auctionRef,
        lotRecord,
        i,
      );
    } else if (lotRecord.auctionType.includes(FPB_KEYCODE)) {
      updateFixedPriceBatchBidAmount(
        auctionHouseAddress,
        auctionRef,
        lotRecord,
        i,
      );
    } else {
      throw new Error("Unsupported auction type: " + lotRecord.auctionType);
    }
  }
}
