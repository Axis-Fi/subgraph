import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  AuctionHouse,
  AuctionHouse__lotFeesResult,
} from "../../generated/AuctionHouse/AuctionHouse";
import {
  AuctionModule,
  AuctionModule__lotDataResult,
} from "../../generated/AuctionHouse/AuctionModule";

import { AUCTION_HOUSE_ADDRESS } from "../constants";

export function getAuctionHouse(): AuctionHouse {
  return AuctionHouse.bind(Address.fromString(AUCTION_HOUSE_ADDRESS));
}

export function getAuctionModule(
  auctionHouse: AuctionHouse,
  lotId: BigInt
): AuctionModule {
  return AuctionModule.bind(auctionHouse.getModuleForId(lotId));
}

export function getAuctionLot(lotId: BigInt): AuctionModule__lotDataResult {
  const auctionHouse = getAuctionHouse();
  const auctionModule = getAuctionModule(auctionHouse, lotId);
  return auctionModule.lotData(lotId);
}

export function getAuctionCuration(lotId: BigInt): AuctionHouse__lotFeesResult {
  const auctionHouse = getAuctionHouse();
  return auctionHouse.lotFees(lotId);
}
