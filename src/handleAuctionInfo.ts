import { Bytes, dataSource, json, log } from "@graphprotocol/graph-ts";

import { AuctionInfo, AuctionInfoLink } from "../generated/schema";

export function handleAuctionInfo(content: Bytes): void {
  const auctionInfoRecord = new AuctionInfo(dataSource.stringParam());
  const value = json.fromBytes(content).toObject();
  if (value) {
    auctionInfoRecord.hash = dataSource.stringParam();

    const name = value.get("name");
    if (name) {
      auctionInfoRecord.name = name.toString();
    }

    const description = value.get("description");
    if (description) {
      auctionInfoRecord.description = description.toString();
    }

    // Skip allowlist for now

    auctionInfoRecord.save();

    log.info("AuctionInfo saved for hash: {}", [dataSource.stringParam()]);

    // Iterate over the links
    const links = value.get("links");
    if (links) {
      const linksEntries = links.toObject().entries;
      for (let i = 0; i < linksEntries.length; i++) {
        const link = linksEntries[i];
        const linkKey = link.key.toString();
        const linkValue = link.value.toString();

        // Create a new record
        const linkRecord = new AuctionInfoLink(
          dataSource.stringParam() + "-" + linkKey,
        );
        linkRecord.auctionInfo = dataSource.stringParam();
        linkRecord.title = linkKey;
        linkRecord.url = linkValue;
        linkRecord.save();

        log.info("AuctionInfoLink saved for hash: {}", [
          dataSource.stringParam() + "-" + linkKey,
        ]);
      }
    }
  }
}
