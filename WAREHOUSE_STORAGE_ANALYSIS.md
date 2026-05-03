# CRITICAL ISSUE: Warehouse Storage is MIXED (Global + Site-Scoped)

**Date:** 2026-05-03  
**Status:** INVESTIGATION COMPLETE - Multiple issues found  

---

## Issue Summary

Warehouse data is stored **inconsistently**:
- ✅ **Backend siteData:** Contains `siteData[site].warehouse` (site-scoped in structure)
- ❌ **Frontend localStorage:** Mix of GLOBAL and site-scoped keys
- ❌ **Backend files:** Single global `warehouseFile` and `warehouseLogsFile` files

---

## Current Storage Locations

### Frontend localStorage

| Location | Key | Scope | Lines |
|----------|-----|-------|-------|
| loadWarehouseData() | `getStorageKey("cmax_warehouse_data")` | ❌ GLOBAL | 6201 |
| persistWarehouseData() | `getStorageKey("cmax_warehouse_data")` | ❌ GLOBAL | 9042 |
| persistCurrentStateToLocalStorage() | `getStorageKey("cmax_warehouse_data")` | ❌ GLOBAL | 6372 |
| applyServerStateSnapshot() | `getSiteStorageKey("cmax_warehouse_data", site)` | ✅ SITE | 6683 |
| loadAllData() | `getSiteStorageKey("cmax_warehouse_data", currentSite)` | ✅ SITE | 6564 |
| removeSite() | `getSiteStorageKey("cmax_warehouse_data", siteToRemove)` | ✅ SITE | 11250/11259 |

**Problem:** Functions save to global key, but other functions load from site-scoped keys!

### Backend Files

```
warehouseFile = /server/data/warehouse.json           ❌ GLOBAL
warehouseLogsFile = /server/data/warehouse-logs.json  ❌ GLOBAL
```

Should be:
```
/server/data/sites/site-a/warehouse.json
/server/data/sites/site-a/warehouse-logs.json
/server/data/sites/site-b/warehouse.json
/server/data/sites/site-b/warehouse-logs.json
```

---

## Data Loss Scenarios

### Scenario 1: Site Switch Without Full Reload
1. User on Site A, warehouse data in memory
2. `persistWarehouseData()` saves to GLOBAL key (Site A warehouse)
3. User switches to Site B
4. `loadWarehouseData()` loads from GLOBAL key (still Site A warehouse!)
5. User thinks they're viewing Site B warehouse, but seeing Site A warehouse
6. **Result:** Confused data display or data corruption

### Scenario 2: Delete Site A
1. Site A and Site B exist
2. User deletes Site A
3. `removeSite()` properly removes `getSiteStorageKey("cmax_warehouse_data", "Site A")`
4. BUT if user recently worked on Site A warehouse and called `persistWarehouseData()`, the GLOBAL key still has Site A data
5. User creates new Site C, loads warehouse
6. Site C might get Site A's warehouse data mixed with Site C's data
7. **Result:** Warehouse data corruption

### Scenario 3: Backend Sync
1. User switches sites
2. `loadAllData()` loads from site-scoped key correctly
3. But `persistWarehouseData()` later saves to GLOBAL key
4. Server receives mixed/wrong site data
5. **Result:** Data loss or corruption on sync

---

## Affected Code Sections

### Line 6201: loadWarehouseData()
```javascript
// WRONG - Uses global key
function loadWarehouseData() {
  warehouseData = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getStorageKey("cmax_warehouse_data")), null),
  );
}
```

**Fix:** Use site-scoped key
```javascript
function loadWarehouseData(site = currentSite) {
  warehouseData = normalizeWarehouseData(
    safeParseStoredJson(localStorage.getItem(getSiteStorageKey("cmax_warehouse_data", site)), null),
  );
}
```

---

### Line 9042: persistWarehouseData()
```javascript
// WRONG - Saves to global key
function persistWarehouseData() {
  warehouseData = normalizeWarehouseData(warehouseData);
  localStorage.setItem(getStorageKey("cmax_warehouse_data"), JSON.stringify(warehouseData));
  trackEditActivity();
  scheduleServerSync();
}
```

**Fix:** Use site-scoped key
```javascript
function persistWarehouseData(site = currentSite) {
  warehouseData = normalizeWarehouseData(warehouseData);
  localStorage.setItem(getSiteStorageKey("cmax_warehouse_data", site), JSON.stringify(warehouseData));
  trackEditActivity();
  scheduleServerSync();
}
```

---

### Line 6372: persistCurrentStateToLocalStorage()
```javascript
// WRONG - Saves warehouse to global key
localStorage.setItem(
  getStorageKey("cmax_warehouse_data"),
  JSON.stringify(normalizeWarehouseData(warehouseData)),
);
```

**Fix:** Use site-scoped key
```javascript
localStorage.setItem(
  getSiteStorageKey("cmax_warehouse_data", currentSite),
  JSON.stringify(normalizeWarehouseData(warehouseData)),
);
```

---

## Backend Site Deletion Scope Check

Current check (server.js line 2380) validates siteData structure but MUST also validate warehouse data isn't lost.

### Missing: Warehouse Data Validation

```javascript
// ADD THIS to site deletion scope check:
// If sites were removed, verify warehouse data for remaining sites is preserved
const warehouseData = state?.siteData?.[site]?.warehouse;
if (warehouseData && Object.keys(warehouseData).length > 0) {
  // Warehouse data should be in siteData[site].warehouse
  // Validate it exists after deletion
}
```

---

## Required Changes

### Change 1: Fix loadWarehouseData() (Line 6201)
Use site-scoped key instead of global key

### Change 2: Fix persistWarehouseData() (Line 9042)
Use site-scoped key instead of global key

### Change 3: Fix persistCurrentStateToLocalStorage() (Line 6372)
Use site-scoped key instead of global key

### Change 4: Backend Site Deletion Scope Check (Line 2380)
Verify warehouse data preservation in POST /api/state

### Change 5: Consider Backend File Structure
If backend needs site-scoped warehouse files, create:
- `getSiteDataDir(site)/warehouse.json`
- `getSiteDataDir(site)/warehouse-logs.json`

Currently at: `/server/data/warehouse.json` (global)

---

## Test Cases Before Deployment

### Test 1: Site Switch with Warehouse Data
1. Site A: Add 5 warehouse items
2. Site B: Add 3 different warehouse items
3. Switch Site A → Site B
4. Verify Site B shows 3 items (not Site A's 5)
5. Switch Site B → Site A
6. Verify Site A shows 5 items (not Site B's 3)

### Test 2: Delete Site A with Warehouse Data
1. Site A: Add 10 warehouse items + logs
2. Site B: Add 5 warehouse items + logs
3. Delete Site A
4. Hard reload (Ctrl+F5)
5. Verify Site B still has 5 items
6. Verify Site B still has logs

### Test 3: Concurrent Warehouse Updates
1. Site A: Add items, save
2. Site B: Switch to B, add items, save
3. Switch back to Site A
4. Verify Site A items are correct
5. Check localStorage keys for both sites

### Test 4: Export/Import per Site
1. Site A: Add items
2. Site B: Add different items
3. Export Site A warehouse → file1.xlsx
4. Export Site B warehouse → file2.xlsx
5. Delete both sites' warehouse data
6. Import file1.xlsx to Site A
7. Import file2.xlsx to Site B
8. Verify each site has correct data

---

## Deployment Checklist

- [ ] All 3 localStorage save calls use `getSiteStorageKey(..., currentSite)`
- [ ] `loadWarehouseData()` uses site-scoped key
- [ ] `persistWarehouseData()` uses site-scoped key
- [ ] `persistCurrentStateToLocalStorage()` uses site-scoped key for warehouse
- [ ] Site deletion logic includes warehouse data validation
- [ ] Backend scope check validates warehouse data preservation
- [ ] Test all 4 test cases pass
- [ ] Hard reload test passes (data persists)
- [ ] Export/import still works correctly

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Warehouse data loss on site deletion | **CRITICAL** | Backend validation + frontend site-scoped keys |
| Warehouse data mix-up between sites | **CRITICAL** | Consistent site-scoped key usage |
| Export/import affecting wrong sites | **HIGH** | Use currentSite in export/import |
| Concurrent updates causing corruption | **HIGH** | Site-scoped storage isolation |

---

## Recommendation

**DO NOT deploy site deletion fix without fixing warehouse storage inconsistency.**

The current mixed storage approach (global + site-scoped) can lead to:
1. Warehouse data loss when deleting sites
2. Warehouse data corruption when switching sites
3. Export/import failures
4. Data integrity issues on backend sync

**Priority:** HIGH - Fix before release
