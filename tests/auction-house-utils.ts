import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import { Purchase } from "../generated/AtomicAuctionHouse/AtomicAuctionHouse";
import {
  Abort,
  AuctionCancelled,
  AuctionCreated,
  Bid,
  ClaimBid,
  Curated,
  ModuleInstalled,
  ModuleSunset,
  OwnershipTransferred,
  RefundBid,
  Settle,
} from "../generated/BatchAuctionHouse/BatchAuctionHouse";
import { newMockEvent } from "./mocks/event";

export function createAuctionCancelledEvent(
  id: BigInt,
  auctionRef: Bytes,
  auctionHouse: Address,
): AuctionCancelled {
  const auctionCancelledEvent = changetype<AuctionCancelled>(
    newMockEvent(auctionHouse),
  );

  auctionCancelledEvent.parameters = [];

  auctionCancelledEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(id)),
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
  infoHash: string,
  auctionHouse: Address,
): AuctionCreated {
  const auctionCreatedEvent = changetype<AuctionCreated>(
    newMockEvent(auctionHouse),
  );

  auctionCreatedEvent.parameters = [];

  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(id)),
  );
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "auctionRef",
      ethereum.Value.fromFixedBytes(auctionRef),
    ),
  );
  auctionCreatedEvent.parameters.push(
    new ethereum.EventParam("infoHash", ethereum.Value.fromString(infoHash)),
  );

  return auctionCreatedEvent;
}

export function createBidEvent(
  lotId_: BigInt,
  bidId_: BigInt,
  bidder: Address,
  amount: BigInt,
  auctionHouse: Address,
): Bid {
  const bidEvent = changetype<Bid>(newMockEvent(auctionHouse));

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

export function createRefundBidEvent(
  lotId_: BigInt,
  bidId_: BigInt,
  bidder: Address,
  auctionHouse: Address,
): RefundBid {
  const cancelBidEvent = changetype<RefundBid>(newMockEvent(auctionHouse));

  cancelBidEvent.parameters = [];

  cancelBidEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(lotId_)),
  );
  cancelBidEvent.parameters.push(
    new ethereum.EventParam("bidId", ethereum.Value.fromUnsignedBigInt(bidId_)),
  );
  cancelBidEvent.parameters.push(
    new ethereum.EventParam("bidder", ethereum.Value.fromAddress(bidder)),
  );

  return cancelBidEvent;
}

export function createClaimBidEvent(
  lotId_: BigInt,
  bidId_: BigInt,
  bidder: Address,
  auctionHouse: Address,
): ClaimBid {
  const claimBidEvent = changetype<ClaimBid>(newMockEvent(auctionHouse));

  claimBidEvent.parameters = [];

  claimBidEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(lotId_)),
  );
  claimBidEvent.parameters.push(
    new ethereum.EventParam("bidId", ethereum.Value.fromUnsignedBigInt(bidId_)),
  );
  claimBidEvent.parameters.push(
    new ethereum.EventParam("bidder", ethereum.Value.fromAddress(bidder)),
  );

  return claimBidEvent;
}

export function createCuratedEvent(
  id: BigInt,
  curator: Address,
  auctionHouse: Address,
): Curated {
  const curatedEvent = changetype<Curated>(newMockEvent(auctionHouse));

  curatedEvent.parameters = [];

  curatedEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(id)),
  );
  curatedEvent.parameters.push(
    new ethereum.EventParam("curator", ethereum.Value.fromAddress(curator)),
  );

  return curatedEvent;
}

export function createAuctionAbortedEvent(
  id: BigInt,
  auctionHouse: Address,
): Abort {
  const abortEvent = changetype<Abort>(newMockEvent(auctionHouse));

  abortEvent.parameters = [];

  abortEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(id)),
  );

  return abortEvent;
}

export function createModuleInstalledEvent(
  keycode_: Bytes,
  version_: i32,
  address_: Address,
  auctionHouse: Address,
): ModuleInstalled {
  const moduleInstalledEvent = changetype<ModuleInstalled>(
    newMockEvent(auctionHouse),
  );

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

export function createModuleSunsetEvent(
  keycode_: Bytes,
  auctionHouse: Address,
): ModuleSunset {
  const moduleSunsetEvent = changetype<ModuleSunset>(
    newMockEvent(auctionHouse),
  );

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
  auctionHouse: Address,
): OwnershipTransferred {
  const ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent(auctionHouse),
  );

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
  auctionHouse: Address,
): Purchase {
  const purchaseEvent = changetype<Purchase>(newMockEvent(auctionHouse));

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

export function createSettleEvent(
  lotId_: BigInt,
  auctionHouse: Address,
): Settle {
  const settleEvent = changetype<Settle>(newMockEvent(auctionHouse));

  settleEvent.parameters = [];

  settleEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(lotId_)),
  );

  return settleEvent;
}
