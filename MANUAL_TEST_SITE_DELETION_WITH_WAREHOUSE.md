# Manual Test: Complete Site Deletion with All Data Types

**Objective:** Verify that deleting Site A does not affect Site B's data across ALL modules including the newly fixed warehouse storage.

**Time Required:** 30-45 minutes  
**Prerequisites:** App running, admin access

---

## SETUP: Create Two Sites with Diverse Data

### Step 1: Login and Create Site A
1. Login to app with admin account
2. Click "Dodaj gradilište" / "Add Site" (site dropdown)
3. Enter name: **"Site-A-Test"**
4. Confirm
5. Verify you're now on **Site-A-Test**

### Step 2: Add Planner Data to Site A
1. Navigate to **Raspored rada** (Planner tab)
2. Add workers:
   - Name: "Worker-A1"
   - Name: "Worker-A2"
   - Name: "Worker-A3"
3. Add lifts:
   - Name: "Lift-A1"
   - Name: "Lift-A2"
4. Create 2-3 planning rows with data
5. Add date-based data for today
6. **Save** (Ctrl+S or click Spremi)
7. **Screenshot planner data**

### Step 3: Add Tidplan Data to Site A
1. Navigate to **Tidplan** tab
2. Add activities:
   - Activity 1: "Work-A-1", 5 resources needed
   - Activity 2: "Work-A-2", 3 resources needed
3. Add zones (if applicable)
4. **Save**
5. **Screenshot tidplan data**

### Step 4: Add Bins Data to Site A
1. Navigate to **Kante za smeće** (Bins) tab
2. Create bin plan "Plan-A" with:
   - Bin type 1: Red (5 units)
   - Bin type 2: Yellow (3 units)
3. Add daily entries
4. **Save**
5. **Screenshot bins data**

### Step 5: Add Reports to Site A
1. Navigate to **Reports** section (if visible)
2. Create 2-3 sample reports
3. Add titles, descriptions, dates
4. **Save**
5. **Screenshot reports**

### Step 6: Add Notifications to Site A
1. Navigate to **Obavijesti** (Notifications)
2. Create 2-3 notifications specific to Site A
3. Add message, date, site assignment
4. **Save**
5. **Screenshot notifications**

### Step 7: Add Warehouse Data to Site A ⭐ **KEY TEST**
1. Navigate to **Skladište** (Warehouse) tab
2. Add items to warehouse catalog:
   - Item "Material-A1" - Quantity: 100
   - Item "Material-A2" - Quantity: 50
   - Item "Equipment-A1" - Quantity: 2
3. Create warehouse logs:
   - Log: "Received 100 units of Material-A1"
   - Log: "Issued 20 units of Material-A2"
4. **Verify items appear in list**
5. **Save**
6. **Export warehouse data → Save as `site-a-warehouse.xlsx`**
7. **Screenshot warehouse with all items visible**

### Step 8: Create Site B and Add Different Data

1. Click dropdown → Add new site
2. Enter name: **"Site-B-Test"**
3. Confirm
4. Verify you're now on **Site-B-Test**

### Step 9: Add Planner Data to Site B
1. Navigate to **Raspored rada** (Planner)
2. Add DIFFERENT workers:
   - Name: "Worker-B1"
   - Name: "Worker-B2"
   - Name: "Worker-B4"  (note: B4, not B3)
3. Add DIFFERENT lifts:
   - Name: "Lift-B1"
   - Name: "Lift-B3"  (note: B3, not B2)
4. Create different planning rows
5. **Save**
6. **Screenshot - verify different data from Site A**

### Step 10: Add Tidplan Data to Site B
1. Navigate to **Tidplan**
2. Add different activities:
   - Activity 1: "Task-B-1", 7 resources
   - Activity 2: "Task-B-2", 2 resources
3. **Save**
4. **Screenshot - verify different from Site A**

### Step 11: Add Bins Data to Site B
1. Navigate to **Bins**
2. Create bin plan "Plan-B":
   - Bin type 1: Green (10 units)
   - Bin type 2: Blue (8 units)
3. **Save**
4. **Screenshot - verify different from Site A**

### Step 12: Add Reports to Site B
1. Create 1-2 reports specific to Site B
2. **Save**
3. **Screenshot**

### Step 13: Add Notifications to Site B
1. Create 1-2 notifications for Site B
2. **Save**
3. **Screenshot**

### Step 14: Add Warehouse Data to Site B ⭐ **KEY TEST**
1. Navigate to **Skladište** (Warehouse)
2. Add DIFFERENT items:
   - Item "Material-B1" - Quantity: 200
   - Item "Supply-B1" - Quantity: 75
   - Item "Tool-B1" - Quantity: 5
3. Create warehouse logs:
   - Log: "Received 200 units of Material-B1"
   - Log: "Issued 50 units of Supply-B1"
4. **Verify items appear (DIFFERENT from Site A)**
5. **Save**
6. **Export warehouse data → Save as `site-b-warehouse.xlsx`**
7. **Screenshot warehouse with all items visible**

---

## TEST PHASE 1: Verify Both Sites Have Correct Data

### Check 1: Switch Back to Site A
1. Click site dropdown
2. Select **"Site-A-Test"**
3. **Wait for page to load fully**
4. Navigate through each tab:
   - Planner: Verify Worker-A1, A2, A3, Lift-A1, A2 present ✓
   - Tidplan: Verify Work-A-1, Work-A-2 activities present ✓
   - Bins: Verify Plan-A with Red and Yellow bins ✓
   - Reports: Verify Site A reports present ✓
   - Notifications: Verify Site A notifications present ✓
   - Warehouse: Verify Material-A1 (100), Material-A2 (50), Equipment-A1 (2) present ✓

**If any data missing → STOP, investigate before continuing**

### Check 2: Switch to Site B
1. Click site dropdown
2. Select **"Site-B-Test"**
3. **Wait for page to load fully**
4. Navigate through each tab:
   - Planner: Verify Worker-B1, B2, B4, Lift-B1, B3 present ✓
   - Tidplan: Verify Task-B-1, Task-B-2 activities present ✓
   - Bins: Verify Plan-B with Green and Blue bins ✓
   - Reports: Verify Site B reports present ✓
   - Notifications: Verify Site B notifications present ✓
   - Warehouse: Verify Material-B1 (200), Supply-B1 (75), Tool-B1 (5) present ✓

**If any data missing → STOP, investigate before continuing**

---

## TEST PHASE 2: Delete Site A

### Step 1: Switch to Site A
1. Click dropdown → Select **"Site-A-Test"**
2. Wait for load

### Step 2: Delete Site A
1. Click site dropdown button
2. Click **"Ukloni"** / **"Remove"** button
3. Read confirmation dialog carefully
4. **Dialog should say:** "Jeste li sigurni da želite ukloniti gradilište "Site-A-Test"?..."
5. Click **"Potvrdi"** / **"Confirm"** button
6. **Wait for deletion process to complete** (loading indicator)
7. **You should be automatically switched to Site-B-Test**
8. **Verify deletion succeeded** (no error message, app responsive)

### Step 3: Verify Site A is Gone from Dropdown
1. Click site dropdown
2. **Site-A-Test should NOT appear** ✓
3. **Only Site-B-Test should appear** ✓

---

## TEST PHASE 3: Verify Site B Data is Intact (Critical)

### Check All Site B Data After Deletion

1. **Planner Tab:**
   - Workers: Worker-B1, B2, B4 present? ✓
   - Lifts: Lift-B1, B3 present? ✓
   - Planning data intact? ✓

2. **Tidplan Tab:**
   - Task-B-1 present? ✓
   - Task-B-2 present? ✓
   - All activity data unchanged? ✓

3. **Bins Tab:**
   - Plan-B visible? ✓
   - Green (10) and Blue (8) units present? ✓
   - All data unchanged? ✓

4. **Reports Tab:**
   - Site B reports still present? ✓
   - All report data intact? ✓

5. **Notifications Tab:**
   - Site B notifications present? ✓
   - All notifications intact? ✓

6. **Warehouse Tab:** ⭐ **CRITICAL - NEW FIX**
   - Material-B1 (200) still present? ✓
   - Supply-B1 (75) still present? ✓
   - Tool-B1 (5) still present? ✓
   - Warehouse logs still present? ✓
   - **Compare with screenshot from Step 14:**
     - Item count should match ✓
     - Quantities should match ✓
     - Logs should match ✓

**If ANY data is missing or changed → FAILURE - Report bug**

---

## TEST PHASE 4: Hard Reload Test

### Step 1: Hard Reload Page
1. Press **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac)
2. **Wait for page to fully reload**
3. **App should remain on Site-B-Test** (site selection persists)

### Step 2: Verify All Site B Data Still Exists After Reload

Repeat the data verification from TEST PHASE 3:

1. **Planner:** Workers A1, A2, A3 NOT present ✓
2. **Planner:** Workers B1, B2, B4 present ✓
3. **Tidplan:** Only Site B tasks present ✓
4. **Bins:** Only Site B plan visible ✓
5. **Reports:** Only Site B reports visible ✓
6. **Notifications:** Only Site B notifications visible ✓
7. **Warehouse:** ⭐ **CRITICAL**
   - Material-B1 (200) still present? ✓
   - Supply-B1 (75) still present? ✓
   - Tool-B1 (5) still present? ✓
   - Warehouse logs still present? ✓

**If ANY warehouse data is missing → FAILURE - warehouse localStorage fix didn't work**

---

## TEST PHASE 5: Warehouse Export/Import Validation

### Step 1: Export Current Site B Warehouse
1. Navigate to **Warehouse** tab
2. Click **Export** → Choose **Excel**
3. File saved as `site-b-warehouse-after.xlsx`

### Step 2: Compare Export with Original
1. Open `site-b-warehouse.xlsx` (exported before deletion)
2. Open `site-b-warehouse-after.xlsx` (exported after deletion)
3. **Compare items:**
   - Item count should match ✓
   - Material-B1, Supply-B1, Tool-B1 present in both ✓
   - Quantities unchanged ✓
   - Logs present in both ✓

**If exports differ → warehouse data was corrupted**

---

## TEST PHASE 6: Browser Console Verification

### Step 1: Open DevTools
1. Press **F12** (Windows) or **Cmd+Option+I** (Mac)
2. Go to **Console** tab

### Step 2: Check for Errors
1. **No red error messages** should be present ✓
2. Search console for "warehouse" errors → should find 0 ✓
3. Search for "site" errors → should find 0 ✓

### Step 3: Inspect localStorage
1. Go to **Application** tab → **Local Storage**
2. Look for keys containing `cmax_warehouse_data`:
   - Should see key like: `cmax_warehouse_data_Site-B-Test` ✓
   - Should NOT see: `cmax_warehouse_data_Site-A-Test` ✓
   - Should NOT see global key: `cmax_warehouse_data` (no site suffix) ⚠️ **Should be site-scoped**

---

## TEST PHASE 7: Network Verification

### Step 1: Open DevTools Network Tab
1. Go to **Network** tab
2. Reload page (F5 or Cmd+R - normal reload, not hard)
3. Look for `/api/state` request

### Step 2: Check State Response
1. Click on `/api/state` request
2. Go to **Response** tab
3. Verify response contains:
   - `sites: ["Site-B-Test"]` (Site A gone) ✓
   - `siteData.["Site-B-Test"]` exists ✓
   - `siteData.["Site-A-Test"]` does NOT exist ✓
   - `siteData.["Site-B-Test"].warehouse` has items ✓

---

## PASS/FAIL Criteria

### ✅ **PASS** if ALL conditions met:
1. ✅ Site A deleted successfully
2. ✅ Site A removed from dropdown
3. ✅ Site B planner data 100% intact
4. ✅ Site B tidplan data 100% intact
5. ✅ Site B bins data 100% intact
6. ✅ Site B reports 100% intact
7. ✅ Site B notifications 100% intact
8. ✅ **Site B warehouse items 100% intact after deletion**
9. ✅ **Site B warehouse logs 100% intact after deletion**
10. ✅ **After hard reload, all Site B warehouse data still present**
11. ✅ **No console errors related to warehouse or site**
12. ✅ **localStorage uses site-scoped keys, not global key**
13. ✅ **API response shows correct siteData structure**

### ❌ **FAIL** if ANY:
1. ❌ Site A still appears in dropdown
2. ❌ Any Site B data missing
3. ❌ Warehouse data for Site B missing or corrupted
4. ❌ Warehouse data lost after hard reload
5. ❌ Console shows warehouse-related errors
6. ❌ API response contains Site A data or incomplete Site B data

---

## Bug Report Format (If Failed)

If test fails, please report:
```
**Test Phase:** [number]
**Failed at:** [specific step]
**Expected:** [what should have happened]
**Actual:** [what happened instead]
**Screenshots:** [attach relevant screenshots]
**Console Errors:** [paste any errors from F12 console]
**Steps to Reproduce:** [detailed steps]
```

---

## Regression Test (If Previous Issues Existed)

If you had previous warehouse issues, also verify:
- [ ] Switching between sites doesn't mix warehouse data
- [ ] Exporting Site A, then switching to Site B and importing, imports to correct site
- [ ] Multiple browser tabs with same user see consistent warehouse data
- [ ] Page refresh on one tab, other tab warehouse data still correct

---

## Success Indicators

**SUCCESS** ✅ means:
- Warehouse is now **fully site-scoped** (per gradilište)
- Each site has **independent** warehouse data
- Deleting Site A **does not touch** Site B warehouse
- Warehouse data **survives** hard reload
- Storage uses **site-specific localStorage keys** (not global)
- Backend prevents **warehouse data loss** on site deletion
