import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockFunction } from "matchstick-as";

export function mockEmpAuctionData(
  module: Address,
  lotId: BigInt,
  nextBidId: i32,
  nextDecryptIndex: i32,
  status: i32,
  marginalBidId: i32,
  marginalPrice: BigInt,
  minPrice: BigInt,
  minFilled: BigInt,
  minBidSize: BigInt,
  publicKeyX: BigInt,
  publicKeyY: BigInt,
  privateKey: BigInt,
): void {
  const publicKey: ethereum.Tuple = changetype<ethereum.Tuple>([
    ethereum.Value.fromUnsignedBigInt(publicKeyX),
    ethereum.Value.fromUnsignedBigInt(publicKeyY),
  ]);

  mockFunction(
    module,
    "auctionData",
    "auctionData(uint96):(uint64,uint64,uint8,uint64,uint256,uint256,uint256,uint256,(uint256,uint256),uint256)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromI32(nextBidId),
      ethereum.Value.fromI32(nextDecryptIndex),
      ethereum.Value.fromI32(status),
      ethereum.Value.fromI32(marginalBidId),
      ethereum.Value.fromUnsignedBigInt(marginalPrice),
      ethereum.Value.fromUnsignedBigInt(minPrice),
      ethereum.Value.fromUnsignedBigInt(minFilled),
      ethereum.Value.fromUnsignedBigInt(minBidSize),
      ethereum.Value.fromTuple(publicKey),
      ethereum.Value.fromUnsignedBigInt(privateKey),
    ],
    false,
  );
}

export function mockEmpPartialFill(
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

export function mockEmpBid(
  module: Address,
  lotId: BigInt,
  bidId: BigInt,
  bidder: Address,
  amount: BigInt,
  minAmountOut: BigInt,
  referrer: Address,
  status: i32,
): void {
  mockFunction(
    module,
    "bids",
    "bids(uint96,uint64):(address,uint96,uint96,address,uint8)",
    [
      ethereum.Value.fromUnsignedBigInt(lotId),
      ethereum.Value.fromUnsignedBigInt(bidId),
    ],
    [
      ethereum.Value.fromAddress(bidder),
      ethereum.Value.fromUnsignedBigInt(amount),
      ethereum.Value.fromUnsignedBigInt(minAmountOut),
      ethereum.Value.fromAddress(referrer),
      ethereum.Value.fromI32(status),
    ],
    false,
  );
}

export function mockEmpParent(module: Address, parent: Address): void {
  mockFunction(
    module,
    "PARENT",
    "PARENT():(address)",
    [],
    [ethereum.Value.fromAddress(parent)],
    false,
  );
}

export function mockEmpBidClaim(
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
