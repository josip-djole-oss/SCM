# Railway deployment

SCM can run on Railway with PostgreSQL or JSON document storage. User uploads always require a Railway persistent volume. PostgreSQL does not make files written by the application persistent.

## Services and commands

Create one application service and, for production, a PostgreSQL service. Attach a persistent volume to the application service; `/data` is a practical mount path.

The committed `.railway/railway.ts` owns only the SCM service and its upload volume. It preserves existing production variables, the GitHub source and the single-replica setting, and configures:

```text
Build: npm ci && npm run build
Start: npm start
Health: /api/health
```

The production project is `hospitable-wisdom`, environment `production`, service `SCM`. Its Railway domain is `scm-production-f9fc.up.railway.app`. `scm-volume` is mounted at `/data`; the separate PostgreSQL volume remains mounted only on the PostgreSQL service.

The build copies locked browser dependencies from `node_modules` into `public/vendor`. Production therefore does not depend on third-party CDNs for jsPDF, AutoTable or Flatpickr.

## Required variables

```env
NODE_ENV=production
STORAGE_TYPE=postgres
DATABASE_URL=${{Postgres.DATABASE_URL}}
RAILWAY_VOLUME_MOUNT_PATH=/data
CORS_ORIGINS=https://your-scm-domain.example
SESSION_COOKIE_NAME=cmax_session
SESSION_TTL_MS=28800000
BCRYPT_ROUNDS=12
UPLOAD_MAX_BYTES=10485760
API_BODY_LIMIT=5mb
API_RATE_LIMIT_MAX=300
LOGIN_RATE_LIMIT_MAX=10
AUTO_BACKUP_INTERVAL_MS=21600000
```

For initial setup of a completely empty account store only:

```env
BOOTSTRAP_ADMIN_EMAIL=owner@example.com
BOOTSTRAP_ADMIN_PASSWORD=<unique password of 12-72 UTF-8 bytes>
```

Railway provides `PORT`; setting it manually is optional. With the volume mounted, SCM defaults to `/data/uploads` for files and `/data/data/backups` for backup snapshots. `UPLOAD_PATH` must remain inside the volume. With JSON storage, `DATA_PATH` and `BACKUP_PATH` must also remain inside it. Startup deliberately fails if Railway is detected without persistent upload storage.

Bootstrap credentials create the first Super Admin only when account data is empty. The production account was confirmed and the bootstrap variables were removed after validation. Use bootstrap variables only for an empty new environment, remove them after the first successful login, and retain the credential in a password manager. Never commit `.env`.

`npm run validate:railway-config` validates the effective runtime variables without printing their values. `npm run validate:postgres` performs two read-only connections and verifies the expected PostgreSQL schema without reading business records.

## Before deployment

```bash
npm ci
npm run check
npm run test:browser
```

Create a database backup and volume snapshot before upgrading an existing deployment. Migrations preserve unknown and disabled-module data. Module OFF never deletes module records.

## Verification after deployment

1. Confirm `/api/health` returns `ok: true` and `storageReady: true`.
2. Sign in as the explicit Super Admin and verify the intended projects.
3. Upload an image and PDF, download both, restart the service, and download them again.
4. Disable Store for one test project. Verify navigation disappears, `/store` redirects, and `/api/store/orders?site=<project>` returns 403. Verify Store remains usable in an enabled project.
5. Re-enable Store and confirm the previous products and orders remain.
6. Use two isolated browser sessions to verify permission and module changes arrive without another login.
7. Exercise a create/update/delete workflow, refresh both sessions, and confirm the same authoritative result.

## Production validation record

The checklist above was executed on 2026-09-21 against `https://scm-production-f9fc.up.railway.app` with dedicated `SCM-VALIDATION-*` projects and users.

- **PASS:** build, start command, one-replica setting, health check and `/data` volume mount.
- **PASS:** production variable validation and PostgreSQL 18.6 schema/readiness checks.
- **PASS:** login, cookie session, project switching, stale-cache rejection and fresh login after application restart.
- **PASS:** A/B module isolation in navigation, direct URL, backend API and realtime updates across two isolated browser sessions.
- **PASS:** Planner, Tidplan, Sompturnor, Warehouse, Store, Chat, Reports and Notifications saves were confirmed by backend reads and remained after restart.
- **PASS:** upload bytes and metadata existed physically on `/data`, authorized and unauthorized access behaved correctly, and both remained correct after restart.
- **PASS:** production backup creation and restore dry-run.
- **NOT VERIFIED / BLOCKED:** applying a restore, because no isolated Railway staging environment existed and replacing live production state is unsafe.
- **NOT VERIFIED / BLOCKED:** forced PostgreSQL outage/failover, because deliberately disrupting the only production database is unsafe. Normal reconnect was verified through fresh connections and application restarts.

The executed evidence and exact scope are recorded in `SCM_AUDIT.md`. Expected 503 responses during controlled restarts are normal: `/api/health` stays unavailable until PostgreSQL initialization completes, preventing Railway from routing traffic to an unready instance.

## Scaling limitation

Sessions and Server-Sent Event subscribers currently live in one application process. Run one replica. Multiple replicas require a shared session store and shared event transport. PostgreSQL protects documents but does not distribute in-memory sessions or realtime events.

## Recovery

If health reports unavailable storage, inspect the volume mount and database connection before restarting repeatedly. Never point production JSON data or uploads at the repository filesystem. Restore backups into an isolated environment first, verify project/module data and file access, then use the Admin Panel for the production restore.
