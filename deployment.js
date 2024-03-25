/** The network to deploy the subgraph to
 * Must match files in @see networks.json */
const TARGET_NETWORK = "arbitrum-sepolia";

/** The version that will it'll be deployed as */
const VERSION = "0.0.24";

/**  Deployments to be deployed to Goldsky
 * otherwise they're deployed to Alchemy Subgraphs */
const GOLDSKY_DEPLOYMENTS = ["mode-testnet", "blast-sepolia"];

/** The base subgraph name shared by all chains*/
const BASE_NAME = "axis-origin";

/** The full subgraph slug eg: axis-origin-blast */
const SLUG = BASE_NAME + "-" + TARGET_NETWORK;

module.exports = {
  GOLDSKY_DEPLOYMENTS,
  TARGET_NETWORK,
  VERSION,
  BASE_NAME,
  SLUG,
};
