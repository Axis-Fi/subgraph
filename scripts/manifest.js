const config = require("../deployment");
const Mustache = require("mustache");
const allNetworkValues = require("../networks.json");
const { readFileSync, writeFileSync } = require("fs");

// Read the values from the networks.json file
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
