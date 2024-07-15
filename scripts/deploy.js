const config = require("../deployment");
const execute = require("./execute");

// Update the manifest
require("./manifest");

const buildCommand = `graph build`;

console.log(`Building subgraph for ${config.TARGET_NETWORK}\n`);

execute(buildCommand);

const isGraphProtocol = config.USE_GRAPH_PROTOCOL;
const isGoldsky = config.GOLDSKY_DEPLOYMENTS.includes(config.TARGET_NETWORK);
const isMantle = config.MANTLE_DEPLOYMENTS.includes(config.TARGET_NETWORK);

let deployCommand;
let deployType;
if (isGraphProtocol) {
  deployCommand = require("./deploy-graph-protocol");
  deployType = "Graph Protocol";
}
else if (isGoldsky) {
  deployCommand = require("./deploy-goldsky");
  deployType = "GoldSky";
}
else if (isMantle) {
  deployCommand = require("./deploy-mantle");
  deployType = "Mantle";
}
else {
  deployCommand = require("./deploy-alchemy");
  deployType = "Alchemy";
}

console.log(
  `Deploying ${config.TARGET_NETWORK}/${config.VERSION} to ${deployType}\n`
);

execute(deployCommand);
