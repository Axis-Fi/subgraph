const { spawnSync } = require("child_process");

/** Spawns, executes and logs a process from a command*/
module.exports = function (command) {
  spawnSync(command, { shell: true, stdio: ["inherit", "inherit", "inherit"] });
};
