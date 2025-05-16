const networks = require("../networks.json");
const execute = require("./execute");

const deployAll = () => {
  for (const networkName in networks) {
    const codegenCmd = `NETWORK=${networkName} pnpm codegen`;
    execute(codegenCmd);

    const deployCmd = `NETWORK=${networkName} pnpm deploy:graph`;
    execute(deployCmd);
  }
};

deployAll();
