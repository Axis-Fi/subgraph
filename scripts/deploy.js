const config = require("../deployment");
const execute = require("./execute");

// Update the manifest
require("./manifest");

const buildCommand = `graph build`;

console.log(`Building subgraph for ${config.TARGET_NETWORK}\n`);

execute(buildCommand);

const isGoldsky = config.GOLDSKY_DEPLOYMENTS.includes(config.TARGET_NETWORK);

const deployCommand = isGoldsky
  ? require("./deploy-goldsky")
  : require("./deploy-alchemy");

console.log(
  `Deploying ${config.TARGET_NETWORK}/${config.VERSION} to ${isGoldsky ? "GoldSky" : "Alchemy"}\n`
);

execute(deployCommand);
