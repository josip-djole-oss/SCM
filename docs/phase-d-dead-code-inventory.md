# Phase D Dead-Code Inventory

Generated for safe cleanup after modularization and dispatcher migration.

## Scope

- Frontend namespace action bridges in `public/js/core/namespace.js`
- HTML `data-cmax-action` usage in `public/index.html`
- JS/script direct `CMAX.*` calls

## Current result

- Confirmed dead action bridges: `0`
- Suspicious action bridges (no direct usage found): generated to `docs/phase-d-dead-code-audit.json`

## Executed micro-groups

- `D1-core-aliases` (completed):
- removed unused namespace bridge actions: `core.init`, `core.render`, `core.load`
- no business function body removed; only `CMAX.core.*` alias surface reduced
- verification: site isolation browser flow passed after change

## Interpretation rules

- `Suspicious` does **not** mean safe to delete.
- Keep any suspicious action if it is used by:
- generated template fragments
- dynamic dispatcher paths
- tests/harness scripts
- console/manual ops procedures

## Safe removal workflow (per group)

1. Pick max 3 suspicious actions from a single feature area.
2. Remove only namespace bridge entries first (not core business functions).
3. Run mandatory tests:
- `node scripts/site-isolation-browser-test.js`
- login + routing smoke
- module smoke for affected feature
4. If all pass, commit that micro-group.

## Stop conditions

- Any missing action runtime error (`CMAX action is missing` / `legacy handler is missing`)
- Any regression in login, route restore, site isolation, warehouse/planner/tidplan core flows

## Notes

- This phase intentionally avoids touching optimistic concurrency/versioning code.
- Backend source-of-truth flow remains unchanged.
