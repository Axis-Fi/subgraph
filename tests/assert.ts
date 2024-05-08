import { assert } from "matchstick-as";

export function assertStringEquals(
    actual: string,
    expected: string,
    message: string,
  ): void {
    assert.stringEquals(
      actual,
      expected,
      message + ": actual: " + actual + " expected: " + expected,
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
      message + ": actual: " + actual.toString() + " expected: " + expected.toString(),
    );
  }