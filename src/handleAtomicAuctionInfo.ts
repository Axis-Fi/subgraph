import { Bytes, dataSource, json, log } from "@graphprotocol/graph-ts";

import {
  AtomicAuctionInfo,
  AtomicAuctionInfoAllowlistEntry,
  AtomicAuctionInfoLink,
} from "../generated/schema";
import {
  KEY_AUCTION_LOT_ID,
  KEY_LOG_INDEX,
  KEY_TRANSACTION_HASH,
} from "./constants";

export function handleAtomicAuctionInfo(content: Bytes): void {
  const ipfsHash = dataSource.stringParam();
  const auctionLotId = dataSource.context().getString(KEY_AUCTION_LOT_ID);
  const auctionInfoRecordId = `${ipfsHash}-${dataSource.context().getString(KEY_TRANSACTION_HASH)}-${dataSource.context().getString(KEY_LOG_INDEX)}`;
  const auctionInfoRecord = new AtomicAuctionInfo(auctionInfoRecordId);

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

    const key = value.get("key");
    if (key) {
      auctionInfoRecord.key = key.toString();
    }

    const tagline = value.get("tagline");
    if (tagline) {
      auctionInfoRecord.tagline = tagline.toString();
    }

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
        const linkRecordId = `${auctionInfoRecordId}-${linkKey}`;
        const linkRecord = new AtomicAuctionInfoLink(linkRecordId);
        linkRecord.auctionInfo = auctionInfoRecordId;
        linkRecord.linkId = linkKey;
        linkRecord.url = linkValue;
        linkRecord.save();

        log.info("AtomicAuctionInfoLink saved for hash: {}", [linkRecordId]);
      }
    }

    // Iterate over the allowlist
    const allowlist = value.get("allowlist");
    if (allowlist) {
      // Format: string[][]
      const allowlistArray = allowlist.toArray();
      for (let i = 0; i < allowlistArray.length; i++) {
        // Format: string[]
        const allowlistEntry = allowlistArray[i].toArray();

        // Create a new record
        const allowlistRecordId = `${auctionInfoRecordId}-${i.toString()}`;
        const allowlistRecord = new AtomicAuctionInfoAllowlistEntry(
          allowlistRecordId,
        );
        allowlistRecord.auctionInfo = auctionInfoRecordId;

        const valuesArray = new Array<string>(0);

        // Iterate over the allowlist entry
        // There is a flexible number of values in the allowlist entry, so we iterate over all of them
        for (let j = 0; j < allowlistEntry.length; j++) {
          const allowlistEntryValue = allowlistEntry[j].toString();
          valuesArray.push(allowlistEntryValue);
        }

        allowlistRecord.values = valuesArray;

        allowlistRecord.save();

        log.info(
          "BatchAuctionInfoAllowlistEntry saved for hash {} at index {}",
          [ipfsHash, i.toString()],
        );
      }
    }
  }
}
