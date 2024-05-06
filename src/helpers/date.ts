import { BigInt } from "@graphprotocol/graph-ts";

export function toISO8601String(timestamp: BigInt): string {
  return new Date(timestamp.toI64() * 1000).toISOString();
}
