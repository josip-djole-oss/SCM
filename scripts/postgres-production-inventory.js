#!/usr/bin/env node
"use strict";

const { Pool } = require("pg");
const { poolOptions } = require("./postgres-readiness-check");

async function main() {
  const pool = new Pool(poolOptions(process.env));
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const admins = await client.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE COALESCE((data->>'active')::boolean, true))::int AS active,
               COUNT(*) FILTER (WHERE COALESCE((data->>'isSuperAdmin')::boolean, false))::int AS super_admins,
               COUNT(*) FILTER (WHERE COALESCE(data->>'password', '') !~ '^\\$2[aby]\\$')::int AS non_bcrypt_passwords
        FROM admins
      `);
      const backups = await client.query("SELECT COUNT(*)::int AS total, MAX(created_at) AS latest FROM backups");
      const documents = await client.query("SELECT COUNT(*)::int AS total, MAX(updated_at) AS latest FROM document_versions");
      const state = await client.query("SELECT COUNT(*)::int AS rows, MAX(updated_at) AS latest FROM state");
      const scoped = await client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM reports) AS reports,
          (SELECT COUNT(*)::int FROM notifications) AS notifications,
          (SELECT COUNT(*)::int FROM logs) AS log_groups
      `);
      await client.query("COMMIT");
      process.stdout.write(`${JSON.stringify({
        ok: true,
        admins: admins.rows[0],
        backups: backups.rows[0],
        documentVersions: documents.rows[0],
        state: state.rows[0],
        scopedDocuments: scoped.rows[0],
      }, null, 2)}\n`);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code: error.code || "INVENTORY_FAILED", message: "PostgreSQL inventory failed." } }, null, 2)}\n`);
  process.exitCode = 1;
});
