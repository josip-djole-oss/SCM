#!/usr/bin/env node
"use strict";

function cookieFrom(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map((value) => String(value).split(";", 1)[0]).join("; ");
}

async function json(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch (_) { return {}; }
}

async function main() {
  const baseUrl = String(process.argv[2] || process.env.SCM_PRODUCTION_URL || "").replace(/\/$/, "");
  const email = process.env.SCM_VALIDATION_ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.SCM_VALIDATION_ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const createBackup = process.argv.includes("--create-backup");
  if (!baseUrl || !email || !password) throw Object.assign(new Error("Production URL or validation credentials are missing."), { code: "CONFIGURATION_MISSING" });

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginPayload = await json(login);
  const cookie = cookieFrom(login);
  const csrf = String(loginPayload.csrfToken || "");
  const loginAuth = loginPayload.auth || loginPayload;
  const result = {
    loginStatus: login.status,
    authenticated: login.ok && Boolean(cookie && csrf),
    role: loginAuth.role || null,
    isSuperAdmin: loginAuth.isSuperAdmin === true,
  };
  if (!result.authenticated) {
    process.stdout.write(`${JSON.stringify({ ok: false, ...result }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const request = async (pathname, options = {}) => {
    const headers = { cookie, ...(options.headers || {}) };
    if (options.method && options.method !== "GET") headers["x-csrf-token"] = csrf;
    if (options.body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
    return { response, payload: await json(response) };
  };

  const session = await request("/api/session");
  const sessionAuth = session.payload.auth || session.payload;
  result.sessionStatus = session.response.status;
  result.sessionPersisted = session.response.ok && sessionAuth.role === result.role && sessionAuth.isSuperAdmin === result.isSuperAdmin;
  const backups = await request("/api/backups");
  result.backupListStatus = backups.response.status;
  result.backupCount = backups.response.ok && Array.isArray(backups.payload.backups) ? backups.payload.backups.length : null;

  if (createBackup && result.isSuperAdmin) {
    const backup = await request("/api/backup", { method: "POST", body: "{}" });
    result.backupCreateStatus = backup.response.status;
    result.backupCreated = backup.response.ok && Boolean(backup.payload.id || backup.payload.file);
    result.backupStorage = backup.payload.storage || null;
  }

  result.ok = result.authenticated && result.sessionPersisted && (!createBackup || result.backupCreated === true);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code: error.code || "PROBE_FAILED", message: "Railway authentication probe failed." } }, null, 2)}\n`);
  process.exitCode = 1;
});
