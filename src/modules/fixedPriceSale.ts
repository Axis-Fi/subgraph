import { Address, Bytes } from "@graphprotocol/graph-ts";

import {
  AtomicAuctionHouse,
  AuctionCreated,
} from "../../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import { FixedPriceSale } from "../../generated/AtomicAuctionHouse/FixedPriceSale";
import { AtomicAuctionLot, FixedPriceSaleLot } from "../../generated/schema";
import { getAuctionHouse } from "../helpers/atomicAuction";
import { toDecimal } from "../helpers/number";
import { getOrCreateToken } from "../helpers/token";

export const FPS_KEYCODE = "FPSA";

function _getFixedPriceSaleModule(
  auctionHouseAddress: Address,
  moduleRef: Bytes,
): FixedPriceSale {
  const auctionHouse: AtomicAuctionHouse = getAuctionHouse(auctionHouseAddress);

  const moduleAddress = auctionHouse.getModuleForVeecode(moduleRef);

  return FixedPriceSale.bind(moduleAddress);
}

export function createFixedPriceSaleLot(
  atomicAuctionLot: AtomicAuctionLot,
  createdEvent: AuctionCreated,
): void {
  const fpsLot: FixedPriceSaleLot = new FixedPriceSaleLot(
    createdEvent.transaction.hash.concatI32(createdEvent.logIndex.toI32()),
  );
  fpsLot.lot = atomicAuctionLot.id;

  // Get the FixedPriceSale module
  const fixedPriceSale = _getFixedPriceSaleModule(
    Address.fromBytes(atomicAuctionLot.auctionHouse),
    atomicAuctionLot.auctionRef,
  );

  const baseToken = getOrCreateToken(atomicAuctionLot.baseToken);
  const lotAuctionData = fixedPriceSale.auctionData(atomicAuctionLot.lotId);

  fpsLot.price = toDecimal(lotAuctionData.getPrice(), baseToken.decimals);
  fpsLot.maxPayout = toDecimal(
    lotAuctionData.getMaxPayout(),
    baseToken.decimals,
  );
  fpsLot.save();
}
