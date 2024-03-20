import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import { BidDecrypted } from "../generated/EncryptedMarginalPriceAuctionModule/EncryptedMarginalPriceAuctionModule";

export function createBidDecryptedEvent(
  lotId: BigInt,
  bidId: BigInt,
  amountIn: BigInt,
  amountOut: BigInt,
): BidDecrypted {
  let bidDecryptedEvent = changetype<BidDecrypted>(newMockEvent());

  bidDecryptedEvent.parameters = new Array();

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
