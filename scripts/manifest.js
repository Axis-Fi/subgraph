const config = require("../deployment");
const Mustache = require("mustache");
const allNetworkValues = require("../networks.json");
const { readFileSync, writeFileSync } = require("fs");

// Read the values from the networks.json file
const networkValues = allNetworkValues[config.TARGET_NETWORK];
if (!networkValues) {
  throw new Error(
    `No network values found in networks.json for ${config.TARGET_NETWORK}`
  );
}

// Add a "network" key
networkValues.network = config.TARGET_NETWORK;

console.log(`Generating subgraph.yaml for ${config.TARGET_NETWORK}\n`);

// Read the subgraph template
const subgraphTemplate = readFileSync("subgraph-template.yaml").toString();

// Render the template with the network values
let templatedSubgraphManifest = Mustache.render(
  subgraphTemplate,
  networkValues
);

// If using the Graph Protocol, ensure the network name is correct
if (config.USE_GRAPH_PROTOCOL) {
  // mode-testnet becomes mode-sepolia
  templatedSubgraphManifest = templatedSubgraphManifest.replace(
    /mode-testnet/g,
    "mode-sepolia"
  );

  // blast-sepolia becomes blast-testnet
  templatedSubgraphManifest = templatedSubgraphManifest.replace(
    /blast-sepolia/g,
    "blast-testnet"
  );
}

// Write to file
writeFileSync("subgraph.yaml", templatedSubgraphManifest);
