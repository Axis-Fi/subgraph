const config = require("../deployment");
const execute = require("./execute");

// Update the manifest
require("./manifest");

const buildCommand = `graph build`;

console.log(`Building subgraph for ${config.TARGET_NETWORK}\n`);

execute(buildCommand);

let deployCommand;
let deployType;
if (config.TARGET_PROVIDER === "graph") {
  deployCommand = require("./deploy-graph-protocol");
  deployType = "Graph Protocol";
} else if (config.TARGET_PROVIDER === "goldsky") {
  deployCommand = require("./deploy-goldsky");
  deployType = "GoldSky";
} else if (config.TARGET_PROVIDER === "mantle") {
  deployCommand = require("./deploy-mantle");
  deployType = "Mantle";
} else if (config.TARGET_PROVIDER === "alchemy") {
  deployCommand = require("./deploy-alchemy");
  deployType = "Alchemy";
}

console.log(
  `Deploying ${config.TARGET_NETWORK}/${config.VERSION} to ${deployType}\n`
);

execute(deployCommand);
