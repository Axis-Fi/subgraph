import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import { toDecimal } from "../../src/helpers/number";

export function calculatePrice(
  quoteTokenAmount: BigInt,
  quoteTokenDecimals: i32,
  baseTokenAmount: BigInt,
): BigDecimal {
  return toDecimal(
    quoteTokenAmount
      .times(BigInt.fromU64(10 ** quoteTokenDecimals))
      .div(baseTokenAmount),
    quoteTokenDecimals,
  );
}
