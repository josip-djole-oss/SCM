import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

// This repository owns only the SCM application and its upload volume.
// PostgreSQL and unrelated services remain independently managed resources.
export const partial = "SCM";

export default defineRailway(() => {
  const scmVolume = volume("scm-volume", {
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
    allowOnlineResize: true,
    region: "europe-west4-drams3a",
    sizeMB: 5000,
  });

  const scm = service("SCM", {
    source: github("josip-djole-oss/SCM", { checkSuites: false }),
    build: "npm ci && npm run build",
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: { "europe-west4-drams3a": 1 },
    networking: { privateNetworkEndpoint: "scm" },
    volumeMounts: { "/data": scmVolume },
    env: {
      API_BODY_LIMIT: preserve(),
      API_RATE_LIMIT_MAX: preserve(),
      AUTO_BACKUP_INTERVAL_MS: preserve(),
      BACKUP_RATE_LIMIT_MAX: preserve(),
      BCRYPT_ROUNDS: preserve(),
      BOOTSTRAP_ADMIN_EMAIL: preserve(),
      BOOTSTRAP_ADMIN_PASSWORD: preserve(),
      CORS_ORIGINS: preserve(),
      DATABASE_URL: preserve(),
      LOGIN_RATE_LIMIT_MAX: preserve(),
      NODE_ENV: preserve(),
      REQUEST_TIMEOUT_MS: preserve(),
      SESSION_COOKIE_NAME: preserve(),
      SESSION_TTL_MS: preserve(),
      STORAGE_TYPE: preserve(),
      UPLOAD_MAX_BYTES: preserve(),
    },
  });

  return project("hospitable-wisdom", {
    resources: [scm, scmVolume],
  });
});
