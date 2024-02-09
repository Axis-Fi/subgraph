import { Address, BigInt } from "@graphprotocol/graph-ts";

import { AuctionHouse } from "../../generated/AuctionHouse/AuctionHouse";
import {
  AuctionModule,
  AuctionModule__lotDataResult,
} from "../../generated/AuctionHouse/AuctionModule";

const AUCTION_HOUSE = "0x6837fa8E3aF4C82f5EA7ac6ecBEcFE65dae8877f";

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
