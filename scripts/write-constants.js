/**
 * This script overwrites src/constants.ts with the
 * addresses matching the NETWORK from '../config.js'
 */
const fs = require("fs");
const networks = require("../networks.json");
const config = require("../config");

const network = networks[config.NETWORK];

if (!network) {
  console.error("No network config found for: ", config.NETWORK);
  process.exit(1);
}

const addresses = {
  AUCTION_HOUSE_ADDRESS: network.AuctionHouse.address,
  EMPAM_ADDRESS: network.EncryptedMarginalPriceAuctionModule.address,
};

const data = Object.entries(addresses)
  .map(([key, address]) => `export const ${key} = "${address}";`)
  .join("\n");

fs.writeFile(__dirname + "/../src/constants.ts", data, (err) => {
  if (err) {
    console.error("  Error updating constants:", err);
  } else {
    console.log("  Addresses updated at src/constants.ts");
  }
});
