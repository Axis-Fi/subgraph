/**
 * Script for Mantle subgraph deployment
 * */
require("dotenv").config();
const config = require("../deployment");

const node = "https://subgraph-api.mantle.xyz/deploy";
const ipfs = "https://subgraph-api.mantle.xyz/ipfs";

const deployKey = process.env.MANTLE_DEPLOY_KEY;

if (!deployKey) {
  console.error("Error: .env is missing MANTLE_DEPLOY_KEY");
  process.exit(1);
}

const command = `graph deploy ${config.SLUG} \
  --version-label v${config.VERSION} \
  --node ${node} \
  --deploy-key ${deployKey} \
  --ipfs ${ipfs} \ `;

module.exports = command;
