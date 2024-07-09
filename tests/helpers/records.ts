import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  BatchAuctionLot,
  BatchAuctionSettled,
  BatchBid,
  BatchBidClaimed,
  BatchEncryptedMarginalPriceLot,
  BatchEncryptedMarginalPricePrivateKeySubmitted,
  BatchFixedPriceLot,
  BatchLinearVestingLot,
  BatchLinearVestingRedeemed,
} from "../../generated/schema";
import { defaultLogIndex, defaultTransactionHash } from "../mocks/event";

export function getBatchAuctionSettled(recordId: Bytes): BatchAuctionSettled {
  const record = BatchAuctionSettled.load(recordId);

  if (record == null) {
    throw new Error("BatchAuctionSettled not found: " + recordId.toHexString());
  }

  return record as BatchAuctionSettled;
}

export function getBatchAuctionLot(recordId: string): BatchAuctionLot {
  const record = BatchAuctionLot.load(recordId);

  if (record == null) {
    throw new Error("BatchAuctionLot not found: " + recordId);
  }

  return record as BatchAuctionLot;
}

export function getBatchEncryptedMarginalPriceLot(
  recordId: string,
): BatchEncryptedMarginalPriceLot {
  const record = BatchEncryptedMarginalPriceLot.load(recordId);

  if (record == null) {
    throw new Error("BatchEncryptedMarginalPriceLot not found: " + recordId);
  }

  return record as BatchEncryptedMarginalPriceLot;
}

export function getBatchEncryptedMarginalPricePrivateKeySubmitted(
  recordId: Bytes,
): BatchEncryptedMarginalPricePrivateKeySubmitted {
  const record = BatchEncryptedMarginalPricePrivateKeySubmitted.load(recordId);

  if (record == null) {
    throw new Error(
      "BatchEncryptedMarginalPricePrivateKeySubmitted not found: " +
        recordId.toHexString(),
    );
  }

  return record as BatchEncryptedMarginalPricePrivateKeySubmitted;
}

export function getBatchFixedPriceLot(recordId: string): BatchFixedPriceLot {
  const record = BatchFixedPriceLot.load(recordId);

  if (record == null) {
    throw new Error("BatchFixedPriceLot not found: " + recordId);
  }

  return record as BatchFixedPriceLot;
}

export function getBatchBid(lotId: string, bidId: BigInt): BatchBid {
  const recordId = lotId.concat("-").concat(bidId.toString());
  const record = BatchBid.load(recordId);

  if (record == null) {
    throw new Error("BatchBid not found: " + recordId);
  }

  return record as BatchBid;
}

export function getBatchBidClaimed(
  lotId: BigInt,
  bidId: BigInt,
): BatchBidClaimed {
  const recordId = defaultTransactionHash
    .concatI32(defaultLogIndex.toI32())
    .concatI32(lotId.toI32())
    .concatI32(bidId.toI32());
  const record = BatchBidClaimed.load(recordId);

  if (record == null) {
    throw new Error(
      "BatchBidClaimed not found for lot id " +
        lotId.toString() +
        " and bid id " +
        bidId.toString(),
    );
  }

  return record as BatchBidClaimed;
}

export function getBatchLinearVestingLot(
  recordId: string,
): BatchLinearVestingLot {
  const record = BatchLinearVestingLot.load(recordId);

  if (record == null) {
    throw new Error("BatchLinearVestingLot not found: " + recordId);
  }

  return record as BatchLinearVestingLot;
}

export function getBatchLinearVestingRedeemed(
  recordId: string,
): BatchLinearVestingRedeemed {
  const record = BatchLinearVestingRedeemed.load(recordId);

  if (record == null) {
    throw new Error("BatchLinearVestingRedeemed not found: " + recordId);
  }

  return record as BatchLinearVestingRedeemed;
}
