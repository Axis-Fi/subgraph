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
