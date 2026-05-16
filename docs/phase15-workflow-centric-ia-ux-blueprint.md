# Phase 15 — Workflow-Centric IA/UX Blueprint

## Objective
Transform CMAX SCM from a module-centric app into a workflow-centric internal platform:
- from “where is that module?” to “what do I need to do now?”
- from silo pages to role-tailored work hubs
- from modal-heavy operations to clear operational pipelines

This is a blueprint only. No large implementation in this phase.

---

## 1) New Information Architecture

## 1.1 Top-Level Navigation
- `/home` — Home
- `/operations` — Operations Hub
- `/inventory` — Inventory Hub
- `/workwear` — Workwear Hub
- `/communications` — Communications Center
- `/incidents` — Incidents Queue
- `/administration` — Administration Center

## 1.2 Hub Model (what belongs where)

1. **Home**
- Role-aware daily overview.
- “My priorities today”, “urgent blockers”, “quick start”.
- Becomes command launchpad, not static dashboard.

2. **Operations**
- Planner + Tidplan + Bins + report shortcuts in one execution flow.
- Foreman daily cockpit.
- Includes staffing health, timeline pressure, bin readiness.

3. **Inventory**
- Current Warehouse features + stock risk + movements.
- Receipts, issues, adjustments, trends.
- Procurement risk visibility.

4. **Workwear**
- Worker store + Purchaser fulfillment + credit governance.
- Product lifecycle, approval queues, order pipeline.

5. **Communications**
- Notifications + Surveys merged under one center.
- Announcements, alerts, surveys, acknowledgement tracking.

6. **Incidents**
- Reports moved from modal/list to queue pipeline.
- Priority lanes, assignment, escalation, attachments.

7. **Administration**
- Replace giant modal with full governance center.
- Permissions, sites, backups/recovery, logs, platform health, integrations.

## 1.3 Secondary Navigation Pattern
Each hub has local nav (tab/rail):
- Overview (default)
- Queue/List
- Analytics
- Settings (if role allowed)

## 1.4 Contextual Actions vs Primary Actions
- **Primary actions:** always visible in top action bar (max 2–4).
- **Secondary actions:** contextual menu or inline row actions.
- **Destructive/admin actions:** require confirm drawer/modal, never primary.

## 1.5 Dashboard Card Rules
Card-worthy items:
- operational urgency
- blocked approvals
- risk indicators
- pending tasks by role

Not card-worthy:
- deep configuration
- low-frequency admin settings

## 1.6 What Should Stop Being a Separate Module
- Bins should stop being a top-level module; becomes Operations subsection.
- Reports modal should stop being separate modal flow; becomes Incidents hub.
- Notifications/Surveys stop as separate top-level modules; become Communications.

---

## 2) Role-First UX

## 2.1 Worker
- **Landing:** Home (Worker variant)
- **Primary daily actions:** check assignment, view announcements, place workwear order
- **Secondary:** answer surveys, submit incident report
- **Urgent:** urgent notices, assignment changes, order status updates
- **Quick actions:** My Day, My Orders, New Report
- **Notification priority:** operational notice > incident update > survey
- **Mobile behavior:** card-first, “My actions” sticky footer

## 2.2 Foreman
- **Landing:** Operations Overview
- **Primary:** staffing alignment, timeline execution, bin readiness, incident triage
- **Secondary:** notifications/surveys broadcast to site team
- **Urgent:** staffing gaps, overdue activities, critical incidents
- **Quick actions:** assign worker, adjust timeline, raise incident
- **Priority:** blockers first, then schedule confidence
- **Mobile:** timeline-lite + task list + quick update flows

## 2.3 Purchaser
- **Landing:** Inventory/Workwear procurement overview
- **Primary:** stock movement, workwear approvals, purchasing pipeline
- **Secondary:** supplier metadata maintenance, credit adjustments
- **Urgent:** low stock PPE, urgent workwear orders pending
- **Quick actions:** approve batch, mark purchased, adjust stock
- **Priority:** service continuity and fulfillment SLA
- **Mobile:** queue-centric action cards

## 2.4 Admin
- **Landing:** Administration Governance Overview
- **Primary:** permissions/site access, policy controls, logs
- **Secondary:** backups, guest/read-only scope
- **Urgent:** permission conflicts, failed backups, abnormal audit signals
- **Quick actions:** grant/revoke, restore backup, inspect logs
- **Priority:** governance integrity
- **Mobile:** read-heavy compact panels, limited destructive actions

## 2.5 Superadmin
- **Landing:** Platform Health & Governance
- **Primary:** cross-site health, audit, escalation, integration posture
- **Secondary:** role templates, compliance exports
- **Urgent:** systemic failures, cross-site anomalies
- **Quick actions:** emergency revoke, rollback, force sync refresh
- **Priority:** platform safety and continuity
- **Mobile:** high-level monitoring + acknowledge/escalate actions

---

## 3) Operations Hub (Planner + Tidplan + Bins Unified)

## 3.1 Core Concept
“Plan → Execute → Validate” in one operational loop.

## 3.2 Proposed Operations IA
- `/operations/overview` — day snapshot
- `/operations/staffing` — planner rows + staffing gaps
- `/operations/timeline` — tidplan execution lanes
- `/operations/bin-readiness` — bins status integrated
- `/operations/incidents` — embedded incident shortcut panel

## 3.3 Foreman Daily Execution Flow
1. Open Operations Overview (today/site preselected)
2. Resolve staffing gaps
3. Validate timeline conflicts
4. Confirm bins readiness
5. Push operational notices (if needed)
6. Monitor incidents/escalate blockers

## 3.4 UX Pattern
- Top ribbon: Date, Site, Shift state, Health score
- Middle: three synchronized panes (Staffing / Timeline / Bins)
- Bottom: Risks + incident quick create

## 3.5 Integration Rules
- Planner edits reflect in staffing health instantly
- Timeline shortages linked to staffing rows
- Bins alerts tied to relevant plan/day context
- Incident creation pre-fills operational context

---

## 4) Inventory + Workwear Procurement Flow

## 4.1 Shared Procurement Mindset
Inventory and Workwear are one procurement domain:
- demand intake
- approval
- ordering
- receipt/fulfillment
- closure and analytics

## 4.2 Proposed Flow
1. Demand appears (stock shortage or workwear order)
2. Approval queue (role-restricted)
3. Purchase action
4. Receipt / ready-for-pickup
5. Delivery/issuance
6. Cost + credit + audit lock

## 4.3 Structure
- Inventory handles stock truth and movement
- Workwear handles person-centric fulfillment + credits
- Shared “Procurement queue” card on both hubs

## 4.4 PPE/Workwear Lifecycle
- Product active/inactive
- stock/availability signal
- order stage transitions
- fulfillment confirmation
- historical trace + audit

---

## 5) Communications Center

## 5.1 Unified Model
- Announcements
- Alerts (urgent/critical)
- Surveys/Polls
- Pinned operational directives

## 5.2 Proposed IA
- `/communications/overview`
- `/communications/announcements`
- `/communications/alerts`
- `/communications/surveys`
- `/communications/history`

## 5.3 UX Requirements
- Priority tagging
- Read/ack states
- “Acknowledge required” for critical notices
- Audience/site targeting
- Threaded update timeline for major notices

---

## 6) Incidents / Reports Redesign

## 6.1 Replace Modal with Queue
- `/incidents/queue`
- `/incidents/board` (status lanes)
- `/incidents/detail/:id`
- `/incidents/analytics`

## 6.2 Status Lanes
- New
- Pending Review
- Approved / In Action
- Ordered/Purchased (if material-related)
- Resolved
- Rejected/Closed

## 6.3 Assignment + Escalation
- assignee
- due-by
- priority (normal/high/critical)
- escalation policy trigger

## 6.4 Attachments
- image/files evidence
- activity timeline with audit stamps

---

## 7) Administration Redesign

## 7.1 Governance Center
- `/administration/overview`
- `/administration/permissions`
- `/administration/sites`
- `/administration/audit`
- `/administration/backups`
- `/administration/platform-health`
- `/administration/integrations`

## 7.2 Domain Split
- Access Governance (roles/permissions/site scope)
- Platform Governance (health/backups/recovery)
- Compliance Governance (audit/export/log retention)

## 7.3 Remove Giant Modal Pattern
- modal only for small confirmations
- all critical config in full-page context

---

## 8) Login + Session Experience Blueprint

## 8.1 Login Page
- Split layout:
  - left: branding + environment badge (Local/Staging/Prod)
  - right: auth panel
- Inputs: email, password, remember me
- Future placeholders: SSO + 2FA section

## 8.2 Session Restore
- clear loading state: “Restoring session…”
- automatic redirect to role landing
- fallback to login on invalid session with reason

## 8.3 Unauthorized/Expired UX
- explicit message (not generic error)
- “Re-authenticate” primary action
- preserve intended destination after login

## 8.4 Role-aware Redirect
- Worker → `/home` (worker variant)
- Foreman → `/operations/overview`
- Purchaser → `/inventory/overview` or `/workwear/queue`
- Admin/Superadmin → `/administration/overview`

---

## 9) Mobile UX Strategy

## 9.1 Principle
Not “shrunk desktop”, but “task cards + queues”.

## 9.2 Patterns
- card/list first
- single-column workflow
- progressive disclosure
- sticky primary action bar
- thumb-zone quick actions

## 9.3 Table Reduction
- tables become expandable rows
- condensed status badges + key metrics
- inline full-screen edit drawers for complex edits

## 9.4 Role-specific Mobile
- Worker: My Day + My Orders first
- Foreman: staffing/timeline alerts first
- Purchaser: approval and stock risk queue first
- Admin: read/approve first, destructive actions gated

---

## 10) Page-by-Page Blueprint

## 10.1 `/home`
- Purpose: role-tailored command start
- Top: site/date/session context
- Main: priority cards + quick actions + “what changed”
- Mobile: stacked priority stream
- Visibility: all authenticated users

## 10.2 `/operations/*`
- Purpose: daily execution
- Top: date/site/shift controls
- Local nav: Overview / Staffing / Timeline / Bin Readiness
- Primary actions: assign/update/escalate
- Mobile: compact timeline + task queue
- Visibility: role + permission constrained

## 10.3 `/inventory/*`
- Purpose: stock truth + movement
- Local nav: Overview / Movements / Logs / Trends
- Primary actions: receive/issue/adjust
- Mobile: movement queue + low stock cards
- Visibility: inventory permissions

## 10.4 `/workwear/*`
- Purpose: order and fulfillment lifecycle
- Local nav:
  - Worker: Catalog / Cart / My Orders / Sizes
  - Manager: Queue / Fulfillment / Credits / Analytics / Products
- Primary actions: submit, approve, advance status
- Mobile: order cards with status actions
- Visibility: workwear permissions

## 10.5 `/communications/*`
- Purpose: unified message center
- Local nav: Overview / Announcements / Alerts / Surveys
- Primary actions: publish/acknowledge/respond
- Mobile: feed with priority filters
- Visibility: view/manage communication permissions

## 10.6 `/incidents/*`
- Purpose: operational incident management
- Local nav: Queue / Board / Analytics
- Primary actions: assign/transition/escalate
- Mobile: lane-filtered queue
- Visibility: report/incident permissions

## 10.7 `/administration/*`
- Purpose: governance and control
- Local nav: Overview / Permissions / Sites / Audit / Backups / Health / Integrations
- Primary actions: grant/revoke, backup restore, policy update
- Mobile: governance summaries + guarded actions
- Visibility: admin/superadmin permissions

---

## 11) Design System Direction

## 11.1 Spacing
- 4/8pt scale
- dense mode only where operationally needed

## 11.2 Typography
- clear hierarchy:
  - page title
  - section title
  - card headline
  - meta/body

## 11.3 Card Hierarchy
- Priority cards
- Workflow cards
- Info cards
- Audit cards

## 11.4 Action Hierarchy
- Primary (one per region)
- Secondary (contextual)
- Tertiary (links/menus)
- Destructive (separate color + confirmation)

## 11.5 Colors/Status
- semantic status only:
  - success/info/warn/error/critical
- same badge language across all hubs

## 11.6 Modal Philosophy
- only short interactions
- no major governance workflows in modals

## 11.7 Empty/Loading/Error
- actionable empty states
- skeletons for load
- clear error + recovery action

## 11.8 Icon & Badge Strategy
- consistent icon semantics
- badge tiers:
  - status
  - priority
  - urgency
  - new/unread

---

## 12) Implementation Strategy (No Big-Bang Rewrite)

## 12.1 What Can Stay
- core permissions model
- sync/version conflict infrastructure
- data-cmax-action dispatcher
- existing domain logic (planner/tidplan/warehouse/workwear)

## 12.2 What Needs Rewrite
- top-level navigation IA
- modal-centric admin/reports architecture
- silo transitions between planner/tidplan/bins

## 12.3 Transitional Layer
- route aliasing old → new hub URLs
- adapter components embedding legacy module content into new hubs
- shared role-aware dashboard registry

## 12.4 Feature Flags
- `FF_OPERATIONS_HUB`
- `FF_COMMUNICATIONS_CENTER`
- `FF_INCIDENTS_QUEUE`
- `FF_ADMIN_CENTER_PAGE`
- `FF_ROLE_HOME_REDIRECT`

## 12.5 Staged Rollout
1. Introduce new IA routes + nav shell (legacy modules embedded)
2. Launch Operations hub shell first (highest value)
3. Move Incidents from modal to queue page
4. Merge Communications
5. Replace Admin modal with Administration center
6. Finalize role-specific landing + mobile-first behaviors

## 12.6 Success Criteria
- fewer cross-module clicks for top workflows
- reduced modal dependency
- faster time-to-complete for foreman/purchaser critical tasks
- lower navigation confusion in user testing

---

## Final Deliverable Summary
This blueprint defines:
- platform architecture
- navigation architecture
- workflow architecture
- role-based UX architecture
- operations/procurement/communications/incidents/governance architecture
- mobile-first architecture
- phased migration roadmap without rewrite catastrophe
