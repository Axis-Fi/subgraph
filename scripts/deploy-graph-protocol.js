require("dotenv").config();
const config = require("../deployment");

const deployKey = process.env.GRAPH_STUDIO_TOKEN;

if (!deployKey) {
  console.error("Error: .env is missing GRAPH_STUDIO_TOKEN");
  process.exit(1);
}

const command = `graph deploy ${config.SLUG} \
  --version-label v${config.VERSION} \
  --deploy-key ${deployKey} \
  --studio`;

module.exports = command;
