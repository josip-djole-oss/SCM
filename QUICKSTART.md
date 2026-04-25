# Quick Reference Guide - CMAX SCM Updates

## What's New

### 1. Warehouse Management System 📦
- **Create warehouse items** with name, quantity, unit, category, location
- **Assign items to admins** for responsibility tracking
- **Separate warehouse logs** isolated from admin activity logs
- **8 new API endpoints** for complete warehouse management

**Access in Admin Panel**: New "Skladište" (Warehouse) tab

### 2. Read-Only Mode 👁️
- **Toggle for any user**: Enable/disable in admin panel
- **Site-based restrictions**: Limit read-only users to specific construction sites
- **View-only enforcement**: Read-only users cannot modify any data
- **Separate API endpoints** for management

**What Read-Only Users CAN Do:**
- View all allowed data
- Access only specified sites (or all if no restriction)
- Generate reports (view-only)

**What Read-Only Users CANNOT Do:**
- Modify any data
- Upload files
- Create/edit reports or notifications
- Clear logs
- Manage warehouse items

### 3. Enterprise Security 🔒
- **Fixed vulnerable routes** - All APIs now properly protected
- **Site access control** - Users can only access their assigned sites
- **Permission enforcement** - Granular control on all operations
- **File upload security** - MIME validation, random names, size limits
- **Input validation** - All data sanitized before storage

## API Endpoints

### Warehouse
```
GET  /api/warehouse                    # Get inventory
POST /api/warehouse                    # Create/update item
DELETE /api/warehouse/:itemId          # Delete item
GET /api/warehouse/admin-assignments   # View assignments
POST /api/warehouse/assign-admin       # Assign items
POST /api/warehouse/unassign-admin     # Remove assignments
GET /api/warehouse-logs                # View logs
DELETE /api/warehouse-logs             # Clear logs
```

### Read-Only Mode
```
POST /api/admin/toggle-readonly        # Enable/disable
POST /api/admin/set-readonly-sites     # Set allowed sites
GET /api/admin/readonly-status         # Check status
```

## New Permissions

```
canViewWarehouse           # View warehouse
canManageWarehouse         # Add/edit/delete items
canAssignWarehouseToAdmin  # Assign items to admins
canModifyReadOnly          # Manage read-only settings
canToggleReadOnly          # Toggle read-only for users
```

## File Structure

### New Files
- `server/data/warehouse.json` - Warehouse inventory storage
- `server/data/warehouse-logs.json` - Warehouse activity logs
- `SECURITY.md` - Security documentation (400+ lines)
- `WAREHOUSE.md` - Warehouse system guide (350+ lines)
- `TESTING_SECURITY.md` - Testing procedures (500+ lines)
- `IMPLEMENTATION_SUMMARY.md` - Project summary

### Modified Files
- `server/server.js` - Added warehouse + security (400+ lines)
- `public/script.js` - Added 33 translations
- `README.md` - Updated features list

## Quick Start

### Enable Warehouse for an Admin
1. Go to Admin Panel → Admins
2. Select admin to edit
3. Check `canViewWarehouse`
4. Check `canManageWarehouse`
5. Check `canAssignWarehouseToAdmin`
6. Save

### Create Warehouse Item
```javascript
const response = await fetch('/api/warehouse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken
  },
  body: JSON.stringify({
    item: {
      id: 'item-001',
      name: 'Example Item',
      quantity: 5,
      unit: 'pcs',
      category: 'supplies',
      location: 'Warehouse A'
    }
  }),
  credentials: 'include'
});
```

### Enable Read-Only for an Admin
1. Go to Admin Panel → Admins
2. Click on admin to edit
3. Check `isReadonly`
4. (Optional) Set `allowedSites` to restrict access
5. Save

### Assign Warehouse Items to Admin
```javascript
const response = await fetch('/api/warehouse/assign-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken
  },
  body: JSON.stringify({
    adminEmail: 'admin@example.com',
    itemIds: ['item-001', 'item-002']
  }),
  credentials: 'include'
});
```

## Security Configuration

### Environment Variables
```bash
NODE_ENV=production              # Enable production mode
PORT=3000                        # Server port
BOOTSTRAP_ADMIN_EMAIL=...        # Initial admin
BOOTSTRAP_ADMIN_PASSWORD=...     # Initial password
CORS_ORIGINS=https://yourdomain  # Allowed origins
CORS_ORIGIN=https://yourdomain   # Single-origin alias also supported
SESSION_TTL_MS=28800000         # Session timeout (8 hours)
BCRYPT_ROUNDS=12                # Password hash rounds
```

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Use strong admin password (12+ chars, mixed case, numbers, symbols)
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Test backup restoration
- [ ] Review activity logs
- [ ] Train admins on new features

## Documentation

### Read These Files
1. **SECURITY.md** - If you need to understand security implementation
2. **WAREHOUSE.md** - If you need warehouse system documentation
3. **TESTING_SECURITY.md** - If you need to test security
4. **IMPLEMENTATION_SUMMARY.md** - For complete project overview
5. **CHECKLIST.md** - To verify all requirements met

## Common Tasks

### View Warehouse Activity
1. Admin Panel → Warehouse → Logs
2. See all warehouse operations with timestamp and user

### Monitor Read-Only Users
1. Review activity logs to see read-only user actions
2. Check read-only status: `GET /api/admin/readonly-status?email=user@example.com`

### Backup Warehouse Data
```bash
# Backups happen automatically daily
# Manual backup:
cp server/data/warehouse.json server/backups/$(date +%Y-%m-%d)/warehouse.json
cp server/data/warehouse-logs.json server/backups/$(date +%Y-%m-%d)/warehouse-logs.json
```

### Clear Warehouse Logs
```
Admin Panel → Warehouse → Logs → [Clear Logs Button]
```
Or via API: `DELETE /api/warehouse-logs` (requires `canClearLogs` permission)

## Troubleshooting

### Warehouse Not Appearing
1. Check user has `canViewWarehouse` permission
2. Verify user is not read-only
3. Check browser console for errors
4. Verify server is running

### Cannot Assign Items
1. Check user has `canAssignWarehouseToAdmin` permission
2. Verify admin email is correct
3. Verify items exist in warehouse
4. Check server logs for errors

### Read-Only Mode Not Working
1. Verify user has `isReadonly` set to true
2. Check `allowedSites` configuration
3. Verify permission checks implemented
4. Review server logs

### File Uploads Blocked
1. Check file is not executable (.js, .exe, etc.)
2. Verify file size < 10MB
3. Check MIME type is valid
4. Verify user has upload permission

## Security Notes

### Important
- ⚠️ Never share BOOTSTRAP_ADMIN_PASSWORD in logs or chat
- ⚠️ Always use HTTPS in production
- ⚠️ Keep backups secure and off-site
- ⚠️ Review activity logs regularly
- ⚠️ Update dependencies monthly
- ⚠️ Test backup restoration quarterly

### Best Practices
✅ Use strong passwords (12+ characters)
✅ Follow principle of least privilege
✅ Enable read-only for temporary access
✅ Monitor activity logs
✅ Keep software updated
✅ Test backups regularly
✅ Review security regularly

## Performance

- Warehouse queries: O(1) item lookup
- Logs capped at 5,000 entries (auto-trimmed)
- No database load - in-memory operations
- File operations: JSON, not binary

## Support

For issues:
1. Check SECURITY.md for security concerns
2. Check WAREHOUSE.md for warehouse questions
3. Check TESTING_SECURITY.md for testing help
4. Review server/data/server-errors.log
5. Check browser console for errors

## What Changed

### Security
- ✅ All vulnerable routes fixed
- ✅ Site access control implemented
- ✅ Read-only enforcement added
- ✅ Permission system enhanced
- ✅ File upload security improved

### Features
- ✅ Warehouse management system
- ✅ Read-only mode functionality
- ✅ Admin assignment system
- ✅ Separate warehouse logging
- ✅ Site-based access control

### Languages
- ✅ 33 new Croatian translations
- ✅ Warehouse terms translated
- ✅ Read-only mode translated
- ✅ Permission labels translated

## Version

**CMAX SCM v2.1.0**
- Release Date: April 24, 2026
- Warehouse Management System: NEW
- Read-Only Mode: IMPROVED
- Security: ENHANCED

---

**Questions?** See documentation files in project root.
