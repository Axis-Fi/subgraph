const { spawn } = require("child_process");

/** Spawns, executs and logs a process from a command*/
module.exports = function (command) {
  spawn(command, { shell: true, stdio: ["inherit", "inherit", "inherit"] });
};
