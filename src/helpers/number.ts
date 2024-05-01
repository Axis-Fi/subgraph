import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function toDecimal(value: BigInt, decimals: number): BigDecimal {
  // An unhandled zero value seems to trigger an error: "out of range integral type conversion attempted"
  if (value.equals(BigInt.zero())) {
    return BigDecimal.zero();
  }

  const precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();

  return value.divDecimal(precision);
}

export function fromDecimal(value: BigDecimal, decimals: number): BigDecimal {
  const precision = BigInt.fromI32(10)
    .pow(<u8>decimals)
    .toBigDecimal();
  return value.times(precision);
}
