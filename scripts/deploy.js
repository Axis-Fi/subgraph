const config = require("../deployment");
const execute = require("./execute");
const Mustache = require("mustache");

// Read the values from the networks.json file
const allNetworkValues = require("../networks.json");
const { readFileSync, writeFileSync } = require("fs");
const networkValues = allNetworkValues[config.TARGET_NETWORK];
if (!networkValues) {
  throw new Error(`No network values found in networks.json for ${config.TARGET_NETWORK}`);
}

// Add a "network" key
networkValues.network = config.TARGET_NETWORK;

console.log(`Generating subgraph.yaml for ${config.TARGET_NETWORK}\n`);

// Read the subgraph template
const subgraphTemplate = readFileSync("subgraph-template.yaml").toString();

// Render the template with the network values
const templatedSubgraphManifest = Mustache.render(subgraphTemplate, networkValues);

// Write to file
writeFileSync("subgraph.yaml", templatedSubgraphManifest);

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

// TODO enable
// execute(deployCommand);
