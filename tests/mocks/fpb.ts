import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockFunction } from "matchstick-as";

export function mockFpbAuctionData(
  module: Address,
  lotId: BigInt,
  price: BigInt,
  status: i32,
  nextBidId: i32,
  settlementCleared: boolean,
  totalBidAmount: BigInt,
  minFilled: BigInt,
): void {
  mockFunction(
    module,
    "auctionData",
    "auctionData(uint96):(uint256,uint8,uint64,bool,uint256,uint256)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromUnsignedBigInt(price),
      ethereum.Value.fromI32(status),
      ethereum.Value.fromI32(nextBidId),
      ethereum.Value.fromBoolean(settlementCleared),
      ethereum.Value.fromUnsignedBigInt(totalBidAmount),
      ethereum.Value.fromUnsignedBigInt(minFilled),
    ],
    false,
  );
}

export function mockFpbPartialFill(
  module: Address,
  lotId: BigInt,
  hasPartialFill: boolean,
  bidId: i32,
  refund: BigInt,
  payout: BigInt,
): void {
  const partialFill: ethereum.Tuple = changetype<ethereum.Tuple>([
    ethereum.Value.fromI32(bidId),
    ethereum.Value.fromUnsignedBigInt(refund),
    ethereum.Value.fromUnsignedBigInt(payout),
  ]);

  mockFunction(
    module,
    "getPartialFill",
    "getPartialFill(uint96):(bool,(uint64,uint96,uint256))",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromBoolean(hasPartialFill),
      ethereum.Value.fromTuple(partialFill),
    ],
    false,
  );
}

export function mockFpbBid(
  module: Address,
  lotId: BigInt,
  bidId: BigInt,
  bidder: Address,
  amount: BigInt,
  referrer: Address,
  status: i32,
): void {
  mockFunction(
    module,
    "bids",
    "bids(uint96,uint64):(address,uint96,address,uint8)",
    [
      ethereum.Value.fromUnsignedBigInt(lotId),
      ethereum.Value.fromUnsignedBigInt(bidId),
    ],
    [
      ethereum.Value.fromAddress(bidder),
      ethereum.Value.fromUnsignedBigInt(amount),
      ethereum.Value.fromAddress(referrer),
      ethereum.Value.fromI32(status),
    ],
    false,
  );
}

export function mockFpbParent(module: Address, parent: Address): void {
  mockFunction(
    module,
    "PARENT",
    "PARENT():(address)",
    [],
    [ethereum.Value.fromAddress(parent)],
    false,
  );
}

export function mockFpbBidClaim(
  module: Address,
  lotId: BigInt,
  bidId: BigInt,
  bidder: Address,
  referrer: Address,
  paid: BigInt,
  payout: BigInt,
  refund: BigInt,
): void {
  const bidClaim: ethereum.Tuple = changetype<ethereum.Tuple>([
    ethereum.Value.fromAddress(bidder),
    ethereum.Value.fromAddress(referrer),
    ethereum.Value.fromUnsignedBigInt(paid),
    ethereum.Value.fromUnsignedBigInt(payout),
    ethereum.Value.fromUnsignedBigInt(refund),
  ]);

  mockFunction(
    module,
    "getBidClaim",
    "getBidClaim(uint96,uint64):((address,address,uint256,uint256,uint256))",
    [
      ethereum.Value.fromUnsignedBigInt(lotId),
      ethereum.Value.fromUnsignedBigInt(bidId),
    ],
    [ethereum.Value.fromTuple(bidClaim)],
    false,
  );
}
