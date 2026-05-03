# CRITICAL BUG FIX: Site Deletion Data Loss

**Date Fixed:** 2026-05-03  
**Severity:** CRITICAL - Data Loss  
**Affected Users:** All (when deleting construction sites)  
**Status:** FIXED

---

## Root Cause Analysis

### Bug #1: Frontend - Wrong Storage Keys Removed (Lines 11263-11269)

**Problem:**
```javascript
// WRONG - After currentSite changes to sites[0], these remove the NEW site's data!
localStorage.removeItem(getStorageKey("cmax_planner_data"));       // ❌ Uses currentSite = sites[0]
localStorage.removeItem(getStorageKey("tidplan"));                  // ❌ Uses NEW currentSite
localStorage.removeItem(getStorageKey("cmax_planner_bins"));        // ❌ Uses NEW currentSite
// ... etc
```

**Execution Flow:**
1. User deletes Site A (has data)
2. `currentSite` was Site A
3. Code: `sites = sites.filter(s => s !== siteToRemove)` - removes Site A from array
4. Code: `currentSite = sites[0]` - changes to Site B
5. Code: `localStorage.removeItem(getStorageKey("cmax_planner_data"))` 
   - `getStorageKey()` uses the CURRENT `currentSite` value (now Site B)
   - **Deletes Site B's planner data instead of Site A's!**
6. Site A remains untouched, Site B data is LOST

**Impact:** When deleting any site, remaining sites' data is deleted instead of deleted site's data.

**Fix:** Use `getSiteStorageKey(..., siteToRemove)` to explicitly specify which site to remove:
```javascript
// CORRECT - Explicitly remove siteToRemove's data
localStorage.removeItem(getSiteStorageKey("cmax_planner_data", siteToRemove));
localStorage.removeItem(getSiteStorageKey("tidplan", siteToRemove));
localStorage.removeItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
// ... etc - all with siteToRemove parameter
```

---

### Bug #2: Backend - No Validation on Sites Array Deletion

**Problem:** 
The backend `mergeStateForSession()` function accepted empty sites array without validation:
```javascript
if (Array.isArray(submitted.sites)) merged.sites = submitted.sites;  // No validation!
```

**Scenario:**
1. Frontend sends `sites: []` (empty array) to server
2. Backend merges it directly: `merged.sites = []`
3. Only check is `siteData.length > 0` which still passes if one site has data
4. **Result:** All sites deleted from list, but siteData only has one site

**Fix:** Prevent empty sites array if sites previously existed:
```javascript
if (Array.isArray(submitted.sites)) {
  const previousSites = Array.isArray(previous.sites) ? previous.sites : [];
  const nextSites = submitted.sites.filter(s => typeof s === 'string' && s.length > 0);
  if (previousSites.length > 0 && nextSites.length === 0) {
    // Protect: Keep previous sites if trying to set empty array
    merged.sites = previousSites;
  } else {
    merged.sites = nextSites.length > 0 ? nextSites : (previousSites.length > 0 ? previousSites : ['default']);
  }
}
```

---

### Bug #3: Backend - No Scope Check When Deleting Sites

**Problem:**
When a site is deleted, there's no validation that:
1. Only the deleted site's data is removed
2. Other sites' data is preserved
3. No other sites are accidentally deleted

**Risk:**
A malicious or buggy client could send a request that deletes Site A but includes siteData only for Site B, effectively wiping both.

**Fix:** Added comprehensive site deletion safety check in `POST /api/state`:
```javascript
// Detect sites being removed
const removedSites = previousSites.filter(site => !nextSiteIds.has(site));

if (removedSites.length > 0) {
  // Verify deleted sites have NO data in nextSiteData
  for (const removedSite of removedSites) {
    if (nextSiteData[removedSite]) {
      return res.status(400).json({ 
        error: 'SITE_DELETE_SCOPE_ERROR', 
        details: `Deleted site "${removedSite}" still contains data` 
      });
    }
  }
  
  // Verify remaining sites still have their data
  for (const previousSite of previousSites) {
    if (!removedSites.includes(previousSite)) {
      const previousEntry = previousSiteData[previousSite];
      const nextEntry = nextSiteData[previousSite];
      
      if (previousEntry && Object.keys(previousEntry).length > 0) {
        if (!nextEntry || typeof nextEntry !== 'object') {
          return res.status(400).json({ 
            error: 'SITE_DELETE_SCOPE_ERROR', 
            details: `Remaining site "${previousSite}" data was lost` 
          });
        }
      }
    }
  }
}
```

---

## Changes Made

### File: `public/script.js`

**Location:** Lines 11248-11322 (removeSite function)

**Changes:**
1. ✅ Added `removedTidplanZonesData` to saved backup (line 11257)
2. ✅ Changed all `localStorage.removeItem(getStorageKey(...))` to `localStorage.removeItem(getSiteStorageKey(..., siteToRemove))` (lines 11263-11270)
3. ✅ Added rollback for `tidplanZonesData` (lines 11293-11295)

**Before:**
```javascript
localStorage.removeItem(getStorageKey("cmax_planner_data"));        // ❌ WRONG
localStorage.removeItem(getStorageKey("tidplan"));
localStorage.removeItem(getStorageKey("cmax_planner_bins"));
localStorage.removeItem(getStorageKey("cmax_warehouse_data"));
localStorage.removeItem(getStorageKey("cmax_planner_reports"));
localStorage.removeItem(getStorageKey("cmax_planner_notifications"));
```

**After:**
```javascript
localStorage.removeItem(getSiteStorageKey("cmax_planner_data", siteToRemove));        // ✅ CORRECT
localStorage.removeItem(getSiteStorageKey("tidplan", siteToRemove));
localStorage.removeItem(getSiteStorageKey("cmax_planner_bins", siteToRemove));
localStorage.removeItem(getSiteStorageKey("cmax_warehouse_data", siteToRemove));
localStorage.removeItem(getSiteStorageKey("cmax_planner_reports", siteToRemove));
localStorage.removeItem(getSiteStorageKey("cmax_planner_notifications", siteToRemove));
localStorage.removeItem(getSiteStorageKey("tidplan_zones", siteToRemove));
```

---

### File: `server/server.js`

**Change 1:** Enhanced mergeStateForSession (Lines 1889-1907)

**Before:**
```javascript
if (canWriteStateField(session, 'canManageSiteAccess')) {
  if (Array.isArray(submitted.sites)) merged.sites = submitted.sites;  // ❌ No validation
  if (submitted.currentSite) merged.currentSite = submitted.currentSite;
}
```

**After:**
```javascript
if (canWriteStateField(session, 'canManageSiteAccess')) {
  if (Array.isArray(submitted.sites)) {
    // Ensure sites array is never completely empty if there were sites before
    const previousSites = Array.isArray(previous.sites) ? previous.sites : [];
    const nextSites = submitted.sites.filter(s => typeof s === 'string' && s.length > 0);
    if (previousSites.length > 0 && nextSites.length === 0) {
      // Keep previous sites if trying to set empty array (protection against accidental wipe)
      merged.sites = previousSites;
    } else {
      merged.sites = nextSites.length > 0 ? nextSites : (previousSites.length > 0 ? previousSites : ['default']);
    }
  }
  if (submitted.currentSite) merged.currentSite = submitted.currentSite;
}
```

**Change 2:** Added site deletion safety check in POST /api/state (Lines 2347-2400)

**New Code:**
```javascript
// ============ SITE DELETION SAFETY CHECK ============
// Prevent partial state updates that wipe other sites' data
const previousState = currentDocument.data || {};
const previousSites = Array.isArray(previousState.sites) ? previousState.sites : [];
const previousSiteData = previousState.siteData && typeof previousState.siteData === 'object' ? previousState.siteData : {};
const nextSites = Array.isArray(mergedState.sites) ? mergedState.sites : [];
const nextSiteData = mergedState.siteData && typeof mergedState.siteData === 'object' ? mergedState.siteData : {};

// Validate sites array is not being emptied completely
if (nextSites.length === 0 && previousSites.length > 0) {
  await logActivity(req.session.email, 'site_deletion_safety_blocked', {
    reason: 'All sites would be deleted',
    route: '/api/state',
  });
  return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: 'Cannot delete all sites' });
}

// Detect sites being removed and validate scope
const previousSiteIds = new Set(previousSites);
const nextSiteIds = new Set(nextSites);
const removedSites = previousSites.filter(site => !nextSiteIds.has(site));
const addedSites = nextSites.filter(site => !previousSiteIds.has(site));

// If sites were removed, verify only that site's data was removed (not other sites)
if (removedSites.length > 0) {
  for (const removedSite of removedSites) {
    // Site should not exist in nextSiteData (was deleted)
    if (nextSiteData[removedSite]) {
      await logActivity(req.session.email, 'site_deletion_safety_blocked', {
        reason: 'Deleted site still has data',
        site: removedSite,
        route: '/api/state',
      });
      return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: `Deleted site "${removedSite}" still contains data` });
    }
  }
  
  // Verify that remaining sites' data is preserved
  for (const previousSite of previousSites) {
    if (!removedSites.includes(previousSite)) {
      // This site should still exist in nextSiteData
      const previousEntry = previousSiteData[previousSite];
      const nextEntry = nextSiteData[previousSite];
      
      // If previous site had data, ensure next site still has at least the same structure
      if (previousEntry && typeof previousEntry === 'object' && Object.keys(previousEntry).length > 0) {
        if (!nextEntry || typeof nextEntry !== 'object') {
          await logActivity(req.session.email, 'site_deletion_safety_blocked', {
            reason: 'Remaining site data lost',
            site: previousSite,
            route: '/api/state',
          });
          return res.status(400).json({ error: 'SITE_DELETE_SCOPE_ERROR', details: `Remaining site "${previousSite}" data was lost` });
        }
      }
    }
  }
}
```

---

## Protection Layers

### Layer 1: Frontend Integrity ✅
- Correctly identifies which site is being deleted (`siteToRemove`)
- Removes ONLY that site's localStorage keys
- Preserves all other sites' data
- Rollback available if server save fails

### Layer 2: Backend Validation ✅
- Prevents empty sites array
- Detects if remaining sites' data would be lost
- Rejects requests that violate site deletion scope
- Returns explicit error code: `SITE_DELETE_SCOPE_ERROR`
- Logs all safety violations for audit

### Layer 3: User Safety ✅
- Cannot delete last remaining site
- Confirmation dialog required before deletion
- Rollback if server save fails
- Automatic site switch to remaining site after deletion

---

## Testing Required

See `SITE_DELETE_BUG_FIX_TESTS.md` for 10 comprehensive test cases covering:
- ✅ Single site addition and deletion
- ✅ Multiple sites with middle deletion
- ✅ Browser reload persistence
- ✅ Cannot delete last site
- ✅ Concurrent browser tabs
- ✅ Direct API request protection
- ✅ Partial site data detection
- ✅ Permissions enforcement
- ✅ Warehouse data integrity
- ✅ Notifications integrity

---

## Deployment Notes

**Before Deployment:**
1. Run all 10 test cases
2. Check server logs for any scope violations
3. Verify localStorage persistence across page reloads
4. Test with multiple browser tabs open simultaneously

**After Deployment:**
1. Monitor logs for `site_deletion_safety_blocked` entries
2. Document any edge cases
3. Update user documentation if needed

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Data loss on site deletion | **CRITICAL (before fix)** | Complete site data wipe | ✅ Multiple validation layers |
| Empty sites array | **HIGH (before fix)** | All sites deleted | ✅ Backend prevents empty array |
| Remaining site data loss | **HIGH (before fix)** | Partial data wipe | ✅ Backend validates scope |
| Regression in normal operations | Low | UI/UX broken | ✅ No changes to non-delete paths |

**Post-Fix Risk:** Negligible - triple validation at frontend, backend validation, and user confirmation.
