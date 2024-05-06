import { Bytes } from "@graphprotocol/graph-ts";
import { assert, describe, test } from "matchstick-as";

import { fromSlicedBytes } from "../src/helpers/number";

describe("fromBytes", () => {
  test("should convert bytes to BigInt", () => {
    const bytes = Bytes.fromHexString(
      "0x000000000000000000000000000000000000000000000000000000006634443400000000000000000000000000000000000000000000000000000000663adbb4",
    );

    assert.stringEquals("1714701364", fromSlicedBytes(bytes, 0, 32).toString());
    assert.stringEquals(
      "1715133364",
      fromSlicedBytes(bytes, 32, 64).toString(),
    );
  });
});
