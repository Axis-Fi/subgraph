import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  afterAll,
  assert,
  beforeAll,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";

import { handleAuctionCancelled } from "../src/batchAuctionHouse";
import { createAuctionCancelledEvent } from "./auction-house-utils";

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    const id = BigInt.fromI32(234);
    const auctionRef = Bytes.fromI32(1234567890);
    const newAuctionCancelledEvent = createAuctionCancelledEvent(
      id,
      auctionRef,
    );
    handleAuctionCancelled(newAuctionCancelledEvent);
  });

  afterAll(() => {
    clearStore();
  });

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AuctionCancelled created and stored", () => {
    assert.entityCount("AuctionCancelled", 1);

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AuctionCancelled",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "auctionRef",
      "1234567890",
    );

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  });
});
