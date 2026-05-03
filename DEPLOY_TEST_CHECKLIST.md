# Deploy test checklist

Run this before every deploy and paste failures into the release note.

## Auth and permissions

- [ ] Login as super admin.
- [ ] Login as regular admin/user.
- [ ] Level 6 admin cannot edit own admin level, permissions, site access, readonly status, or admin status.
- [ ] Level 6 admin can create/edit maximum level 5 admin.
- [ ] Level 5 admin cannot edit level 5, level 6, root, or superadmin accounts.
- [ ] Normal admin cannot assign permissions they do not have.
- [ ] Regular user opens DevTools Network and verifies `/api/state` does not include hidden admin, backups, logs, warehouse, surveys, guest permissions, or bin permissions without the matching backend permission.
- [ ] Regular/lower admin cannot change own level, become super admin, grant permissions they do not have, or edit peer/higher admins by posting directly to `/api/state`.
- [ ] Direct API attempt to self-edit admin data returns `403`.
- [ ] Admin audit log records who changed permissions/level/site access/readonly/admin status, old values, new values, and timestamp.
- [ ] `canUnlockPastDays` checkbox is visible in Admin Panel -> Admini -> permissions -> Prosli dani, saves, and is enforced by backend.

## Planner

- [ ] Remove worker/resource, reload browser, verify it stays removed.
- [ ] Remove lift, reload browser, verify it stays removed.
- [ ] Add new worker/resource, verify it appears in the remove list, remove it, reload browser, verify it stays removed.
- [ ] Add new lift, verify it appears in the remove list, remove it, reload browser, verify it stays removed.
- [ ] Add new moment, karna/dio, and plan; remove each from the remove list, reload, verify none return.
- [ ] Save planner changes for today.
- [ ] Attempt to change planner data for a past day without `canUnlockPastDays`; backend returns `403` with `PAST_DAY_LOCKED`.
- [ ] Grant `canUnlockPastDays`, unlock past Planner day in UI, edit, then relock and verify inputs are disabled again.
- [ ] Verify last edited text shows full name if available, not email.
- [ ] Import planner file and export planner file.

## Tidplan

- [ ] Save Tidplan changes for today.
- [ ] Attempt to change/import past Tidplan data without `canUnlockPastDays`; backend returns `403` with `PAST_DAY_LOCKED`.
- [ ] Grant `canUnlockPastDays`, unlock past Tidplan day in UI, edit, then relock and verify inputs are disabled again.
- [ ] Verify last edited text shows full name if available, not email.
- [ ] Import Tidplan file and export Tidplan file.

## Bins

- [ ] Open yesterday in Bins and verify Bins is not locked by past-day logic.
- [ ] Edit Bins data for a past date with normal Bins edit permission.
- [ ] Direct `/api/state` save that changes only Bins past-date data does not return `PAST_DAY_LOCKED`.

## Warehouse

- [ ] View warehouse with view permission.
- [ ] Create/update/delete item with manage permission.
- [ ] Verify user without warehouse permissions cannot see warehouse state in `/api/state`.
- [ ] Import warehouse file and export warehouse file.

## Surveys

- [ ] Surveys permissions appear in admin panel.
- [ ] While a user is online, grant `canViewSurveys`; within a few seconds the user sees “permissions changed” notice and the Ankete/Pitanja button appears without logout/login.
- [ ] Repeat live refresh for `canCreateSurveys`, `canEditSurveys`, `canPublishSurveys`, `canDeleteSurveys`, `canViewSurveyResults`, and `canViewAnonymousSurveyVoters`.
- [ ] Create/publish survey with creator permissions.
- [ ] Vote as allowed recipient.
- [ ] Verify survey results/voter visibility permissions work.
- [ ] Verify unauthorized recipient cannot fetch/vote by direct request.

## Sync and fresh data

- [ ] Hard refresh loads `/api/health`, `/api/state`, reports, notifications, and module data before showing editable Planner/Tidplan/Warehouse/Notifications/Surveys/Bins data.
- [ ] Route switch to Planner/Tidplan/Warehouse/Notifications/Surveys/Bins fetches fresh data before display.
- [ ] Two-browser conflict test: edit the same Planner row/field from two devices and verify inline conflict warning appears within a few seconds, no modal interrupts typing.
- [ ] Two-browser silent merge test: edit different Planner rows from two devices and verify non-conflicting remote change merges within a few seconds without overwriting local unsaved changes.
- [ ] Repeat same-row and different-row conflict tests for Tidplan activity fields.
- [ ] While tab is hidden, verify polling slows down and Railway/API logs are not spammed.
- [ ] While actively typing/editing, verify sync banners/inline warnings do not interrupt input.
- [ ] Click sync update banner “Osvjezi/Refresh” and verify it pulls fresh data.

## Admin sync and logs

- [ ] Admin edits Planner/Tidplan and autosave does not produce `403 Admins cannot modify their own admin record`.
- [ ] Admin direct/API attempt to actually change own admin record still returns `403`.
- [ ] Admin changes another admin within scope and it saves.
- [ ] Admin logs show user full name when available, not email.
- [ ] Admin logs can be filtered by text, user, action, and date from/to.
- [ ] Logs exist for permission changes, import/export, backup/restore, survey create/delete/vote, locked past-day attempts, and version conflicts.

## Backups and logs

- [ ] Create manual backup.
- [ ] List backups.
- [ ] Restore backup from UI and verify app reloads with restored backend state.
- [ ] Railway logs stay clean: no stack traces, unhandled promise rejections, storage retry loops, or noisy expected 403/409 output.
