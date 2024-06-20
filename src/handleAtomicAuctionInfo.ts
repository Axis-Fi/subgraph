import { Bytes, dataSource, json, log } from "@graphprotocol/graph-ts";

import { AtomicAuctionInfo, AtomicAuctionInfoLink } from "../generated/schema";
import { KEY_AUCTION_LOT_ID } from "./constants";

export function handleAtomicAuctionInfo(content: Bytes): void {
  const ipfsHash = dataSource.stringParam();
  const auctionLotId = dataSource.context().getString(KEY_AUCTION_LOT_ID);
  const auctionInfoRecord = new AtomicAuctionInfo(ipfsHash);

  const value = json.fromBytes(content).toObject();
  if (value) {
    auctionInfoRecord.hash = ipfsHash;
    auctionInfoRecord.lot = auctionLotId;

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

    log.info("AtomicAuctionInfo saved for hash: {}", [ipfsHash]);

    // Iterate over the links
    const links = value.get("links");
    if (links) {
      const linksEntries = links.toObject().entries;
      for (let i = 0; i < linksEntries.length; i++) {
        const link = linksEntries[i];
        const linkKey = link.key.toString();
        const linkValue = link.value.toString();

        // Create a new record
        const linkRecordId = ipfsHash + "-" + linkKey;
        const linkRecord = new AtomicAuctionInfoLink(linkRecordId);
        linkRecord.auctionInfo = ipfsHash;
        linkRecord.title = linkKey;
        linkRecord.url = linkValue;
        linkRecord.save();

        log.info("AtomicAuctionInfoLink saved for hash: {}", [linkRecordId]);
      }
    }
  }
}
