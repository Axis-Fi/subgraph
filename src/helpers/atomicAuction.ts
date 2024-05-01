import { Address, BigInt } from "@graphprotocol/graph-ts";

import { AtomicAuctionHouse, AtomicAuctionHouse__lotFeesResult } from "../../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import { AtomicAuctionModule, AtomicAuctionModule__lotDataResult } from "../../generated/AtomicAuctionHouse/AtomicAuctionModule";

export function getAuctionHouse(auctionHouseAddress: Address): AtomicAuctionHouse {
    return AtomicAuctionHouse.bind(auctionHouseAddress);
}

export function getAuctionModule(
    auctionHouse: AtomicAuctionHouse,
    lotId: BigInt
): AtomicAuctionModule {
    return AtomicAuctionModule.bind(auctionHouse.getModuleForId(lotId));
}

export function getAuctionLot(auctionHouseAddress: Address, lotId: BigInt): AtomicAuctionModule__lotDataResult {
    const auctionHouse = getAuctionHouse(auctionHouseAddress);
    const auctionModule = getAuctionModule(auctionHouse, lotId);
    return auctionModule.lotData(lotId);
}

export function getAuctionCuration(auctionHouseAddress: Address, lotId: BigInt): AtomicAuctionHouse__lotFeesResult {
    const auctionHouse = getAuctionHouse(auctionHouseAddress);
    return auctionHouse.lotFees(lotId);
}
