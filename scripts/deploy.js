const config = require("../deployment");
const execute = require("./execute");

// Update the manifest
require("./manifest");

const buildCommand = `graph build`;

console.log(`Building subgraph for ${config.TARGET_NETWORK}\n`);

execute(buildCommand);

const isGraphProtocol = config.USE_GRAPH_PROTOCOL;
const isGoldsky = config.GOLDSKY_DEPLOYMENTS.includes(config.TARGET_NETWORK);

const deployCommand = isGraphProtocol ?
  require("./deploy-graph-protocol") :
  isGoldsky
    ? require("./deploy-goldsky")
    : require("./deploy-alchemy");

console.log(
  `Deploying ${config.TARGET_NETWORK}/${config.VERSION} to ${isGraphProtocol ? "Graph Protocol" : isGoldsky ? "GoldSky" : "Alchemy"}\n`
);

execute(deployCommand);
