require("dotenv").config();

/** The network to deploy the subgraph to
 * Must match files in @see networks.json */
const TARGET_NETWORK = process.env.TARGET_NETWORK || "berachain-mainnet";

const TARGET_PROVIDER = process.env.TARGET_PROVIDER || "alchemy";

/** The version that it'll be deployed as */
const VERSION = "1.0.6";

/** The base subgraph name shared by all chains*/
const BASE_NAME = "axis-origin";

/** The full subgraph slug eg: axis-origin-blast */
const SLUG = BASE_NAME + "-" + TARGET_NETWORK;

module.exports = {
  TARGET_PROVIDER,
  TARGET_NETWORK,
  VERSION,
  BASE_NAME,
  SLUG,
};
