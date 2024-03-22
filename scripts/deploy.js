const config = require("../deployment");
const execute = require("./execute");

const isGoldsky = config.GOLDSKY_DEPLOYMENTS.includes(config.TARGET_NETWORK);

const command = isGoldsky
  ? require("./deploy-goldsky")
  : require("./deploy-alchemy");

console.log(
  `Deploying ${config.TARGET_NETWORK}/${config.VERSION} to ${isGoldsky ? "GoldSky" : "Alchemy"}\n`
);

execute(command);
