const execute = require("./execute");
const config = require("../deployment");

execute(`graph build --network ${config.TARGET_NETWORK}`);
