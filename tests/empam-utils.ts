import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";

import {
  BidDecrypted,
  PrivateKeySubmitted,
} from "../generated/BatchAuctionHouse/EncryptedMarginalPrice";
import { newMockEvent } from "./mocks/event";

export function createBidDecryptedEvent(
  auctionModule: Address,
  lotId: BigInt,
  bidId: BigInt,
  amountIn: BigInt,
  amountOut: BigInt | null,
): BidDecrypted {
  const bidDecryptedEvent = changetype<BidDecrypted>(
    newMockEvent(auctionModule),
  );

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
  if (amountOut !== null) {
    bidDecryptedEvent.parameters.push(
      new ethereum.EventParam(
        "amountOut",
        ethereum.Value.fromUnsignedBigInt(amountOut),
      ),
    );
  }

  return bidDecryptedEvent;
}

export function createPrivateKeySubmittedEvent(
  auctionModule: Address,
  lotId: BigInt,
): PrivateKeySubmitted {
  const privateKeySubmittedEvent = changetype<PrivateKeySubmitted>(
    newMockEvent(auctionModule),
  );

  privateKeySubmittedEvent.parameters = [];

  privateKeySubmittedEvent.parameters.push(
    new ethereum.EventParam("lotId", ethereum.Value.fromUnsignedBigInt(lotId)),
  );

  return privateKeySubmittedEvent;
}
