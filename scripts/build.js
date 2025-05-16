const execute = require("./execute");
const config = require("../config");

execute(`graph build --network ${config.NETWORK}`);
