const config = require("../config");
const Mustache = require("mustache");
const allNetworkValues = require("../networks.json");
const { readFileSync, writeFileSync } = require("fs");

// Read the values from the networks.json file
const networkValues = allNetworkValues[config.NETWORK];
if (!networkValues) {
  throw new Error(
    `No network values found in networks.json for ${config.NETWORK}`
  );
}

// Add a "network" key
networkValues.network = config.NETWORK;

console.log(`Generating subgraph.yaml for ${config.NETWORK}\n`);

// Read the subgraph template
const subgraphTemplate = readFileSync("subgraph-template.yaml").toString();

// Render the template with the network values
let templatedSubgraphManifest = Mustache.render(
  subgraphTemplate,
  networkValues
);

let replacements = [];

/**
 * Providers use differing chain names.
 **/
// If using the Graph Protocol, ensure the network name is correct
if (config.PROVIDER === "graph") {
  // mode-testnet becomes mode-sepolia etc.
  replacements = [
    [/mode-testnet/g, "mode-sepolia"],
    [/blast-sepolia/g, "blast-testnet"],
  ];
} else if (config.PROVIDER === "alchemy") {
  // blast becomes blast-mainnet etc.
  replacements = [
    [/blast(?!-)/g, "blast-mainnet"],
    [/mantle(?!-)/g, "mantle-mainnet"],
  ];
}

replacements.forEach(
  ([s, r]) =>
    (templatedSubgraphManifest = templatedSubgraphManifest.replace(s, r))
);

// Write to file
writeFileSync("subgraph.yaml", templatedSubgraphManifest);
