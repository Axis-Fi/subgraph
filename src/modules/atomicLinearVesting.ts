import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { AuctionCreated } from "../../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import {
  AtomicAuctionLot,
  AtomicLinearVestingLot,
} from "../../generated/schema";
import { toISO8601String } from "../helpers/date";
import { fromSlicedBytes } from "../helpers/number";

export const LV_KEYCODE = "LIV";

export function createLinearVestingLot(
  atomicAuctionLot: AtomicAuctionLot,
  createdEvent: AuctionCreated,
  derivativeParams: Bytes,
): void {
  const lvLot: AtomicLinearVestingLot = new AtomicLinearVestingLot(
    createdEvent.transaction.hash.concatI32(createdEvent.logIndex.toI32()),
  );
  lvLot.lot = atomicAuctionLot.id;

  // Decode the parameters
  // uint48, uint48

  // Get the first 32 characters of the derivativeParams
  const start: BigInt = fromSlicedBytes(derivativeParams, 0, 32);
  // Get the next 32 characters of the derivativeParams
  const expiry: BigInt = fromSlicedBytes(derivativeParams, 32, 64);

  lvLot.startTimestamp = start;
  lvLot.startDate = toISO8601String(start);
  lvLot.expiryTimestamp = expiry;
  lvLot.expiryDate = toISO8601String(expiry);
  lvLot.save();
}
