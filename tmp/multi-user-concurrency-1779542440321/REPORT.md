# Multi-user Concurrency Proof Report

Run: multi-user-concurrency-1779542440321
Host: http://127.0.0.1:7721
Overall: MINOR

## Summary Counters

- Conflicts: 44
- Saves: 367
- Rejected saves: 44
- Overwrite attempts detected in payloads: 0
- Prevented overwrite attempts: 0
- JS errors: 0
- Lost data: none detected

## Scenarios

### TEST 1 - Planner + Warehouse + Store, real multi-user work

Status: PASS
Duration: 129s
Saves: 40
Conflicts: 0
Rejected saves: 0
Screenshots:
- [screenshots/test1-user-a-planner-start.png](screenshots/test1-user-a-planner-start.png)
- [screenshots/test1-user-b-warehouse-end.png](screenshots/test1-user-b-warehouse-end.png)
- [screenshots/test1-user-c-store-end.png](screenshots/test1-user-c-store-end.png)
Problems: none

### TEST 2 - Tidplan rows 1-5 + rows 15-20 + Warehouse

Status: PASS
Duration: 49s
Saves: 56
Conflicts: 0
Rejected saves: 0
Screenshots:
- [screenshots/test2-user-a-tidplan-end.png](screenshots/test2-user-a-tidplan-end.png)
Problems: none

### TEST 3 - Store editor + Planner + Admin users

Status: PASS
Duration: 52s
Saves: 14
Conflicts: 0
Rejected saves: 0
Screenshots:
- [screenshots/test3-user-c-admin-end.png](screenshots/test3-user-c-admin-end.png)
Problems: none

### TEST 4 - Same Planner row conflict scope

Status: MINOR
Duration: 1s
Saves: 2
Conflicts: 1
Rejected saves: 1
Screenshots:
- [screenshots/test4-same-planner-row.png](screenshots/test4-same-planner-row.png)
Problems:
- Problem: 1 entity-level conflict(s) occurred on the same row/activity/field.
- Uzrok: Two browser profiles edited the same entity field from the same base value.
- Rizik: This is expected protection: the server rejected only the conflicting entity, not another module.
- Predlozeni fix: Add a richer compare UI with Keep mine / Use server / Refresh row.

### TEST 5 - Random chaos, 20-50 mixed actions

Status: MINOR
Duration: 22s
Saves: 126
Conflicts: 39
Rejected saves: 39
Screenshots:
- [screenshots/test5-chaos-user-a.png](screenshots/test5-chaos-user-a.png)
Problems:
- Problem: 39 entity-level conflict(s) occurred on the same row/activity/field.
- Uzrok: Two browser profiles edited the same entity field from the same base value.
- Rizik: This is expected protection: the server rejected only the conflicting entity, not another module.
- Predlozeni fix: Add a richer compare UI with Keep mine / Use server / Refresh row.

### TEST 6 - Long session, 3 users, module saves/refreshes

Status: MINOR
Duration: 616s
Saves: 129
Conflicts: 4
Rejected saves: 4
Screenshots:
- [screenshots/test6-long-user-a.png](screenshots/test6-long-user-a.png)
- [screenshots/test6-long-user-b.png](screenshots/test6-long-user-b.png)
Problems:
- Problem: 4 same-module stale conflict(s) occurred during this scenario.
- Uzrok: A module-scoped save target still uses moduleVersion instead of entity-level merge.
- Rizik: User may need to refresh/retry when two users edit the same module in parallel, but cross-module overwrite was not observed.
- Predlozeni fix: Move remaining noisy module save targets to entity endpoints where needed.

## Logs

- [network-responses.json](logs/network-responses.json)
- [console.json](logs/console.json)
- [final-state.json](logs/final-state.json)

## Notes

- TEST 4 intentionally checks same-row Planner concurrency. Phase 1 is module-scoped, so row-level compare is expected to be a Phase 2 gap if only module conflict is returned.
- Browser actions run inside real isolated Chromium contexts and use the same frontend module save bridge as the app.