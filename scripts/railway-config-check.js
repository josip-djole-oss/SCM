#!/usr/bin/env node
"use strict";

const path = require("path");

function isInside(parent, child) {
  const relative = path.posix.relative(path.posix.resolve(parent), path.posix.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.posix.isAbsolute(relative));
}

function checkRailwayConfig(env = process.env) {
  const errors = [];
  const warnings = [];
  const checks = {};
  const required = (name) => {
    const present = Boolean(String(env[name] || "").trim());
    checks[name] = present;
    if (!present) errors.push(`${name} is required.`);
    return present;
  };

  checks.NODE_ENV = env.NODE_ENV === "production";
  if (!checks.NODE_ENV) errors.push("NODE_ENV must be production.");

  checks.STORAGE_TYPE = String(env.STORAGE_TYPE || "").toLowerCase() === "postgres";
  if (!checks.STORAGE_TYPE) errors.push("STORAGE_TYPE must be postgres for the production target.");

  if (required("DATABASE_URL")) {
    try {
      const database = new URL(env.DATABASE_URL);
      checks.DATABASE_URL_SCHEME = ["postgres:", "postgresql:"].includes(database.protocol);
      if (!checks.DATABASE_URL_SCHEME) errors.push("DATABASE_URL must use postgres:// or postgresql://.");
    } catch (_) {
      checks.DATABASE_URL_SCHEME = false;
      errors.push("DATABASE_URL is not a valid URL.");
    }
  }

  const volume = String(env.RAILWAY_VOLUME_MOUNT_PATH || "").trim();
  checks.RAILWAY_VOLUME_MOUNT_PATH = volume.startsWith("/");
  if (!checks.RAILWAY_VOLUME_MOUNT_PATH) errors.push("RAILWAY_VOLUME_MOUNT_PATH must be an absolute Railway volume path.");
  const uploadPath = String(env.UPLOAD_PATH || (volume ? path.posix.join(volume, "uploads") : "")).trim();
  checks.UPLOAD_PATH = Boolean(volume && uploadPath && isInside(volume, uploadPath));
  if (!checks.UPLOAD_PATH) errors.push("UPLOAD_PATH must resolve inside RAILWAY_VOLUME_MOUNT_PATH.");

  const corsOrigins = String(env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  checks.CORS_ORIGINS = corsOrigins.length > 0 && corsOrigins.every((value) => {
    try { return new URL(value).protocol === "https:"; } catch (_) { return false; }
  });
  if (!checks.CORS_ORIGINS) errors.push("CORS_ORIGINS must contain explicit HTTPS production origins.");
  checks.CORS_ALLOW_ALL = String(env.CORS_ALLOW_ALL || "false").toLowerCase() !== "true";
  if (!checks.CORS_ALLOW_ALL) errors.push("CORS_ALLOW_ALL must not be enabled in production.");

  const numericRules = {
    SESSION_TTL_MS: { minimum: 300000, fallback: 28800000 },
    BCRYPT_ROUNDS: { minimum: 12, fallback: 12 },
    UPLOAD_MAX_BYTES: { minimum: 1024, fallback: 10485760 },
    API_RATE_LIMIT_MAX: { minimum: 1, fallback: 300 },
    LOGIN_RATE_LIMIT_MAX: { minimum: 1, fallback: 10 },
  };
  for (const [name, rule] of Object.entries(numericRules)) {
    const value = Number(env[name] || rule.fallback);
    checks[name] = Number.isFinite(value) && value >= rule.minimum;
    if (!checks[name]) errors.push(`${name} must be a finite number of at least ${rule.minimum}.`);
  }

  checks.SESSION_COOKIE_NAME = required("SESSION_COOKIE_NAME");
  if (env.BOOTSTRAP_ADMIN_PASSWORD) warnings.push("BOOTSTRAP_ADMIN_PASSWORD is still configured; remove it after confirming the initial Super Admin exists.");
  if (!env.RAILWAY_PROJECT_ID || !env.RAILWAY_ENVIRONMENT_ID || !env.RAILWAY_SERVICE_ID) {
    warnings.push("Railway runtime identity variables are incomplete; run this check inside the application service.");
  }

  return { ok: errors.length === 0, checks, errors, warnings };
}

if (require.main === module) {
  const result = checkRailwayConfig();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

module.exports = { checkRailwayConfig };
