import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  AtomicAuctionHouse,
  AtomicAuctionHouse__lotFeesResult,
} from "../../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import {
  AtomicAuctionModule,
  AtomicAuctionModule__lotDataResult,
} from "../../generated/AtomicAuctionHouse/AtomicAuctionModule";
import { AtomicAuctionLot } from "../../generated/schema";
import { getChain } from "./chain";

export function getAuctionHouse(
  auctionHouseAddress: Address,
): AtomicAuctionHouse {
  return AtomicAuctionHouse.bind(auctionHouseAddress);
}

export function getAuctionModule(
  auctionHouse: AtomicAuctionHouse,
  lotId: BigInt,
): AtomicAuctionModule {
  return AtomicAuctionModule.bind(auctionHouse.getAuctionModuleForId(lotId));
}

export function getAuctionLot(
  auctionHouseAddress: Address,
  lotId: BigInt,
): AtomicAuctionModule__lotDataResult {
  const auctionHouse = getAuctionHouse(auctionHouseAddress);
  const auctionModule = getAuctionModule(auctionHouse, lotId);
  return auctionModule.lotData(lotId);
}

export function getAuctionCuration(
  auctionHouseAddress: Address,
  lotId: BigInt,
): AtomicAuctionHouse__lotFeesResult {
  const auctionHouse = getAuctionHouse(auctionHouseAddress);
  return auctionHouse.lotFees(lotId);
}

export function getLotRecordId(
  auctionHouseAddress: Address,
  lotId: BigInt,
): string {
  return (
    getChain() +
    "-" +
    auctionHouseAddress.toHexString() +
    "-" +
    lotId.toString()
  );
}

export function getLotRecord(
  auctionHouseAddress: Address,
  lotId: BigInt,
): AtomicAuctionLot {
  const recordId = getLotRecordId(auctionHouseAddress, lotId);
  const entity = AtomicAuctionLot.load(recordId);

  if (entity == null) {
    throw new Error(
      "Expected atomic auction lot to exist for record id " + recordId,
    );
  }

  return entity as AtomicAuctionLot;
}
