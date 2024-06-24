import { Address, BigDecimal } from "@graphprotocol/graph-ts";
import { log } from "matchstick-as";

import { Redeemed } from "../generated/BatchLinearVesting/LinearVesting";
import { BatchLinearVestingRedeemed } from "../generated/schema";
import { toISO8601String } from "./helpers/date";
import { toDecimal } from "./helpers/number";
import { getOrCreateToken, getTokenBalance } from "./helpers/token";
import {
  getBalanceOf,
  getLinearVestingLot,
  getTokenDecimals,
  getTokenMetadata,
} from "./modules/batchLinearVesting";

export function handleRedeemed(event: Redeemed): void {
  // Get the BatchLinearVestingLot entity
  const lvLot = getLinearVestingLot(event.address, event.params.tokenId);

  // The derivative module can potentially be used by third parties, in which case it is ignored
  if (lvLot === null) {
    log.warning("BatchLinearVestingLot not found for tokenId {}. Skipping.", [
      event.params.tokenId.toString(),
    ]);
    return;
  }

  // Get token details
  const tokenDecimals = getTokenDecimals(event.address, event.params.tokenId);

  // Create a Redeemed entity
  const entity = new BatchLinearVestingRedeemed(
    lvLot.id +
      "-" +
      event.transaction.hash.toHexString() +
      "-" +
      event.logIndex.toString(),
  );

  entity.lot = lvLot.id;
  entity.bidder = event.params.owner;
  entity.redeemed = toDecimal(event.params.amount, tokenDecimals);
  entity.remaining = toDecimal(
    getBalanceOf(event.address, event.params.owner, event.params.tokenId),
    tokenDecimals,
  );

  // If there is a wrapped token, get that balance too
  const tokenMetadata = getTokenMetadata(event.address, event.params.tokenId);
  if (tokenMetadata.getWrapped() != Address.zero()) {
    // Get the decimals of the wrapped token
    const token = getOrCreateToken(tokenMetadata.getWrapped());

    // Get the balance of the wrapped token
    const wrappedBalance: BigDecimal = toDecimal(
      getTokenBalance(tokenMetadata.getWrapped(), event.params.owner),
      token.decimals,
    );

    // Add to the existing value
    entity.remaining = entity.remaining.plus(wrappedBalance);
  }

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.date = toISO8601String(event.block.timestamp);
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
