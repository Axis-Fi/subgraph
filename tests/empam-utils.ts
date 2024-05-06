import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as";

import { BidDecrypted } from "../generated/BatchAuctionHouse/EncryptedMarginalPrice";

export function createBidDecryptedEvent(
  lotId: BigInt,
  bidId: BigInt,
  amountIn: BigInt,
  amountOut: BigInt,
): BidDecrypted {
  const bidDecryptedEvent = changetype<BidDecrypted>(newMockEvent());

  bidDecryptedEvent.parameters = [];

  bidDecryptedEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(lotId)),
  );
  bidDecryptedEvent.parameters.push(
    new ethereum.EventParam("bidId", ethereum.Value.fromUnsignedBigInt(bidId)),
  );
  bidDecryptedEvent.parameters.push(
    new ethereum.EventParam(
      "amountIn",
      ethereum.Value.fromUnsignedBigInt(amountIn),
    ),
  );
  bidDecryptedEvent.parameters.push(
    new ethereum.EventParam(
      "amountOut",
      ethereum.Value.fromUnsignedBigInt(amountOut),
    ),
  );

  return bidDecryptedEvent;
}
