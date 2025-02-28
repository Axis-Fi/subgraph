require("dotenv").config();

/** The network to deploy the subgraph to
 * Must match files in @see networks.json */
const TARGET_NETWORK = process.env.TARGET_NETWORK || "berachain-mainnet";

const USE_GRAPH_PROTOCOL = process.env.USE_GRAPH_PROTOCOL == "true" || false;

/** The version that will it'll be deployed as */
const VERSION = "1.0.5";

/**  Deployments to be deployed to Goldsky
 * otherwise they're deployed to Alchemy Subgraphs */
const GOLDSKY_DEPLOYMENTS = [
  "arbitrum-one",
  "arbitrum-sepolia",
  "base",
  "base-sepolia",
  "berachain-mainnet",
  "berachain-bartio",
  "blast",
  "blast-sepolia",
  "mantle",
  "mantle-sepolia",
  "mode-mainnet",
  "mode-testnet",
];

const MANTLE_DEPLOYMENTS = [];

/** The base subgraph name shared by all chains*/
const BASE_NAME = "axis-origin";

/** The full subgraph slug eg: axis-origin-blast */
const SLUG = BASE_NAME + "-" + TARGET_NETWORK;

module.exports = {
  GOLDSKY_DEPLOYMENTS,
  MANTLE_DEPLOYMENTS,
  USE_GRAPH_PROTOCOL,
  TARGET_NETWORK,
  VERSION,
  BASE_NAME,
  SLUG,
};
