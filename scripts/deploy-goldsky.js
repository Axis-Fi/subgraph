const config = require("../deployment");

const slug = config.SLUG + "/" + config.VERSION;
const command = `goldsky subgraph deploy ${slug}`;

module.exports = command;
