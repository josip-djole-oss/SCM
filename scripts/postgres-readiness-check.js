#!/usr/bin/env node
"use strict";

const { Pool } = require("pg");

const REQUIRED_TABLES = [
  "admins",
  "backups",
  "document_versions",
  "logs",
  "notifications",
  "reports",
  "site_chat",
  "state",
  "toolroom",
  "warehouse",
];

function poolOptions(env = process.env) {
  const sslMode = String(env.PGSSL || env.PGSSLMODE || "").toLowerCase();
  const useSsl = ["true", "require", "verify-ca", "verify-full"].includes(sslMode);
  return {
    connectionString: env.DATABASE_URL,
    ...(sslMode ? { ssl: useSsl ? { rejectUnauthorized: env.PGSSL_REJECT_UNAUTHORIZED !== "false" } : false } : {}),
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: Number(env.PG_CONNECT_TIMEOUT_MS) || 10000,
    application_name: "scm-production-readiness-check",
  };
}

async function inspectOnce(env = process.env) {
  if (String(env.STORAGE_TYPE || "").toLowerCase() !== "postgres" || !env.DATABASE_URL) {
    throw Object.assign(new Error("PostgreSQL production configuration is missing."), { code: "CONFIGURATION_MISSING" });
  }
  const pool = new Pool(poolOptions(env));
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const identity = await client.query(
        "SELECT current_database() AS database, current_user AS role, current_setting('server_version') AS version, pg_is_in_recovery() AS in_recovery",
      );
      const schema = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name",
        [REQUIRED_TABLES],
      );
      const privileges = await client.query(
        "SELECT has_schema_privilege(current_user, 'public', 'USAGE') AS schema_usage, has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create",
      );
      await client.query("COMMIT");
      const tables = schema.rows.map((row) => row.table_name);
      const missingTables = REQUIRED_TABLES.filter((table) => !tables.includes(table));
      return {
        connected: true,
        database: identity.rows[0].database,
        role: identity.rows[0].role,
        serverVersion: identity.rows[0].version,
        inRecovery: identity.rows[0].in_recovery,
        tables,
        missingTables,
        schemaUsage: privileges.rows[0].schema_usage,
        schemaCreate: privileges.rows[0].schema_create,
      };
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    const first = await inspectOnce();
    const second = await inspectOnce();
    const ok = first.missingTables.length === 0 && second.missingTables.length === 0 && first.schemaUsage && second.connected;
    process.stdout.write(`${JSON.stringify({ ok, first, reconnect: { connected: second.connected, missingTables: second.missingTables } }, null, 2)}\n`);
    if (!ok) process.exitCode = 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: { code: error.code || "POSTGRES_CHECK_FAILED", message: "PostgreSQL readiness check failed." } }, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { REQUIRED_TABLES, inspectOnce, poolOptions };
