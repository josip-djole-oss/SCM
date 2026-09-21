"use strict";

const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { checkRailwayConfig } = require("../scripts/railway-config-check");
const { poolOptions, REQUIRED_TABLES } = require("../scripts/postgres-readiness-check");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function requestHealth(port) {
  return new Promise((resolve, reject) => {
    const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(body) }); }
        catch (error) { reject(error); }
      });
    });
    request.once("error", reject);
    request.setTimeout(1000, () => request.destroy(new Error("health timeout")));
  });
}

test("Railway production variable check accepts a safe PostgreSQL and volume configuration", () => {
  const result = checkRailwayConfig({
    NODE_ENV: "production",
    STORAGE_TYPE: "postgres",
    DATABASE_URL: "postgresql://user:password@postgres.railway.internal:5432/railway",
    RAILWAY_VOLUME_MOUNT_PATH: "/data",
    UPLOAD_PATH: "/data/uploads",
    CORS_ORIGINS: "https://scm.example.com",
    CORS_ALLOW_ALL: "false",
    SESSION_COOKIE_NAME: "cmax_session",
    SESSION_TTL_MS: "28800000",
    BCRYPT_ROUNDS: "12",
    UPLOAD_MAX_BYTES: "10485760",
    API_RATE_LIMIT_MAX: "300",
    LOGIN_RATE_LIMIT_MAX: "10",
    RAILWAY_PROJECT_ID: "project",
    RAILWAY_ENVIRONMENT_ID: "environment",
    RAILWAY_SERVICE_ID: "service",
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(result.errors, []);
});

test("Railway production variable check rejects missing database, broad CORS and ephemeral uploads", () => {
  const result = checkRailwayConfig({
    NODE_ENV: "production",
    STORAGE_TYPE: "json",
    RAILWAY_VOLUME_MOUNT_PATH: "/data",
    UPLOAD_PATH: "/tmp/uploads",
    CORS_ORIGINS: "http://example.com",
    CORS_ALLOW_ALL: "true",
    SESSION_COOKIE_NAME: "cmax_session",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /DATABASE_URL/);
  assert.match(result.errors.join("\n"), /UPLOAD_PATH/);
  assert.match(result.errors.join("\n"), /CORS/);
});

test("PostgreSQL readiness inspection is read-only and declares the complete schema", () => {
  const options = poolOptions({
    DATABASE_URL: "postgresql://user:secret@host/database",
    PGSSLMODE: "require",
  });
  assert.equal(options.max, 1);
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.deepEqual(REQUIRED_TABLES, [
    "admins", "backups", "document_versions", "logs", "notifications",
    "reports", "site_chat", "state", "toolroom", "warehouse",
  ]);
});

test("health endpoint returns 503 until PostgreSQL initialization succeeds", async (t) => {
  const port = await getFreePort();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scm-health-not-ready-"));
  const server = childProcess.spawn(process.execPath, ["server/server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      STORAGE_TYPE: "postgres",
      DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/invalid",
      DATA_PATH: path.join(root, "data"),
      UPLOAD_PATH: path.join(root, "uploads"),
      BACKUP_PATH: path.join(root, "backups"),
      PG_CONNECT_TIMEOUT_MS: "250",
      STORAGE_INIT_RETRY_MS: "5000",
      STORAGE_INIT_MAX_ATTEMPTS: "1",
    },
    stdio: ["ignore", "ignore", "ignore"],
  });
  t.after(() => {
    if (!server.killed) server.kill();
    fs.rmSync(root, { recursive: true, force: true });
  });

  let health;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      health = await requestHealth(port);
      break;
    } catch (_) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(health, "server did not expose health endpoint");
  assert.equal(health.status, 503);
  assert.equal(health.body.ok, false);
  assert.equal(health.body.storageReady, false);
  assert.equal(Object.hasOwn(health.body.storage, "lastError"), false);
});
