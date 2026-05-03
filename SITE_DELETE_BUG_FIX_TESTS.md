# Site Deletion Bug Fix - Test Cases

## Summary of Fixes

### Frontend (script.js)
**Bug:** `removeSite()` was calling `getStorageKey()` without site parameter after changing `currentSite`, causing it to delete the NEW current site's data instead of the deleted site's data.

**Fix:**
- Line 11263-11269: Changed `localStorage.removeItem(getStorageKey(...))` to `localStorage.removeItem(getSiteStorageKey(..., siteToRemove))`
- Added `tidplan_zones` to deletion and rollback
- Now correctly removes only the deleted site's localStorage keys

### Backend (server.js)

**Bug 1:** No validation that sites array isn't emptied.
**Fix:** Enhanced `mergeStateForSession()` to prevent setting empty sites array when sites previously existed.

**Bug 2:** No scope check when sites are deleted.
**Fix:** Added comprehensive site deletion safety check in `POST /api/state`:
- Validates that deleted sites have no data in nextSiteData
- Validates that remaining sites still have their data preserved
- Returns `SITE_DELETE_SCOPE_ERROR` if scope violation detected
- Logs safety violations for audit

---

## Test Case 1: Single Site Addition and Deletion
**Objective:** Create two sites, add data to both, delete one, verify other remains intact.

### Steps:
1. Open browser, login
2. Create Site A with test data:
   - Add 3 workers (Worker1, Worker2, Worker3)
   - Add 2 lifts (Lift1, Lift2)
   - Create planning rows
   - Add Tidplan entries
   - Add Bins data
3. Create Site B with different data:
   - Add different workers (WorkerA, WorkerB)
   - Add different lifts (LiftA, LiftB)
   - Create planning rows
   - Add Tidplan entries
4. Switch to Site A, verify data is present
5. Delete Site A (confirm dialog)
6. Verify user switched to Site B
7. Check Site B data is 100% intact:
   - Workers: WorkerA, WorkerB present ✓
   - Lifts: LiftA, LiftB present ✓
   - Planning rows present ✓
   - Tidplan entries present ✓
   - Bins data present ✓
8. Reload page, verify Site B data still exists

**Expected Result:** ✅ Site A deleted, Site B data untouched, page reload confirms persistence

---

## Test Case 2: Three Sites - Delete Middle One
**Objective:** Create 3 sites, delete middle one, verify other two intact.

### Steps:
1. Create Site: "Site-Alpha"
   - Add 2 planning rows
   - Add 2 Tidplan activities
2. Create Site: "Site-Beta"  (middle site to delete)
   - Add 3 planning rows
   - Add 3 Tidplan activities
   - Add 5 Bins entries
3. Create Site: "Site-Gamma"
   - Add 1 planning row
   - Add 2 Tidplan activities
4. Switch to each site and screenshot data
5. Switch to Site-Beta, delete it
6. Verify Site-Alpha still exists and data intact
7. Verify Site-Gamma still exists and data intact
8. Try to access Site-Beta (should not be in dropdown)

**Expected Result:** ✅ Site-Beta deleted, Site-Alpha and Site-Gamma both fully functional with data

---

## Test Case 3: Delete with Browser Reload
**Objective:** Delete site, reload page, verify data persists on remaining sites.

### Steps:
1. Create Site "Old-Site"
   - Add warehouse entries: 10 items with values
   - Add 2 notifications
   - Add 3 reports
2. Create Site "Keep-Site"
   - Add warehouse entries: 5 items
   - Add 1 notification
3. Note warehouse item count for "Keep-Site"
4. Delete "Old-Site"
5. **HARD RELOAD:** Ctrl+F5 or Cmd+Shift+R
6. Verify "Keep-Site" warehouse items still exist
7. Verify warehouse item count matches original

**Expected Result:** ✅ Warehouse data persists across reload, no items lost

---

## Test Case 4: Cannot Delete Last Site
**Objective:** Verify user cannot delete when only one site exists.

### Steps:
1. If multiple sites exist, delete all but one
2. Try to delete the last remaining site
3. Check for alert dialog

**Expected Result:** ✅ Alert shown: "Ne možete ukloniti jedino gradilište" (Cannot delete only site)

---

## Test Case 5: Two Browser Tabs - Concurrent Access
**Objective:** Delete site in one tab, verify other tab handles gracefully.

### Steps:
1. Open two browser tabs, same app, same user, Site-A open in both
2. Tab 1: Switch to Site-B
3. Tab 2: Create Site-C with data
4. Tab 2: Delete Site-C
5. Tab 1: Perform an action (add planning row)
6. Tab 1: Reload page
7. Tab 2: Create new Site-D
8. Verify Site-D syncs to Tab 1

**Expected Result:** ✅ Sites list stays consistent, deleted site gone in both tabs after refresh

---

## Test Case 6: Direct API Request Protection
**Objective:** Try to send malformed site deletion payload to backend, verify rejection.

### Steps:
1. Open browser console (F12)
2. Get current session token from cookies
3. Try to send POST to `/api/state` with:
   ```javascript
   {
     state: {
       sites: [],  // Empty array
       currentSite: "default",
       siteData: {}
     },
     lastKnownVersion: 1
   }
   ```
4. Check response

**Expected Result:** ✅ Backend rejects with 400 error, message indicates "Empty state payload rejected" or "Cannot delete all sites"

---

## Test Case 7: Partial Site Data Removal Detection
**Objective:** Verify backend detects if deletion request removes other sites' data.

### Steps:
1. Verify admin user has `canManageSiteAccess` permission
2. Create Sites: A, B, C (all with data)
3. Open DevTools Network tab
4. Call POST `/api/state` with sites array [A, B] (removing C) BUT:
   - Include siteData for A only
   - Intentionally omit siteData for B
5. Check response and server logs

**Expected Result:** ✅ Backend detects missing Site-B data and rejects with `SITE_DELETE_SCOPE_ERROR`

---

## Test Case 8: Permissions Check
**Objective:** Verify non-admin cannot delete sites.

### Steps:
1. Login as read-only user
2. Attempt to delete a site (if UI allows)
3. Check error message

**Expected Result:** ✅ Deletion prevented, read-only user cannot modify sites

---

## Test Case 9: Warehouse Data Integrity
**Objective:** Verify warehouse data is preserved across site deletion.

### Steps:
1. Create Site "Warehouse-A" with:
   - 20 warehouse items
   - Various item details (quantities, locations, etc.)
   - 5 warehouse logs
2. Create Site "Warehouse-B" with different items
3. Delete Site "Warehouse-A"
4. Open Warehouse view for "Warehouse-B"
5. Verify all items present
6. Export warehouse data, verify completeness

**Expected Result:** ✅ Warehouse-B items untouched, no items lost from deletion

---

## Test Case 10: Notifications Integrity
**Objective:** Verify notifications preserved when deleting sites.

### Steps:
1. Create Site "Notify-A" with 5 notifications
2. Create Site "Notify-B" with 3 notifications
3. Delete Site "Notify-A"
4. Open Notifications for Site "Notify-B"
5. Verify all 3 notifications present
6. Check notification timestamps and authors

**Expected Result:** ✅ Notify-B notifications intact, all details preserved

---

## Regression Test: Adding Sites After Deletion
**Objective:** Verify normal site creation still works after deleting sites.

### Steps:
1. Create Site "First"
2. Create Site "Second"
3. Delete Site "First"
4. Create Site "Third"
5. Verify Site "Second" and "Third" both exist with data

**Expected Result:** ✅ New sites can be created normally after deletion

---

## Checklist Before Deployment

- [ ] All 10 test cases pass
- [ ] No console errors logged
- [ ] Server logs show no site deletion scope violations
- [ ] localStorage correctly removes only deleted site keys
- [ ] Reload persistence verified (localStorage and backend sync)
- [ ] Read-only users cannot delete
- [ ] Cannot delete last site
- [ ] UI dropdown correctly shows only remaining sites
- [ ] If current site deleted, user switched to first remaining site
- [ ] currentSite value updated correctly after deletion

## Severity

**CRITICAL** - Data loss bug affecting all users. Must verify thoroughly before release.
