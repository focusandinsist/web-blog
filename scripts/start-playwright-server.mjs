import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const astroCli = path.join(root, "node_modules", "astro", "bin", "astro.mjs");
const server = spawn(
  process.execPath,
  [astroCli, "dev", "--host", "127.0.0.1", "--background"],
  { stdio: "inherit" }
);

server.on("exit", code => {
  if (code && code !== 0) process.exit(code);
});

const keepAlive = setInterval(() => {}, 2 ** 31 - 1);

function stop() {
  clearInterval(keepAlive);
  const stopCommand = spawn(process.execPath, [astroCli, "dev", "stop"], {
    stdio: "inherit",
  });
  stopCommand.on("exit", () => process.exit(0));
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
