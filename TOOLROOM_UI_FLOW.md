# Toolroom / Alatnica UI Flow

Status: planning blueprint, not implemented yet.

## Principle

Alatnica must feel like a professional asset tool, not an Excel replacement pasted into SCM.

Users should not type technical IDs, JSON, comma-separated values, or manual status keys.

Use:

- search
- dropdown
- wizard
- quick actions
- cards
- tree navigation
- presets

## Navigation

```text
Skladiste
- Gradilisno skladiste
- Alatnica
```

Alatnica top tabs:

1. Dashboard
2. Alati
3. Po radniku
4. Po gradilistu
5. Kvarovi
6. Servis
7. Kategorije
8. Preseti
9. Export
10. Moji alati

Worker does not see manager-only tabs.

## Dashboard

Cards:

- Ukupno alata
- Dostupno
- Zaduzeno radnicima
- Zaduzeno gradilistima
- Na servisu
- Prijavljeni kvarovi
- Ceka graviranje
- Otpisano
- Izgubljeno
- Kasni povrat

Primary lists:

- Latest fault reports
- Tools awaiting engraving
- Overdue returns
- Service in progress
- Recently assigned

## Category Tree

Categories can go unlimited levels deep.

Breadcrumb example:

```text
Skladiste > Alatnica > Masine > Busilice > SDS+
```

Every breadcrumb segment is clickable.

Category actions:

- add category
- rename
- archive
- change icon
- change order
- upload category image

If category is in use:

- archive, do not hard-delete.

## View Modes

User can switch between:

- large icons
- small icons
- list/table

Mobile default:

- large cards

Desktop default:

- list/table, with option for icons

## Tool Detail Screen

The tool detail must have fast actions. No ten-click workflow.

Quick action buttons:

- Zaduži
- Razduzi
- Prebaci
- Servis
- Prijavi kvar
- Historija
- Otpisi

Context guards:

- `Zaduzi` disabled if not engraved.
- `Zaduzi` disabled if written off/lost/in service.
- `Otpisi` requires reason and permission.
- Worker sees only allowed actions.

## Add Tool Wizard

Step 1 - Basic:

- name
- type preset
- brand preset
- model preset
- category tree picker
- image/icon

Step 2 - Identity:

- internal number
- prefix rule
- serial number
- engraved toggle

Step 3 - Purchase / warranty:

- purchase date
- supplier
- warranty until
- documents

Step 4 - Initial status:

- awaiting engraving
- available
- assigned to worker
- assigned to site

Step 5 - Review:

- summary
- warnings
- save

## Bulk Add Wizard

Step 1 - Select preset:

- type
- brand
- model
- category

Step 2 - Quantity and prefix:

- quantity
- prefix rule
- generated range preview

Step 3 - Serial numbers:

- enter now
- paste list
- add later

Step 4 - Initial state:

- awaiting engraving
- available

Step 5 - Review:

- generated internal numbers
- duplicate check result
- create

Backend must reserve numbers atomically.

## Assignment Wizard

Step 1 - Select tool:

- search by internal number, serial, name, brand, model

Step 2 - Assign to:

- worker
- site

Step 3 - Select holder:

- worker search
- site search

Step 4 - Details:

- date
- expected return date
- note

Step 5 - Confirm:

- summary
- assign

## Return Wizard

Return options:

- returned ok
- returned damaged
- not returned
- lost
- send to service
- write off

If service:

- open service workflow.

If write off:

- require reason.
- require permission.

## Fault Report Flow

Worker can report faults only for:

- tools assigned directly to them
- tools assigned to their active site

Fault report:

- fault type dropdown
- comment
- optional photo
- submit

No free-form technical status typing.

## My Tools Mobile Flow

Mobile is card-first.

Card example:

```text
B054
Milwaukee M18 FPD3
Status: Aktivno
Site: Karlatornet
Assigned: 2026-05-22

[Prijavi kvar] [Dodaj sliku] [Zatrazi zamjenu]
```

Do not use a 14-column table on phone.

Desktop can use table.

## Search

Search across:

- internal number
- serial number
- name
- type
- brand
- model
- category path
- worker
- site
- status
- service status

Expected:

- Typing `B054` opens exact tool quickly.
- Typing `Marko` shows tools assigned to Marko.
- Typing `Karlatornet` shows tools assigned to the site.

## Export Flow

Export filters:

- all tools
- by worker
- by site
- in service
- written off
- fault reports
- tool history

Formats:

- CSV/Excel-compatible
- PDF if existing export stack supports it safely

Export must be permission-scoped.

## Screenshot Proof Required Before Done

Proof viewports:

- desktop 1440x1000
- tablet 768x1024
- mobile 390x844
- mobile 430x932

Proof states:

- dashboard
- category tree with breadcrumb
- tool detail with quick actions
- mobile My Tools cards
- bulk add wizard range preview
- assignment wizard
- fault report
- service list
- export panel

Each screenshot must be marked:

- GOOD
- MINOR
- MAJOR
- BLOCKER

