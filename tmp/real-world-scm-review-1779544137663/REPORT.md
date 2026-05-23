# Real World SCM Review Proof

Run: real-world-scm-review-1779544137663
Overall: MINOR

## Conflict Breakdown - Current Run

- planner: 3
- bins: 3
- plannerRow: 1
- tidplanActivity: 1

### Fields

- planner:moduleVersion: 3
- bins:moduleVersion: 3
- plannerRow:komentar: 1
- tidplanActivity:komentar: 1

## Conflict Breakdown - Previous Multi-user Proof

- plannerRow: 5
- tidplanActivity: 35
- planner: 2
- bins: 2

### Previous Fields

- plannerRow:komentar: 5
- tidplanActivity:komentar: 35
- planner:moduleVersion: 2
- bins:moduleVersion: 2

## Memory / DOM / Polling

- Memory: {"status":"GOOD","first":7188469,"last":7619588,"delta":431119,"pct":6}
- DOM growth: {"status":"MINOR","first":2776,"last":5755,"delta":2979}
- Polling: {"status":"GOOD","chatPollingOutsideChat":0}
- currentSite drifts: 0
- JS errors: 0

## Scenarios

### SCENARIO A - Planner + Warehouse + Store + Site Chat, 10 minute real use

Status: MINOR
Duration: 612s
Saves: 286
Conflicts: 6
Rejected saves: 6
currentSite drifts: 0
Screenshots:
- [screenshots/scenario-a-planner-start.png](screenshots/scenario-a-planner-start.png)
- [screenshots/scenario-a-warehouse-end.png](screenshots/scenario-a-warehouse-end.png)
- [screenshots/scenario-a-store-end.png](screenshots/scenario-a-store-end.png)
- [screenshots/scenario-a-chat-end.png](screenshots/scenario-a-chat-end.png)
Problems:
- Problem: 6 expected same-entity/module conflicts.
- Uzrok: Concurrent users touched the same field or stale module version.
- Rizik: No overwrite/data loss detected, but users may need conflict UI/retry.
- Predlozeni fix: Prioritize entity merge for the noisiest targets.

### SCENARIO B - Same Planner row conflict options

Status: MINOR
Duration: 1s
Saves: 3
Conflicts: 1
Rejected saves: 1
currentSite drifts: 0
Screenshots:
- [screenshots/scenario-b-planner-conflict.png](screenshots/scenario-b-planner-conflict.png)
Problems:
- Problem: 1 expected same-entity/module conflicts.
- Uzrok: Concurrent users touched the same field or stale module version.
- Rizik: No overwrite/data loss detected, but users may need conflict UI/retry.
- Predlozeni fix: Prioritize entity merge for the noisiest targets.

### SCENARIO C - Same Tidplan activity conflict options

Status: MINOR
Duration: 2s
Saves: 2
Conflicts: 1
Rejected saves: 1
currentSite drifts: 0
Screenshots:
- [screenshots/scenario-c-tidplan-conflict.png](screenshots/scenario-c-tidplan-conflict.png)
Problems:
- Problem: 1 expected same-entity/module conflicts.
- Uzrok: Concurrent users touched the same field or stale module version.
- Rizik: No overwrite/data loss detected, but users may need conflict UI/retry.
- Predlozeni fix: Prioritize entity merge for the noisiest targets.

### SCENARIO D - Site Chat spam + Planner + Store

Status: GOOD
Duration: 93s
Saves: 61
Conflicts: 0
Rejected saves: 0
currentSite drifts: 0
Screenshots:
- [screenshots/scenario-d-chat-spam.png](screenshots/scenario-d-chat-spam.png)
Problems: none

## Logs

- [conflict-breakdown.json](logs/conflict-breakdown.json)
- [network-responses.json](logs/network-responses.json)
- [samples.json](logs/samples.json)
- [console.json](logs/console.json)
- [final-state.json](logs/final-state.json)