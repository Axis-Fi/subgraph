import { BigInt } from "@graphprotocol/graph-ts";

export function getBidId(lotId: BigInt, bidId: BigInt): string {
    return lotId.toString().concat("-").concat(bidId.toString());
}
