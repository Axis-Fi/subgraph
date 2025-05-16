const config = require("../config");
const execute = require("./execute");

// Update the manifest
require("./write-manifest");

const buildCommand = `graph build`;

console.log(`Building subgraph for ${config.NETWORK}\n`);

execute(buildCommand);

const deployCommand = require(`./deploy-${config.PROVIDER}`);

console.log(
  `Deploying ${config.NETWORK}/${config.VERSION} to ${config.PROVIDER}\n`
);

execute(deployCommand);
