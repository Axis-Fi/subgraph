require("dotenv").config();

/** The network to deploy the subgraph to
 * Must match files in @see networks.json */
const NETWORK = process.env.NETWORK || "berachain-mainnet";

const PROVIDER = process.env.PROVIDER || "alchemy";

/** The version that it'll be deployed as */
const VERSION = process.env.VERSION ?? "1.0.7";

/** The base subgraph name shared by all chains*/
const BASE_NAME = "axis-origin";

/** The full subgraph slug eg: axis-origin-blast */
const SLUG = BASE_NAME + "-" + NETWORK;

module.exports = {
  PROVIDER,
  NETWORK,
  VERSION,
  BASE_NAME,
  SLUG,
};
