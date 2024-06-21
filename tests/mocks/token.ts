import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockFunction } from "matchstick-as/assembly/index";

export function mockToken(
  address: Address,
  name: string,
  symbol: string,
  decimals: i32,
  totalSupply: BigInt,
): void {
  mockFunction(
    address,
    "name",
    "name():(string)",
    [],
    [ethereum.Value.fromString(name)],
    false,
  );
  mockFunction(
    address,
    "symbol",
    "symbol():(string)",
    [],
    [ethereum.Value.fromString(symbol)],
    false,
  );
  mockFunction(
    address,
    "decimals",
    "decimals():(uint8)",
    [],
    [ethereum.Value.fromI32(decimals)],
    false,
  );
  mockFunction(
    address,
    "totalSupply",
    "totalSupply():(uint256)",
    [],
    [ethereum.Value.fromUnsignedBigInt(totalSupply)],
    false,
  );
}

export function mockBalanceOf(
  address: Address,
  owner: Address,
  balance: BigInt,
): void {
  mockFunction(
    address,
    "balanceOf",
    "balanceOf(address):(uint256)",
    [ethereum.Value.fromAddress(owner)],
    [ethereum.Value.fromUnsignedBigInt(balance)],
    false,
  );
}
