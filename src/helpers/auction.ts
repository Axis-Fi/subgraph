import { Address, BigInt } from "@graphprotocol/graph-ts";

import {
  AuctionHouse,
  AuctionHouse__lotCurationResult,
} from "../../generated/AuctionHouse/AuctionHouse";
import {
  AuctionModule,
  AuctionModule__lotDataResult,
} from "../../generated/AuctionHouse/AuctionModule";

const AUCTION_HOUSE = "0x13B299062c5E613C304145D78dA733bF9711DfC9";

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
