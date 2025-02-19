import { BigInt, Bytes, dataSource, json, log } from "@graphprotocol/graph-ts";

import {
  BatchAuctionInfo,
  BatchAuctionInfoAllowlistEntry,
  BatchAuctionInfoLink,
} from "../generated/schema";
import {
  KEY_AUCTION_RECORD_ID,
  KEY_BLOCK_TIMESTAMP,
  KEY_LOG_INDEX,
  KEY_TRANSACTION_HASH,
} from "./constants";

export function handleBatchAuctionInfo(content: Bytes): void {
  const ipfsHash = dataSource.stringParam();
  log.info("Storing auction info from CID content {}", [ipfsHash]);

  const auctionRecordId = dataSource.context().getString(KEY_AUCTION_RECORD_ID);
  const auctionInfoRecordId = `${ipfsHash}-${dataSource.context().getString(KEY_TRANSACTION_HASH)}-${dataSource.context().getString(KEY_LOG_INDEX)}`;
  const auctionInfoRecord = new BatchAuctionInfo(auctionInfoRecordId);

  log.info("auctionInfoRecordId {}", [auctionInfoRecordId]);

  const eventBlockTimestamp = dataSource
    .context()
    .getString(KEY_BLOCK_TIMESTAMP);

  if (eventBlockTimestamp == null) {
    log.error(
      "Failed to parse BatchAuctionInfo: no blockTimestamp passed on the datacontext",
      []
    );
    return;
  }

  auctionInfoRecord.createdAt = BigInt.fromString(eventBlockTimestamp);

  auctionInfoRecord.lot = auctionRecordId;
  auctionInfoRecord.hash = ipfsHash;

  log.info("Parsing BatchAuctionInfo content for auction record {}", [
    auctionRecordId,
  ]);

  const valueResult = json.try_fromBytes(content);
  if (valueResult.isError) {
    log.error("Error parsing BatchAuctionInfo content", []);
    return;
  }

  const value = valueResult.value.toObject();
  if (value === null) {
    log.warning("No BatchAuctionInfo content found for hash: {}", [ipfsHash]);
    return;
  }

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
      const linkRecord = new BatchAuctionInfoLink(linkRecordId);
      linkRecord.auctionInfo = auctionInfoRecordId;
      linkRecord.linkId = linkKey;
      linkRecord.url = linkValue;
      linkRecord.save();

      log.info("BatchAuctionInfoLink saved for hash: {}", [linkRecordId]);
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
      const allowlistRecord = new BatchAuctionInfoAllowlistEntry(
        allowlistRecordId
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

      log.info("BatchAuctionInfoAllowlistEntry saved for hash {} at index {}", [
        ipfsHash,
        i.toString(),
      ]);
    }
  }

  auctionInfoRecord.save();
}
