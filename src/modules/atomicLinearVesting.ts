import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import {
  AtomicAuctionHouse,
  AuctionCreated,
} from "../../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import { LinearVesting } from "../../generated/AtomicAuctionHouse/LinearVesting";
import {
  AtomicAuctionLot,
  AtomicLinearVestingLot,
} from "../../generated/schema";
import { getAuctionHouse } from "../helpers/atomicAuction";
import { toISO8601String } from "../helpers/date";

export const LV_KEYCODE = "LIV";

function _getLinearVestingModule(
  auctionHouseAddress: Address,
  moduleRef: Bytes,
): LinearVesting {
  const auctionHouse: AtomicAuctionHouse = getAuctionHouse(auctionHouseAddress);

  const moduleAddress = auctionHouse.getModuleForVeecode(moduleRef);

  return LinearVesting.bind(moduleAddress);
}

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
  // uint48, uint48, address

  // Get the first 6 bytes of the derivativeParams
  const start = BigInt.fromByteArray(derivativeParams.slice(0, 6) as Bytes);
  // Get the next 6 bytes of the derivativeParams
  const expiry = BigInt.fromByteArray(derivativeParams.slice(6, 12) as Bytes);

  lvLot.startTimestamp = start;
  lvLot.startDate = toISO8601String(start);
  lvLot.expiryTimestamp = expiry;
  lvLot.expiryDate = toISO8601String(expiry);
  lvLot.save();
}
