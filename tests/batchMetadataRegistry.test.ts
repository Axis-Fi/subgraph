import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  assert,
  beforeEach,
  clearStore,
  dataSourceMock,
  describe,
  test,
} from "matchstick-as";

import { AuctionRegistered } from "../generated/MetadataRegistry/MetadataRegistry";
import {
  BatchAuctionCreated,
  BatchAuctionLot,
  BatchFixedPriceLot,
} from "../generated/schema";
import { handleAuctionRegistered } from "../src/batchMetadataRegistry";
import { assertStringEquals } from "./assert";
import {
  _createAuctionLot,
  auctionHouse,
  LOT_ID,
} from "./batchAuctionHouse-fpb.test";
import { getBatchAuctionLot } from "./helpers/records";
import {
  defaultLogIndex,
  defaultTransactionHash,
  newMockEvent,
} from "./mocks/event";

const NETWORK_CHAIN = "mainnet";
const METADATA_REGISTRY_ADDRESS = Address.fromString(
  "0x3ae8dD1ee2752883459C4c33c2f7Aeb8a56669f0"
);
const AUCTION_HOUSE_ADDRESS = auctionHouse;
const AUCTION_LOT_ID = LOT_ID;
const IPFS_CID = "MOCK_NEW_IPFS_CID";
const BLOCK_TIMESTAMP = BigInt.fromString("1707264000");
const AUCTION_RECORD_ID =
  NETWORK_CHAIN +
  "-" +
  AUCTION_HOUSE_ADDRESS.toHexString() +
  "-" +
  AUCTION_LOT_ID.toString();

function createAuctionRegisteredEvent(): AuctionRegistered {
  const event = changetype<AuctionRegistered>(
    newMockEvent(METADATA_REGISTRY_ADDRESS)
  );

  event.block.timestamp = BLOCK_TIMESTAMP;

  event.parameters = [
    new ethereum.EventParam(
      "auctionHouse",
      ethereum.Value.fromAddress(AUCTION_HOUSE_ADDRESS)
    ),
    new ethereum.EventParam(
      "lotId",
      ethereum.Value.fromUnsignedBigInt(AUCTION_LOT_ID)
    ),
    new ethereum.EventParam("ipfsCID", ethereum.Value.fromString(IPFS_CID)),
  ];

  return event;
}

function setChain(chain: string): void {
  dataSourceMock.setNetwork(chain);
}

describe("MetadataRegistry", () => {
  beforeEach(() => {
    clearStore();
    setChain(NETWORK_CHAIN);
  });

  describe("handleAuctionRegistered()", () => {
    test("updates the lot infoHash and sets createdAt", () => {
      _createAuctionLot();

      const auctionRecordId =
        "mainnet-" +
        auctionHouse.toHexString() +
        "-" +
        AUCTION_LOT_ID.toString();

      const recordId = defaultTransactionHash
        .concatI32(defaultLogIndex.toI32())
        .concatI32(AUCTION_LOT_ID.toI32());

      assert.entityCount("BatchAuctionCreated", 1);

      const batchAuctionCreatedRecord = BatchAuctionCreated.load(recordId);
      if (batchAuctionCreatedRecord === null) {
        throw new Error(
          "Expected BatchAuctionCreated to exist for lot id " +
            AUCTION_LOT_ID.toString() +
            " at record id " +
            recordId.toHexString()
        );
      }
      assert.entityCount("BatchAuctionLot", 1);

      getBatchAuctionLot(auctionRecordId);

      assert.entityCount("BatchFixedPriceLot", 1);

      const fpbLotRecord = BatchFixedPriceLot.load(auctionRecordId);
      if (fpbLotRecord === null) {
        throw new Error(
          "Expected BatchFixedPriceLot to exist for record id " +
            auctionRecordId
        );
      }

      const event = createAuctionRegisteredEvent();

      handleAuctionRegistered(event);

      const updatedLot = BatchAuctionLot.load(AUCTION_RECORD_ID);

      if (updatedLot === null) {
        throw new Error("Lot not found after update");
      }

      assertStringEquals(
        updatedLot.infoHash,
        IPFS_CID,
        "lot infoHash should be updated"
      );
    });
  });
});
