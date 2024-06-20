import { Bytes, dataSource, json } from "@graphprotocol/graph-ts";

import { AuctionInfo } from "../generated/schema";

export function handleAuctionInfo(content: Bytes): void {
  const auctionInfoRecord = new AuctionInfo(dataSource.stringParam());
  const value = json.fromBytes(content).toObject();
  if (value) {
    const name = value.get("name");
    if (name) {
      auctionInfoRecord.name = name.toString();
    }

    const description = value.get("description");
    if (description) {
      auctionInfoRecord.description = description.toString();
    }

    auctionInfoRecord.save();
  }
}
