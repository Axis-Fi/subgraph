import {
  BigInt,
  Bytes,
  dataSource,
  json,
  JSONValueKind,
  log,
} from "@graphprotocol/graph-ts";

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
      [],
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

  const allowlist = value.get("allowlist");

  // Early exit if allowlist is missing or null
  if (!allowlist || allowlist.isNull()) {
    log.warning("No allowlist found for auctionInfoRecordId {}", [
      auctionInfoRecordId,
    ]);
    auctionInfoRecord.save();
    return;
  }

  // Check if allowlist is an array using JSONValueKind
  if (!allowlist.kind || allowlist.kind !== JSONValueKind.ARRAY) {
    log.error(
      "Allowlist is not an array for auctionInfoRecordId {}, got kind {}",
      [
        auctionInfoRecordId,
        allowlist.kind ? allowlist.kind.toString() : "unknown",
      ],
    );
    auctionInfoRecord.save();
    return;
  }

  const allowlistArray = allowlist.toArray();
  if (allowlistArray.length === 0) {
    log.info("Allowlist is empty for auctionInfoRecordId {}", [
      auctionInfoRecordId,
    ]);
    auctionInfoRecord.save();
    return;
  }

  // Iterate over the allowlist array and handle variable-length inner arrays
  for (let i = 0; i < allowlistArray.length; i++) {
    const allowlistEntry = allowlistArray[i];

    // Check if the entry exists, is not null, and is an array
    if (
      !allowlistEntry ||
      allowlistEntry.isNull() ||
      allowlistEntry.kind !== JSONValueKind.ARRAY
    ) {
      log.warning(
        "Invalid or non-array allowlist entry at index {} for hash {}",
        [i.toString(), ipfsHash],
      );
      continue;
    }

    const allowlistSubArray = allowlistEntry.toArray();
    if (allowlistSubArray.length === 0) {
      log.warning("Empty allowlist entry at index {} for hash {}", [
        i.toString(),
        ipfsHash,
      ]);
      continue;
    }

    // Create a new record
    const allowlistRecordId = auctionInfoRecordId + "-" + i.toString();
    const allowlistRecord = new BatchAuctionInfoAllowlistEntry(
      allowlistRecordId,
    );
    allowlistRecord.auctionInfo = auctionInfoRecordId;

    const valuesArray = new Array<string>(0);

    // Process the inner array, handling both [addr] and [addr, amount]
    for (let j = 0; j < allowlistSubArray.length; j++) {
      const allowlistEntryValue = allowlistSubArray[j];

      // Handle null or invalid values
      if (!allowlistEntryValue || allowlistEntryValue.isNull()) {
        log.warning(
          "Null or undefined value at index {} in entry {} for hash {}",
          [j.toString(), i.toString(), ipfsHash],
        );
        valuesArray.push(""); // Fallback to empty string
        continue;
      }

      // Convert to string safely (assuming addresses and amounts are strings or can be converted)
      const stringValue = allowlistEntryValue.toString();
      valuesArray.push(stringValue);
    }

    // Only save if we have valid values
    if (valuesArray.length > 0) {
      allowlistRecord.values = valuesArray;
      allowlistRecord.save();

      log.info("BatchAuctionInfoAllowlistEntry saved for hash {} at index {}", [
        ipfsHash,
        i.toString(),
      ]);
    } else {
      log.warning(
        "No valid values in allowlist entry at index {} for hash {}, skipping save",
        [i.toString(), ipfsHash],
      );
    }
  }

  auctionInfoRecord.save();
}
