import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const apiBase = (
  process.env.CONTENT_API_URL ?? "http://127.0.0.1:8000/api/publication/v1/"
).replace(/\/+$/, "");
const healthUrl = `${apiBase}/health/`;

try {
  const response = await fetch(healthUrl, {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const health = await response.json();
  if (health.status !== "ok") {
    throw new Error("unexpected health response");
  }
  process.stdout.write(`Django content API is healthy at ${healthUrl}.\n`);
} catch (error) {
  process.stderr.write(
    `Django content API health check failed at ${healthUrl}: ${error.message}\n` +
      "Start the local services with `pnpm dev` or set CONTENT_API_URL.\n"
  );
  process.exitCode = 1;
}
