# Deploy test checklist

Run this before every deploy and paste failures into the release note.

## Auth and permissions

- [ ] Login as super admin.
- [ ] Login as regular admin/user.
- [ ] Regular user opens DevTools Network and verifies `/api/state` does not include hidden admin, backups, logs, warehouse, surveys, guest permissions, or bin permissions without the matching backend permission.
- [ ] Regular/lower admin cannot change own level, become super admin, grant permissions they do not have, or edit peer/higher admins by posting directly to `/api/state`.

## Planner

- [ ] Remove worker/resource, reload browser, verify it stays removed.
- [ ] Remove lift, reload browser, verify it stays removed.
- [ ] Save planner changes for today.
- [ ] Attempt to change planner data for a past day without `canUnlockPastDays`; backend returns `403 Past days are locked`.
- [ ] Import planner file and export planner file.

## Tidplan

- [ ] Save Tidplan changes for today.
- [ ] Attempt to change/import past Tidplan data without `canUnlockPastDays`; backend returns `403 Past days are locked`.
- [ ] Import Tidplan file and export Tidplan file.

## Warehouse

- [ ] View warehouse with view permission.
- [ ] Create/update/delete item with manage permission.
- [ ] Verify user without warehouse permissions cannot see warehouse state in `/api/state`.
- [ ] Import warehouse file and export warehouse file.

## Surveys

- [ ] Create/publish survey with creator permissions.
- [ ] Vote as allowed recipient.
- [ ] Verify unauthorized recipient cannot fetch/vote by direct request.

## Backups and logs

- [ ] Create manual backup.
- [ ] List backups.
- [ ] Railway logs stay clean: no stack traces, unhandled promise rejections, storage retry loops, or noisy expected 403/409 output.
