import { DataSourceContext, log } from "@graphprotocol/graph-ts";

import { AuctionRegistered as AuctionRegisteredEvent } from "../generated/MetadataRegistry/MetadataRegistry";
import { BatchAuctionLot } from "../generated/schema";
import { BatchAuctionInfo } from "../generated/templates";
import {
  KEY_AUCTION_RECORD_ID,
  KEY_BLOCK_TIMESTAMP,
  KEY_LOG_INDEX,
  KEY_TRANSACTION_HASH,
} from "./constants";
import { getLotRecordId } from "./helpers/batchAuction";

export function handleAuctionRegistered(event: AuctionRegisteredEvent): void {
  const lotId = event.params.lotId;
  const ipfsCid = event.params.ipfsCID;

  log.info(
    "Processing metadata update. AuctionHouse: {}, LotId: {}, IPFS: {}",
    [event.params.auctionHouse.toHexString(), lotId.toString(), ipfsCid],
  );

  const recordId = getLotRecordId(event.params.auctionHouse, lotId);
  log.info("Received recordId: {}", [recordId.toString()]);

  const auctionLot = BatchAuctionLot.load(recordId);

  if (auctionLot == null) {
    log.error("Could not find auction lot with id {}", [recordId]);
    return;
  }

  auctionLot.infoHash = ipfsCid;
  auctionLot.save();

  const dataSourceContext = new DataSourceContext();

  dataSourceContext.setString(KEY_AUCTION_RECORD_ID, recordId);
  dataSourceContext.setString(KEY_LOG_INDEX, event.logIndex.toString());
  dataSourceContext.setString(
    KEY_BLOCK_TIMESTAMP,
    event.block.timestamp.toString(),
  );
  dataSourceContext.setString(
    KEY_TRANSACTION_HASH,
    event.transaction.hash.toHexString(),
  );

  BatchAuctionInfo.createWithContext(ipfsCid, dataSourceContext);

  log.info("Metadata update processed for recordId {} with new IPFS CID {}", [
    recordId,
    ipfsCid,
  ]);
}
