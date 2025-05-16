/**
 * Script for alchemy subgraph deployment
 * Usage: pnpm deploy-graph <name> <version> <deployKey>
 * Example: pnpm deploy-graph base-sepolia 0.0.7 d3710yk31
 * */
require("dotenv").config();
const config = require("../config");

const node = "https://subgraphs.alchemy.com/api/subgraphs/deploy";
const ipfs = "https://ipfs.satsuma.xyz";

const deployKey = process.env.ALCHEMY_DEPLOY_KEY;

if (!deployKey) {
  console.error("Error: .env is missing ALCHEMY_DEPLOY_KEY");
  process.exit(1);
}

const command = `graph deploy ${config.SLUG} \
  --version-label v${config.VERSION} \
  --node ${node} \
  --deploy-key ${deployKey} \
  --ipfs ${ipfs} \ `;

module.exports = command;
