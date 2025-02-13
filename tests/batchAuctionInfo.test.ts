import { BigInt, Bytes, DataSourceContext } from "@graphprotocol/graph-ts";
import { dataSourceMock, describe, log, test } from "matchstick-as";

import { BatchAuctionInfo, BatchAuctionLot } from "../generated/schema";
import {
  KEY_AUCTION_RECORD_ID,
  KEY_BLOCK_TIMESTAMP,
  KEY_LOG_INDEX,
  KEY_TRANSACTION_HASH,
} from "../src/constants";
import { handleBatchAuctionInfo } from "../src/handleBatchAuctionInfo";
import {
  assertBigIntEquals,
  assertI32Equals,
  assertStringEquals,
} from "./assert";

const CHAIN = "base-sepolia";
const AUCTION_HOUSE_ADDRESS = "0xbeef000000000000000000000000000000000000";
const AUCTION_LOT_ID = "1234";
const IPFS_HASH = "QmXW5rRfwt9YwWaJ3um57Menfy1UrwZbTbf4y3CztwQcA2";
const TRANSACTION_HASH = "0x1234";
const LOG_INDEX = "200223";
const BLOCK_TIMESTAMP = BigInt.fromString("1707264000");

describe("batchAuctionInfo", () => {
  test("should decode the auction info", () => {
    log.info("here1", []);

    // Create the JSON string
    const jsonString = `{
      "key": "test key",
      "name": "sample name",
      "description": "sample description",
      "tagline": "test tagline",
      "allowlist": [
        ["0x1234", "1111"]
      ],
      "links": {
        "link1": "url1"
      }
    }`;

    // Set the context
    const dataSourceContext = new DataSourceContext();
    const lotRecordId =
      CHAIN + "-" + AUCTION_HOUSE_ADDRESS + "-" + AUCTION_LOT_ID;

    dataSourceContext.setString(
      KEY_BLOCK_TIMESTAMP,
      BLOCK_TIMESTAMP.toString()
    );
    dataSourceContext.setString(KEY_AUCTION_RECORD_ID, lotRecordId);
    dataSourceContext.setString(KEY_TRANSACTION_HASH, TRANSACTION_HASH);
    dataSourceContext.setString(KEY_LOG_INDEX, LOG_INDEX);

    // dataSource.stringParam() uses the value of dataSource.address()
    dataSourceMock.setReturnValues(IPFS_HASH, CHAIN, dataSourceContext);

    // Call the handler
    handleBatchAuctionInfo(Bytes.fromUTF8(jsonString));

    // Assert values
    const auctionInfoRecordId = `${IPFS_HASH}-${TRANSACTION_HASH}-${LOG_INDEX}`;
    const auctionInfoRecord = BatchAuctionInfo.load(auctionInfoRecordId);
    if (auctionInfoRecord == null) {
      throw new Error("Expected BatchAuctionInfo to be saved");
    }

    assertStringEquals(auctionInfoRecord.hash, IPFS_HASH, "IPFS hash");
    assertStringEquals(auctionInfoRecord.lot, lotRecordId, "auction lot ID");

    assertStringEquals(auctionInfoRecord.name, "sample name", "name");
    assertStringEquals(
      auctionInfoRecord.description,
      "sample description",
      "description"
    );
    assertStringEquals(auctionInfoRecord.key, "test key", "key");
    assertStringEquals(auctionInfoRecord.tagline, "test tagline", "tagline");

    // Assert links
    const recordLinks = auctionInfoRecord.links.load();
    assertI32Equals(recordLinks.length, 1, "links length");
    // Ordering is wonky, so we only test a single element
    assertStringEquals(recordLinks[0].linkId, "link1", "link1 id");
    assertStringEquals(recordLinks[0].url, "url1", "link1 URL");

    // Assert allowlist
    const recordAllowlist = auctionInfoRecord.allowlist.load();
    assertI32Equals(recordAllowlist.length, 1, "allowlist length");
    // Ordering is wonky, so we only test a single element
    assertStringEquals(
      recordAllowlist[0].values[0],
      "0x1234",
      "allowlist address 1"
    );
    assertStringEquals(
      recordAllowlist[0].values[1],
      "1111",
      "allowlist amount 1"
    );
    assertI32Equals(
      recordAllowlist[0].values.length,
      2,
      "allowlist entry 1 length"
    );

    assertI32Equals(recordAllowlist.length, 1, "allowlist length");

    assertBigIntEquals(
      auctionInfoRecord.createdAt,
      BLOCK_TIMESTAMP,
      "info createdAt should match block timestamp"
    );
  });
});
