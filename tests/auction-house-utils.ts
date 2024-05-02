import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";

import { Purchase } from "../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import {
  AuctionCancelled,
  AuctionCreated,
  Bid,
  Curated,
  ModuleInstalled,
  ModuleSunset,
  OwnershipTransferred,
  RefundBid,
  Settle,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";

export function createAuctionCancelledEvent(
  id: BigInt,
  auctionRef: Bytes,
): AuctionCancelled {
  const auctionCancelledEvent = changetype<AuctionCancelled>(newMockEvent());

  auctionCancelledEvent.parameters = [];

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
  const auctionCreatedEvent = changetype<AuctionCreated>(newMockEvent());

  auctionCreatedEvent.parameters = [];

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
  const bidEvent = changetype<Bid>(newMockEvent());

  bidEvent.parameters = [];

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
  const cancelBidEvent = changetype<RefundBid>(newMockEvent());

  cancelBidEvent.parameters = [];

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
  const curatedEvent = changetype<Curated>(newMockEvent());

  curatedEvent.parameters = [];

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
  const moduleInstalledEvent = changetype<ModuleInstalled>(newMockEvent());

  moduleInstalledEvent.parameters = [];

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
  const moduleSunsetEvent = changetype<ModuleSunset>(newMockEvent());

  moduleSunsetEvent.parameters = [];

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
  const ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = [];

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
  const purchaseEvent = changetype<Purchase>(newMockEvent());

  purchaseEvent.parameters = [];

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
  const settleEvent = changetype<Settle>(newMockEvent());

  settleEvent.parameters = [];

  settleEvent.parameters.push(
    new ethereum.EventParam(
      "lotId_",
      ethereum.Value.fromUnsignedBigInt(lotId_),
    ),
  );

  return settleEvent;
}
