const config = require("../deployment");
const execute = require("./execute");

const isGoldsky = config.GOLDSKY_DEPLOYMENTS.includes(config.TARGET_NETWORK);

const buildCommand = `graph build --network=${config.TARGET_NETWORK}`;

console.log(`Building subgraph for ${config.TARGET_NETWORK}\n`);

execute(buildCommand);

const deployCommand = isGoldsky
  ? require("./deploy-goldsky")
  : require("./deploy-alchemy");

console.log(
  `Deploying ${config.TARGET_NETWORK}/${config.VERSION} to ${isGoldsky ? "GoldSky" : "Alchemy"}\n`
);

execute(deployCommand);
