import { Address, BigInt, dataSource } from "@graphprotocol/graph-ts";

import {
  BatchAuctionHouse,
  BatchAuctionHouse__lotFeesResult,
} from "../../generated/BatchAuctionHouse/BatchAuctionHouse";
import {
  BatchAuctionModule,
  BatchAuctionModule__lotDataResult,
} from "../../generated/BatchAuctionHouse/BatchAuctionModule";
import { BatchAuctionLot } from "../../generated/schema";

export function getAuctionHouse(
  auctionHouseAddress: Address,
): BatchAuctionHouse {
  return BatchAuctionHouse.bind(auctionHouseAddress);
}

export function getAuctionModule(
  auctionHouse: BatchAuctionHouse,
  lotId: BigInt,
): BatchAuctionModule {
  return BatchAuctionModule.bind(auctionHouse.getAuctionModuleForId(lotId));
}

export function getAuctionLot(
  auctionHouseAddress: Address,
  lotId: BigInt,
): BatchAuctionModule__lotDataResult {
  const auctionHouse = getAuctionHouse(auctionHouseAddress);
  const auctionModule = getAuctionModule(auctionHouse, lotId);
  return auctionModule.lotData(lotId);
}

export function getAuctionCuration(
  auctionHouseAddress: Address,
  lotId: BigInt,
): BatchAuctionHouse__lotFeesResult {
  const auctionHouse = getAuctionHouse(auctionHouseAddress);
  return auctionHouse.lotFees(lotId);
}

export function getLotRecordId(
  auctionHouseAddress: Address,
  lotId: BigInt,
): string {
  return (
    dataSource.network() +
    "-" +
    auctionHouseAddress.toHexString() +
    "-" +
    lotId.toString()
  );
}

export function getLotRecord(
  auctionHouseAddress: Address,
  lotId: BigInt,
): BatchAuctionLot {
  const recordId = getLotRecordId(auctionHouseAddress, lotId);
  const entity = BatchAuctionLot.load(recordId);

  if (entity == null) {
    throw new Error(
      "Expected batch auction lot to exist for record id " + recordId,
    );
  }

  return entity as BatchAuctionLot;
}
