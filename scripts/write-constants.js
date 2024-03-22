const fs = require("fs");

const networks = require("../networks.json");

if (process.argv.length !== 3) {
  console.error("Usage: node write-constants.js <network-name>");
  process.exit(1);
}

//Network name gets provided as arg
const networkName = process.argv[2];
const network = networks[networkName];

if (!network) {
  console.error("No network config found for:", networkName);
  process.exit(1);
}

const data = `export const AUCTION_HOUSE_ADDRESS = "${network.AuctionHouse.address}";
export const EMPAM_ADDRESS = "${network.EncryptedMarginalPriceAuctionModule.address}";`;

fs.writeFile(__dirname + "/../src/constants.ts", data, (err) => {
  if (err) {
    console.error("  Error updating constants:", err);
  } else {
    console.log("  Addresses updated on source files");
  }
});
