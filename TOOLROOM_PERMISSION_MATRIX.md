# Toolroom / Alatnica Permission Matrix

Status: planning blueprint, not implemented yet.

## New Business Function

Add a business function separate from Admin:

- Alatnicar
- Verktygsansvarig

This is not automatically Admin.

## Permissions

```text
canAccessToolroom
canManageToolroom
canAssignTools
canReturnTools
canReportToolFault
canHandleToolService
canWriteOffTools
canEditToolPresets
canExportToolroom
canViewToolHistory
canManageToolCategories
canBulkAddTools
```

## Role Defaults

| Function | Access | My Tools | Report Fault | Assign | Return | Service | Write Off | Presets | Export | History |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Worker | yes | yes | yes | no | no | no | no | no | no | own/site |
| Gruppledare | yes | yes | yes | no | no | no | no | no | no | own/site |
| Arbetsledare | yes | yes | yes | optional | optional | no | no | no | optional | site |
| Projektledare | yes | yes | yes | optional | optional | no | no | no | optional | site |
| Kontor | optional | no | no | no | no | no | no | no | optional | optional |
| Alatnicar | yes | yes | yes | yes | yes | yes | yes | yes | yes | all |
| Store Manager | optional | yes | yes | no | no | no | no | no | no | own/site |
| Admin | yes | yes | yes | yes | yes | yes | optional | yes | yes | all |
| Superadmin | yes | yes | yes | yes | yes | yes | yes | yes | yes | all |

## Backend Enforcement

Every toolroom write endpoint must check permission server-side.

Frontend visibility is convenience only.

Required backend checks:

- session exists
- user active
- user has site access when action references a site
- user has specific toolroom permission
- worker can only report fault on own/site tools
- write off requires `canWriteOffTools`
- preset edit requires `canEditToolPresets`
- export requires `canExportToolroom`
- history access requires `canViewToolHistory`

## Dangerous Actions

Actions requiring extra confirmation:

- write off tool
- mark lost
- bulk archive
- change internal number after assignment history exists
- delete/archive preset in use
- close site with active tools

## Site Access Rules

Worker can see:

- tools assigned directly to them
- tools assigned to sites they can access

Alatnicar can see:

- all tools if permission allows global toolroom access
- or only sites assigned by Admin if scoped

Admin/Superadmin:

- as configured by global permissions

## Notifications

Only account notifications.

No toolroom event should increase `notificationsSidebarBadge`.

Expected account notification events:

- tool assigned
- tool returned
- return overdue
- fault report received
- service status changed
- replacement assigned
- site close blocked due to tools

## Audit Coverage

Audit event names:

```text
toolroom_tool_created
toolroom_tool_bulk_created
toolroom_tool_updated
toolroom_tool_archived
toolroom_tool_assigned
toolroom_tool_returned
toolroom_tool_transferred
toolroom_fault_reported
toolroom_fault_updated
toolroom_service_opened
toolroom_service_closed
toolroom_tool_written_off
toolroom_tool_marked_lost
toolroom_preset_created
toolroom_preset_updated
toolroom_preset_archived
toolroom_export_generated
toolroom_site_close_blocked
toolroom_permission_denied
```

Never log:

- passwords
- tokens
- raw uploaded file contents

## Multi-User Proof Required

Required browser proof before release:

User A:

- assigns B054

User B:

- edits B055

User C:

- returns BR022

User D:

- bulk-adds new tools

Expected:

- no overwrite
- no data loss
- no global save
- no currentSite drift
- no duplicate internal numbers
- entity conflicts only when editing the same tool/field

