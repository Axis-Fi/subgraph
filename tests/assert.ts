import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { assert } from "matchstick-as";

export function assertStringEquals(
  actual: string | null,
  expected: string | null,
  message: string,
): void {
  const actualNotNull: string = actual !== null ? actual.toString() : "";
  const expectedNotNull: string = expected !== null ? expected.toString() : "";

  assert.stringEquals(
    actualNotNull,
    expectedNotNull,
    message + ": actual: " + actualNotNull + " expected: " + expectedNotNull,
  );
}

export function assertNull(actual: string | null, message: string): void {
  const actualNotNull: string = actual !== null ? actual : "";
  assert.assertNull(
    actual,
    message + ": was expected to be null, but was: " + actualNotNull,
  );
}

export function assertBooleanEquals(
  actual: boolean,
  expected: boolean,
  message: string,
): void {
  assert.booleanEquals(
    actual,
    expected,
    message +
      ": actual: " +
      actual.toString() +
      " expected: " +
      expected.toString(),
  );
}

export function assertBigDecimalEquals(
  actual: BigDecimal | null,
  expected: BigDecimal | null,
  message: string,
): void {
  const actualNotNull: string = actual !== null ? actual.toString() : "";
  const expectedNotNull: string = expected !== null ? expected.toString() : "";

  assert.stringEquals(
    actualNotNull,
    expectedNotNull,
    message + ": actual: " + actualNotNull + " expected: " + expectedNotNull,
  );
}

export function assertBigIntEquals(
  actual: BigInt | null,
  expected: BigInt | null,
  message: string,
): void {
  const actualNotNull: string = actual !== null ? actual.toString() : "";
  const expectedNotNull: string = expected !== null ? expected.toString() : "";

  assert.stringEquals(
    actualNotNull,
    expectedNotNull,
    message + ": actual: " + actualNotNull + " expected: " + expectedNotNull,
  );
}

export function assertBytesEquals(
  actual: Bytes | null,
  expected: Bytes | null,
  message: string,
): void {
  const actualNotNull: string = actual !== null ? actual.toHexString() : "";
  const expectedNotNull: string =
    expected !== null ? expected.toHexString() : "";

  assert.stringEquals(
    actualNotNull,
    expectedNotNull,
    message + ": actual: " + actualNotNull + " expected: " + expectedNotNull,
  );
}

export function assertI32Equals(
  actual: i32,
  expected: i32,
  message: string,
): void {
  assert.i32Equals(
    actual,
    expected,
    message +
      ": actual: " +
      actual.toString() +
      " expected: " +
      expected.toString(),
  );
}
