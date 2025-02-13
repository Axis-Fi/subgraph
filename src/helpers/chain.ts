import { dataSource, log } from "@graphprotocol/graph-ts";

// Map to adjust chain names
const CHAIN_NAME_MAP = new Map<string, string>();
CHAIN_NAME_MAP.set("mode-sepolia", "mode-testnet");
CHAIN_NAME_MAP.set("blast-testnet", "blast-sepolia");

export function getChain(): string {
  const chainId = dataSource.network();
  log.info("Network ID from dataSource: {}", [chainId]);

  // Different providers have inconsistent chain names, so we adjust for that
  if (CHAIN_NAME_MAP.has(chainId)) {
    return CHAIN_NAME_MAP.get(chainId) || chainId;
  }

  return chainId;
}
