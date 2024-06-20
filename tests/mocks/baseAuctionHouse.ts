import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { mockFunction } from "matchstick-as";

export function mockGetModuleForVeecode(
  auctionHouse: Address,
  veecode: string,
  module: Address,
): void {
  mockFunction(
    auctionHouse,
    "getModuleForVeecode",
    "getModuleForVeecode(bytes7):(address)",
    [ethereum.Value.fromFixedBytes(Bytes.fromUTF8(veecode))],
    [ethereum.Value.fromAddress(module)],
    false,
  );
}

export function mockGetAuctionModuleForId(
  auctionHouse: Address,
  lotId: BigInt,
  module: Address,
): void {
  mockFunction(
    auctionHouse,
    "getAuctionModuleForId",
    "getAuctionModuleForId(uint96):(address)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [ethereum.Value.fromAddress(module)],
    false,
  );
}

export function mockLotRouting(
  auctionHouse: Address,
  lotId: BigInt,
  seller: Address,
  baseToken: Address,
  quoteToken: Address,
  auctionReference: Bytes,
  funding: BigInt,
  callbacks: Address,
  derivativeReference: Bytes,
  wrapDerivative: boolean,
  derivativeParams: Bytes,
): void {
  mockFunction(
    auctionHouse,
    "lotRouting",
    "lotRouting(uint96):(address,address,address,bytes7,uint256,address,bytes7,bool,bytes)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromAddress(seller),
      ethereum.Value.fromAddress(baseToken),
      ethereum.Value.fromAddress(quoteToken),
      ethereum.Value.fromBytes(auctionReference),
      ethereum.Value.fromUnsignedBigInt(funding),
      ethereum.Value.fromAddress(callbacks),
      ethereum.Value.fromBytes(derivativeReference),
      ethereum.Value.fromBoolean(wrapDerivative),
      ethereum.Value.fromBytes(derivativeParams),
    ],
    false,
  );
}

export function mockLotFees(
  auctionHouse: Address,
  lotId: BigInt,
  curator: Address,
  curatorApproved: boolean,
  curatorFee: i32,
  protocolFee: i32,
  referrerFee: i32,
): void {
  mockFunction(
    auctionHouse,
    "lotFees",
    "lotFees(uint96):(address,bool,uint48,uint48,uint48)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromAddress(curator),
      ethereum.Value.fromBoolean(curatorApproved),
      ethereum.Value.fromI32(curatorFee),
      ethereum.Value.fromI32(protocolFee),
      ethereum.Value.fromI32(referrerFee),
    ],
    false,
  );
}
