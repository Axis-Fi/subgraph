import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { mockFunction } from "matchstick-as";

export function mockTokenId(
  moduleAddress: Address,
  underlyingToken: Address,
  derivativeParams: Bytes,
  tokenId: BigInt,
): void {
  mockFunction(
    moduleAddress,
    "computeId",
    "computeId(address,bytes):(uint256)",
    [
      ethereum.Value.fromAddress(underlyingToken),
      ethereum.Value.fromBytes(derivativeParams),
    ],
    [ethereum.Value.fromUnsignedBigInt(tokenId)],
    false,
  );
}

export function mockDerivativeBalanceOf(
  moduleAddress: Address,
  account: Address,
  tokenId: BigInt,
  balance: BigInt,
): void {
  mockFunction(
    moduleAddress,
    "balanceOf",
    "balanceOf(address,uint256):(uint256)",
    [
      ethereum.Value.fromAddress(account),
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ],
    [ethereum.Value.fromUnsignedBigInt(balance)],
    false,
  );
}

export function mockDerivativeDecimals(
  moduleAddress: Address,
  tokenId: BigInt,
  decimals: i32,
): void {
  mockFunction(
    moduleAddress,
    "decimals",
    "decimals(uint256):(uint8)",
    [ethereum.Value.fromUnsignedBigInt(tokenId)],
    [ethereum.Value.fromI32(decimals)],
    false,
  );
}

export function mockTokenMetadata(
  moduleAddress: Address,
  tokenId: BigInt,
  exists: boolean,
  wrappedAddress: Address,
  underlyingTokenAddress: Address,
  derivativeParams: Bytes,
): void {
  mockFunction(
    moduleAddress,
    "tokenMetadata",
    "tokenMetadata(uint256):(bool,address,address,bytes)",
    [ethereum.Value.fromUnsignedBigInt(tokenId)],
    [
      ethereum.Value.fromBoolean(exists),
      ethereum.Value.fromAddress(wrappedAddress),
      ethereum.Value.fromAddress(underlyingTokenAddress),
      ethereum.Value.fromBytes(derivativeParams),
    ],
    false,
  );
}
