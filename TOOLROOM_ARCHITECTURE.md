# Toolroom / Alatnica Architecture

Status: planning blueprint, not implemented yet.

## Goal

Alatnica is a separate Tool Asset Management System inside SCM. It must not be implemented as another table inside the existing Warehouse stock model.

Warehouse answers:

- How many consumable/material units are on a site?

Alatnica answers:

- Where is this exact physical tool?
- Who has it?
- Which site has it?
- Is it engraved?
- Is it broken, in service, written off, or lost?
- What is its full lifecycle history?

## Module Boundary

UI placement:

```text
Skladiste
- Gradilisno skladiste
- Alatnica
```

Technical boundary:

- Alatnica has its own API.
- Alatnica has its own persistence model.
- Alatnica does not use Warehouse save.
- Alatnica does not use global `/api/state` for normal writes.
- Alatnica must use entity-level concurrency.

## Core Entities

### ToolItem

```js
{
  id,
  internalNumber,        // B054
  serialNumber,
  name,
  type,
  brand,
  model,
  categoryId,
  imageUrl,
  iconKey,

  status,                // available, assigned_worker, assigned_site, reserved, fault_reported, awaiting_return, in_service, returned_from_service, written_off, lost, awaiting_engraving
  engraved,
  engravingDate,

  currentHolderType,     // toolroom, worker, site, service, written_off, lost
  currentHolderUserId,
  currentHolderSiteId,

  issuedAt,
  expectedReturnAt,
  returnedAt,

  warrantyUntil,
  purchaseDate,
  purchasePrice,
  supplier,
  documents,
  notes,
  archived,

  itemVersion,
  fieldVersions,
  updatedAt,
  updatedBy
}
```

### ToolCategory

Categories are a tree, not fixed two-level categories.

```js
{
  id,
  parentId,
  name,
  iconKey,
  imageUrl,
  order,
  archived,
  categoryVersion,
  updatedAt,
  updatedBy
}
```

### ToolPreset

Presets are user-editable. Default presets can exist, but must not be hardcoded as the only source.

```js
{
  id,
  type,                  // toolType, brand, model, status, faultType, serviceAction, prefixRule, categoryTemplate
  label,
  value,
  metadata,
  archived,
  presetVersion,
  updatedAt,
  updatedBy
}
```

### ToolAssignment

```js
{
  id,
  toolId,
  fromHolderType,
  fromHolderUserId,
  fromHolderSiteId,
  toHolderType,          // worker, site, toolroom, service, written_off, lost
  toHolderUserId,
  toHolderSiteId,
  assignedAt,
  expectedReturnAt,
  assignedBy,
  note,
  assignmentVersion
}
```

### ToolFault

```js
{
  id,
  toolId,
  reportedBy,
  reportedAt,
  faultType,
  comment,
  images,
  status,                // reported, received, sent_to_service, in_service, repaired, returned_to_pool, written_off
  handledBy,
  handledAt,
  faultVersion
}
```

### ToolService

```js
{
  id,
  toolId,
  status,
  serviceCompany,
  cost,
  sentAt,
  returnedAt,
  description,
  documents,
  createdBy,
  closedBy,
  serviceVersion
}
```

### ToolHistoryEvent

Tool history is append-only.

```js
{
  id,
  toolId,
  type,
  actorUserId,
  at,
  before,
  after,
  note
}
```

## Status Workflow

Allowed primary statuses:

- `available`
- `awaiting_engraving`
- `assigned_worker`
- `assigned_site`
- `reserved`
- `fault_reported`
- `awaiting_return`
- `in_service`
- `returned_from_service`
- `written_off`
- `lost`

Important guards:

- A tool cannot be assigned unless `engraved === true` and `internalNumber` is present.
- Written off and lost tools are not assignable.
- Tools in service are not assignable.
- Soft delete/archive only. Do not hard-delete tool history.

## Backend Endpoint Plan

```text
GET    /api/toolroom/dashboard

GET    /api/toolroom/items?query=&status=&categoryId=&holder=
POST   /api/toolroom/items
POST   /api/toolroom/items/bulk
GET    /api/toolroom/items/:id
PATCH  /api/toolroom/items/:id
POST   /api/toolroom/items/:id/archive

GET    /api/toolroom/categories
POST   /api/toolroom/categories
PATCH  /api/toolroom/categories/:id
POST   /api/toolroom/categories/:id/archive

GET    /api/toolroom/presets
POST   /api/toolroom/presets
PATCH  /api/toolroom/presets/:id
POST   /api/toolroom/presets/:id/archive

POST   /api/toolroom/assignments
POST   /api/toolroom/returns
POST   /api/toolroom/transfers

POST   /api/toolroom/faults
PATCH  /api/toolroom/faults/:id

POST   /api/toolroom/service
PATCH  /api/toolroom/service/:id

GET    /api/toolroom/items/:id/history
GET    /api/toolroom/my-tools
GET    /api/toolroom/export
```

## Concurrency

Alatnica must be entity-level from day one.

Examples:

- User A assigns `B054`.
- User B edits `B055`.
- User C returns `BR022`.
- User D bulk-adds new tools.

Expected result:

- No overwrite.
- No global save.
- No currentSite drift.
- No duplicate internal numbers.
- No data loss.

PATCH payload example:

```js
{
  baseItemVersion: 12,
  changedFields: {
    serialNumber: "SN-12345",
    notes: "Updated warranty info"
  }
}
```

Conflict rule:

- Different tools: no conflict.
- Same tool, different fields: merge if safe.
- Same tool, same field: return entity/field conflict.

## Internal Number Generation

Backend must be the authority for internal numbers.

Prefix rule examples:

- Busilica -> B
- Brusilica -> BR
- Laser -> L
- Baterija -> BA
- Punjac -> P
- Cekic -> C
- Usisivac -> U
- Stativ -> S

Bulk add must reserve numbers atomically.

Example:

```text
Type: Busilica
Prefix: B
Quantity: 20
Generated: B054-B073
```

If two users bulk-add at the same time, backend must serialize prefix counters and prevent duplicates.

## Site Closure Guard

Closing a site must check Alatnica.

If active tools exist on the site, site close is blocked until every tool is resolved:

- return to Alatnica
- transfer to another site
- transfer to worker
- send to service
- write off with reason

Every resolution is audited.

## Notifications

Use account notifications only.

Do not use site notifications.

Worker receives:

- tool assigned
- tool return requested
- fault report received
- replacement assigned
- tool returned from worker

Alatnicar receives:

- new fault report
- overdue return
- service completed
- site close blocked by tools
- tool awaiting engraving

## Audit

Audit these actions:

- tool added
- tool bulk added
- tool edited
- tool archived
- tool assigned
- tool returned
- tool transferred
- fault reported
- service opened
- service closed
- write off
- preset added/edited/archived
- site close blocked due to active tools
- permission denied attempts

Do not audit ordinary search/view events.

## Backup / Restore

Backup must include:

- tool items
- categories
- presets
- assignments
- faults
- service records
- history events
- uploaded attachment metadata

Open decision for Phase 1:

- If file binary backup is not ready, document that backup restores metadata and server storage remains external.

## MVP Scope

Phase 1 MVP:

1. Alatnica module shell inside Warehouse navigation.
2. Dedicated backend endpoints.
3. Category tree with breadcrumb.
4. Presets editor.
5. Tool registry.
6. Bulk add wizard with backend number reservation.
7. Assign to worker/site.
8. Return/service/writeoff.
9. My Tools mobile cards.
10. Fault report.
11. Toolroom dashboard.
12. Export.
13. Site close blocker.
14. Multi-user concurrency proof.
15. Screenshot proof.

Not MVP:

- QR/barcode print.
- Inventory sessions.
- Advanced service accounting.
- Custom emoji/comment systems.
- Voice/video or chat-like behavior.

## Risks

Critical:

- Reusing Warehouse/global save would reintroduce data-loss risk.
- Client-side internal number generation can create duplicates.
- Allowing unengraved tools to be assigned breaks physical tracking.

High:

- Site close without tool guard loses operational accountability.
- Worker payloads must not be able to write off, assign, or return tools.
- Uploads need MIME and size validation.

Medium:

- Deep categories need breadcrumb and strong search.
- Export must respect permissions.
- Large history lists need pagination.

