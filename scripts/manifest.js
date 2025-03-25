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

let replacements = [];

// If using the Graph Protocol, ensure the network name is correct
if (config.TARGET_PROVIDER === "graph") {
  // mode-testnet becomes mode-sepolia etc.
  replacements = [
    [/mode-testnet/g, "mode-sepolia"],
    [/blast-sepolia/g, "blast-testnet"],
  ];
} else if (config.TARGET_PROVIDER === "alchemy") {
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
