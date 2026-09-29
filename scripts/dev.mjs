import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const env = { ...process.env };
const apiBase = (
  env.CONTENT_API_URL ?? "http://127.0.0.1:8000/api/publication/v1/"
).replace(/\/+$/, "");
const healthUrl = `${apiBase}/health/`;
const djangoHost = env.DJANGO_BIND_HOST ?? "127.0.0.1";
const djangoPort = env.DJANGO_PORT ?? "8000";
const astroHost = env.ASTRO_HOST ?? "0.0.0.0";
const astroPort = env.ASTRO_PORT ?? "4321";
const python =
  env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const astroCli = path.join(root, "node_modules", "astro", "bin", "astro.mjs");

let stopping = false;
let django;
let astro;

function stopChildren(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [astro, django]) {
    if (child && child.exitCode === null) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
}

function spawnService(command, args, name) {
  const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
  child.on("error", error => {
    process.stderr.write(`${name} could not start: ${error.message}\n`);
    stopChildren(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      process.stderr.write(
        `${name} stopped${signal ? ` after ${signal}` : ` with exit code ${code}`}\n`
      );
      stopChildren(code && code > 0 ? code : 1);
    }
  });
  return child;
}

async function waitForApi() {
  const deadline = Date.now() + 30_000;
  let lastError;

  while (Date.now() < deadline && django?.exitCode === null) {
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok && (await response.json()).status === "ok") return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(
    `Django content API did not become healthy at ${healthUrl}: ${lastError?.message ?? "server stopped"}`
  );
}

process.on("SIGINT", () => stopChildren(130));
process.on("SIGTERM", () => stopChildren(143));

django = spawnService(
  python,
  [
    "backend/manage.py",
    "runserver",
    `${djangoHost}:${djangoPort}`,
    "--noreload",
  ],
  "Django"
);

try {
  await waitForApi();
} catch (error) {
  process.stderr.write(
    `${error.message}\nRun pnpm django:migrate if the database is not initialized.\n`
  );
  stopChildren(1);
}

if (!stopping) {
  process.stdout.write(`Django API: ${healthUrl}\n`);
  process.stdout.write(`Astro: http://127.0.0.1:${astroPort}/\n`);
  astro = spawnService(
    process.execPath,
    [astroCli, "dev", "--host", astroHost, "--port", astroPort],
    "Astro"
  );
}
