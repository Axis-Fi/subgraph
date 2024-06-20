import { Bytes, DataSourceContext } from "@graphprotocol/graph-ts";
import { dataSourceMock, describe, test } from "matchstick-as";

import { BatchAuctionInfo } from "../generated/schema";
import { KEY_AUCTION_LOT_ID } from "../src/constants";
import { handleBatchAuctionInfo } from "../src/handleBatchAuctionInfo";
import { assertI32Equals, assertStringEquals } from "./assert";

const AUCTION_LOT_ID = "1234";
const IPFS_HASH = "QmXW5rRfwt9YwWaJ3um57Menfy1UrwZbTbf4y3CztwQcA2";

describe("batchAuctionInfo", () => {
  test("should decode the auction info", () => {
    // Create the JSON string
    const jsonString = `{
      "name": "sample name",
      "description": "sample description",
      "allowlist": [
        ["0x1234", "1111"]
      ],
      "links": {
        "link1": "url1"
      }
    }`;

    // Set the context
    const dataSourceContext = new DataSourceContext();
    dataSourceContext.setString(KEY_AUCTION_LOT_ID, AUCTION_LOT_ID);
    // dataSource.stringParam() uses the value of dataSource.address()
    dataSourceMock.setReturnValues(IPFS_HASH, "mainnet", dataSourceContext);

    // Call the handler
    handleBatchAuctionInfo(Bytes.fromUTF8(jsonString));

    // Assert values
    const auctionInfoRecord = BatchAuctionInfo.load(IPFS_HASH);
    if (auctionInfoRecord == null) {
      throw new Error("Expected BatchAuctionInfo to be saved");
    }

    assertStringEquals(auctionInfoRecord.hash, IPFS_HASH, "IPFS hash");
    assertStringEquals(auctionInfoRecord.lot, AUCTION_LOT_ID, "auction lot ID");
    assertStringEquals(auctionInfoRecord.name, "sample name", "name");
    assertStringEquals(
      auctionInfoRecord.description,
      "sample description",
      "description",
    );

    // Assert links
    const recordLinks = auctionInfoRecord.links.load();
    // Ordering is wonky, so we only test a single element
    assertStringEquals(recordLinks[0].title, "link1", "link1 title");
    assertStringEquals(recordLinks[0].url, "url1", "link1 URL");

    // Assert allowlist
    const recordAllowlist = auctionInfoRecord.allowlist.load();
    // Ordering is wonky, so we only test a single element
    assertStringEquals(
      recordAllowlist[0].values[0],
      "0x1234",
      "allowlist address 1",
    );
    assertStringEquals(
      recordAllowlist[0].values[1],
      "1111",
      "allowlist amount 1",
    );
    assertI32Equals(
      recordAllowlist[0].values.length,
      2,
      "allowlist entry 1 length",
    );

    assertI32Equals(recordAllowlist.length, 1, "allowlist length");
  });
});
