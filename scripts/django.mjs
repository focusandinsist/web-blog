import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const python =
  process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const django = spawn(
  python,
  [path.join(root, "backend", "manage.py"), ...process.argv.slice(2)],
  {
    cwd: root,
    env: {
      ...process.env,
      PYTHONPATH: [root, process.env.PYTHONPATH]
        .filter(Boolean)
        .join(path.delimiter),
    },
    stdio: "inherit",
  }
);

django.on("error", error => {
  process.stderr.write(`Django command could not start: ${error.message}\n`);
  process.exitCode = 1;
});
django.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
