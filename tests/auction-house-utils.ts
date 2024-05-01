import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import {
  AuctionCancelled,
  AuctionCreated,
  Bid,
  RefundBid,
  Curated,
  ModuleInstalled,
  ModuleSunset,
  OwnershipTransferred,
  Purchase,
  Settle,
} from "../generated/AuctionHouse/AuctionHouse";

export function createAuctionCancelledEvent(
  id: BigInt,
  auctionRef: Bytes,
): AuctionCancelled {
  let auctionCancelledEvent = changetype<AuctionCancelled>(newMockEvent());

  auctionCancelledEvent.parameters = new Array();

  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id)),
  );
  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam(
      "auctionRef",
      ethereum.Value.fromFixedBytes(auctionRef),
    ),
  );

  return auctionCancelledEvent;
}

export function createAuctionCreatedEvent(
  id: BigInt,
  auctionRef: Bytes,
  baseToken: Address,
  quoteToken: Address,
): AuctionCreated {
  let auctionCreatedEvent = changetype<AuctionCreated>(newMockEvent());

  auctionCreatedEvent.parameters = new Array();

  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id)),
  );
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "auctionRef",
      ethereum.Value.fromFixedBytes(auctionRef),
    ),
  );
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam("baseToken", ethereum.Value.fromAddress(baseToken)),
  );
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "quoteToken",
      ethereum.Value.fromAddress(quoteToken),
    ),
  );

  return auctionCreatedEvent;
}

export function createBidEvent(
  lotId_: BigInt,
  bidId_: BigInt,
  bidder: Address,
  amount: BigInt,
): Bid {
  let bidEvent = changetype<Bid>(newMockEvent());

  bidEvent.parameters = new Array();

  bidEvent.parameters.push(
    new ethereum.EventParam(
      "lotId_",
      ethereum.Value.fromUnsignedBigInt(lotId_),
    ),
  );
  bidEvent.parameters.push(
    new ethereum.EventParam(
      "bidId_",
      ethereum.Value.fromUnsignedBigInt(bidId_),
    ),
  );
  bidEvent.parameters.push(
    new ethereum.EventParam("bidder", ethereum.Value.fromAddress(bidder)),
  );
  bidEvent.parameters.push(
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );

  return bidEvent;
}

export function createCancelBidEvent(
  lotId_: BigInt,
  bidId_: BigInt,
  bidder: Address,
): RefundBid {
  let cancelBidEvent = changetype<RefundBid>(newMockEvent());

  cancelBidEvent.parameters = new Array();

  cancelBidEvent.parameters.push(
    new ethereum.EventParam(
      "lotId_",
      ethereum.Value.fromUnsignedBigInt(lotId_),
    ),
  );
  cancelBidEvent.parameters.push(
    new ethereum.EventParam(
      "bidId_",
      ethereum.Value.fromUnsignedBigInt(bidId_),
    ),
  );
  cancelBidEvent.parameters.push(
    new ethereum.EventParam("bidder", ethereum.Value.fromAddress(bidder)),
  );

  return cancelBidEvent;
}

export function createCuratedEvent(id: BigInt, curator: Address): Curated {
  let curatedEvent = changetype<Curated>(newMockEvent());

  curatedEvent.parameters = new Array();

  curatedEvent.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id)),
  );
  curatedEvent.parameters.push(
    new ethereum.EventParam("curator", ethereum.Value.fromAddress(curator)),
  );

  return curatedEvent;
}

export function createModuleInstalledEvent(
  keycode_: Bytes,
  version_: i32,
  address_: Address,
): ModuleInstalled {
  let moduleInstalledEvent = changetype<ModuleInstalled>(newMockEvent());

  moduleInstalledEvent.parameters = new Array();

  moduleInstalledEvent.parameters.push(
    new ethereum.EventParam(
      "keycode_",
      ethereum.Value.fromFixedBytes(keycode_),
    ),
  );
  moduleInstalledEvent.parameters.push(
    new ethereum.EventParam(
      "version_",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(version_)),
    ),
  );
  moduleInstalledEvent.parameters.push(
    new ethereum.EventParam("address_", ethereum.Value.fromAddress(address_)),
  );

  return moduleInstalledEvent;
}

export function createModuleSunsetEvent(keycode_: Bytes): ModuleSunset {
  let moduleSunsetEvent = changetype<ModuleSunset>(newMockEvent());

  moduleSunsetEvent.parameters = new Array();

  moduleSunsetEvent.parameters.push(
    new ethereum.EventParam(
      "keycode_",
      ethereum.Value.fromFixedBytes(keycode_),
    ),
  );

  return moduleSunsetEvent;
}

export function createOwnershipTransferredEvent(
  user: Address,
  newOwner: Address,
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user)),
  );
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner)),
  );

  return ownershipTransferredEvent;
}

export function createPurchaseEvent(
  lotId_: BigInt,
  buyer: Address,
  referrer: Address,
  amount: BigInt,
  payout: BigInt,
): Purchase {
  let purchaseEvent = changetype<Purchase>(newMockEvent());

  purchaseEvent.parameters = new Array();

  purchaseEvent.parameters.push(
    new ethereum.EventParam(
      "lotId_",
      ethereum.Value.fromUnsignedBigInt(lotId_),
    ),
  );
  purchaseEvent.parameters.push(
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(buyer)),
  );
  purchaseEvent.parameters.push(
    new ethereum.EventParam("referrer", ethereum.Value.fromAddress(referrer)),
  );
  purchaseEvent.parameters.push(
    new ethereum.EventParam(
      "amount",
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );
  purchaseEvent.parameters.push(
    new ethereum.EventParam(
      "payout",
      ethereum.Value.fromUnsignedBigInt(payout),
    ),
  );

  return purchaseEvent;
}

export function createSettleEvent(lotId_: BigInt): Settle {
  let settleEvent = changetype<Settle>(newMockEvent());

  settleEvent.parameters = new Array();

  settleEvent.parameters.push(
    new ethereum.EventParam(
      "lotId_",
      ethereum.Value.fromUnsignedBigInt(lotId_),
    ),
  );

  return settleEvent;
}
