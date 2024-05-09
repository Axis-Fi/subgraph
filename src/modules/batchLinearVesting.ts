import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";

import { AuctionCreated } from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import { BatchAuctionLot, BatchLinearVestingLot } from "../../generated/schema";
import { toISO8601String } from "../helpers/date";
import { fromSlicedBytes } from "../helpers/number";

export const LV_KEYCODE = "LIV";

export function createLinearVestingLot(
  batchAuctionLot: BatchAuctionLot,
  createdEvent: AuctionCreated,
  derivativeParams: Bytes,
): void {
  const lvLot: BatchLinearVestingLot = new BatchLinearVestingLot(
    batchAuctionLot.id,
  );
  lvLot.lot = batchAuctionLot.id;
  log.info("Adding BatchLinearVestingLot for lot: {}", [lvLot.lot]);

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
