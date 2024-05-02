import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";

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

/**
 * Takes a slice of the given Bytes value and converts it to a BigInt.
 *
 * @param value
 * @param start
 * @param length
 * @returns
 */
export function fromSlicedBytes(value: Bytes, start: i32, length: i32): BigInt {
  // First, slice the bytes and change back into Bytes
  const slicedBytes: Bytes = changetype<Bytes>(value.slice(start, length));

  // BigInt expects the bytes to be little-endian, so reverse the bytes
  const reversedBytes: Bytes = changetype<Bytes>(slicedBytes.reverse());

  // Convert the reversed bytes into a BigInt
  return BigInt.fromByteArray(reversedBytes);
}
