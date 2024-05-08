import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { mockFunction } from "matchstick-as";

export function mockLotData(
  module: Address,
  lotId: BigInt,
  start: BigInt,
  conclusion: BigInt,
  quoteTokenDecimals: i32,
  baseTokenDecimals: i32,
  capacityInQuote: boolean,
  capacity: BigInt,
  sold: BigInt,
  purchased: BigInt,
): void {
  mockFunction(
    module,
    "lotData",
    "lotData(uint96):(uint48,uint48,uint8,uint8,bool,uint256,uint256,uint256)",
    [ethereum.Value.fromUnsignedBigInt(lotId)],
    [
      ethereum.Value.fromUnsignedBigInt(start),
      ethereum.Value.fromUnsignedBigInt(conclusion),
      ethereum.Value.fromI32(quoteTokenDecimals),
      ethereum.Value.fromI32(baseTokenDecimals),
      ethereum.Value.fromBoolean(capacityInQuote),
      ethereum.Value.fromUnsignedBigInt(capacity),
      ethereum.Value.fromUnsignedBigInt(sold),
      ethereum.Value.fromUnsignedBigInt(purchased),
    ],
    false,
  );
}
