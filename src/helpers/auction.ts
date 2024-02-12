import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  AuctionHouse,
  AuctionHouse__lotCurationResult,
} from "../../generated/AuctionHouse/AuctionHouse";
import {
  AuctionModule,
  AuctionModule__lotDataResult,
} from "../../generated/AuctionHouse/AuctionModule";

const AUCTION_HOUSE = "0x00000000AD4dd7bC9077e3894225840fE1bfd6eC";

export function getAuctionHouse(): AuctionHouse {
  return AuctionHouse.bind(Address.fromString(AUCTION_HOUSE));
}

export function getAuctionModule(
  auctionHouse: AuctionHouse,
  lotId: BigInt,
): AuctionModule {
  return AuctionModule.bind(auctionHouse.getModuleForId(lotId));
}

export function getAuctionLot(lotId: BigInt): AuctionModule__lotDataResult {
  const auctionHouse = getAuctionHouse();
  const auctionModule = getAuctionModule(auctionHouse, lotId);
  return auctionModule.lotData(lotId);
}

export function getAuctionCuration(
  lotId: BigInt,
): AuctionHouse__lotCurationResult {
  const auctionHouse = getAuctionHouse();
  return auctionHouse.lotCuration(lotId);
}
