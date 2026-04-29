# CMAX SCM Security & Testing Guide

## Security Verification Checklist

### ✅ Completed Security Implementations

#### Authentication & Authorization
- [x] Session-based authentication with secure cookies
- [x] CSRF protection on all state-modifying operations
- [x] Bcrypt password hashing (12 rounds)
- [x] Role-based access control (RBAC)
- [x] Super admin bypass for permissions
- [x] Read-only mode with enforcement
- [x] Rate limiting on login endpoint (10 attempts/15 min)
- [x] Session expiration (8 hours default)

#### Data Security
- [x] Input sanitization (strings, objects, emails, sites)
- [x] SQL injection prevention (no SQL, JSON file-based)
- [x] XSS prevention through input sanitization
- [x] Path traversal protection on file downloads
- [x] File upload validation by MIME type
- [x] File size limits (10MB default)
- [x] Executable file upload blocking
- [x] Random file naming for uploads

#### API Security
- [x] All /api/* routes require authentication
- [x] CORS properly configured
- [x] Rate limiting on all API endpoints
- [x] Request timeout configuration
- [x] Body size limits
- [x] Proper HTTP method enforcement

#### Deployment Security
- [x] Helmet.js security headers enabled
- [x] Environment-based configuration
- [x] Secure cookie settings for production
- [x] HTTPS enforced in production mode
- [x] Error handling doesn't expose internals
- [x] Sensitive data never logged

#### Warehouse System
- [x] Warehouse data isolated from admin logs
- [x] Warehouse permissions separate
- [x] Warehouse API fully authenticated
- [x] Warehouse activity logged separately

## Testing Guide

### 1. Manual API Testing

#### Test Unauthenticated Access (Should Fail)
```bash
# Test without authentication
curl http://localhost:3000/api/state
# Expected: 401 Unauthorized

# Test without CSRF token
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{"reports":[]}'
# Expected: 401 Unauthorized
```

#### Test Warehouse Endpoints

**1. Create Warehouse Item**
```bash
curl -X POST http://localhost:3000/api/warehouse \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -d '{
    "item": {
      "id": "item-001",
      "name": "Test Item",
      "description": "Test Description",
      "quantity": 5,
      "unit": "pcs",
      "category": "supplies",
      "location": "Warehouse A"
    }
  }'
# Expected: 200 OK with item data (if user has canManageWarehouse permission)
# Expected: 403 Forbidden (if user lacks permission)
```

**2. Get Warehouse Inventory**
```bash
curl http://localhost:3000/api/warehouse \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"
# Expected: 200 OK with warehouse data
```

**3. Assign Items to Admin**
```bash
curl -X POST http://localhost:3000/api/warehouse/assign-admin \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -d '{
    "adminEmail": "admin@example.com",
    "itemIds": ["item-001"]
  }'
# Expected: 200 OK (if user has canAssignWarehouseToAdmin permission)
# Expected: 403 Forbidden (if user lacks permission)
# Expected: 404 Not Found (if admin email invalid)
```

#### Test Read-Only Mode

**1. Toggle Read-Only Mode**
```bash
curl -X POST http://localhost:3000/api/admin/toggle-readonly \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -d '{
    "email": "user@example.com"
  }'
# Expected: 200 OK (if user is super admin)
# Expected: 403 Forbidden (if user is not super admin)
```

**2. Verify Read-Only Blocks Modifications**
```bash
# Try to modify state as read-only user
curl -X POST http://localhost:3000/api/state \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -d '{"state":{"test":"data"}}'
# Expected: 403 Forbidden - "Read-only users cannot modify state"
```

#### Test Site Access Control

**1. Test Report Access with Site Restriction**
```bash
# Get reports for allowed site (should work)
curl 'http://localhost:3000/api/reports?site=allowed-site' \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"
# Expected: 200 OK

# Get reports for restricted site (should fail if user restricted to other sites)
curl 'http://localhost:3000/api/reports?site=restricted-site' \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"
# Expected: 403 Forbidden - "Access denied to this site" (if restricted)
```

#### Test File Upload Security

**1. Attempt to Upload Executable (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -F "file=@malicious.exe"
# Expected: 400 Bad Request - "Invalid file type"
```

**2. Upload Valid File (Should Succeed)**
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -F "file=@document.pdf"
# Expected: 200 OK with file info
```

#### Test Rate Limiting

**1. Test Login Rate Limit**
```bash
# Send 11 login attempts rapidly
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Expected: First 10 return 401, 11th+ return 429 Too Many Requests
```

### 2. Automated Security Tests

#### Permission Check Tests
```javascript
// Test that warehouse endpoints require permissions
async function testWarehousePermissions() {
  const csrfToken = await getCsrfToken();
  
  // Test without permission
  const response = await fetch('/api/warehouse', {
    headers: { 'x-csrf-token': csrfToken },
    credentials: 'include'
  });
  
  if (response.status === 403) {
    console.log('✅ Warehouse permission check working');
  } else {
    console.error('❌ Warehouse permission check failed');
  }
}
```

#### Read-Only Enforcement Tests
```javascript
// Test that read-only users cannot modify data
async function testReadOnlyEnforcement() {
  const csrfToken = await getCsrfToken();
  
  // Try to save state as read-only user
  const response = await fetch('/api/state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken
    },
    body: JSON.stringify({ state: { test: 'data' } }),
    credentials: 'include'
  });
  
  if (response.status === 403) {
    console.log('✅ Read-only enforcement working');
  } else {
    console.error('❌ Read-only enforcement failed');
  }
}
```

#### Site Access Control Tests
```javascript
// Test that users cannot access unauthorized sites
async function testSiteAccessControl() {
  const csrfToken = await getCsrfToken();
  
  // Try to access reports for unauthorized site
  const response = await fetch('/api/reports?site=unauthorized-site', {
    headers: { 'x-csrf-token': csrfToken },
    credentials: 'include'
  });
  
  if (response.status === 403) {
    console.log('✅ Site access control working');
  } else {
    console.error('❌ Site access control failed');
  }
}
```

### 3. Security Scanning

#### Check for Exposed Sensitive Data
```bash
# Search for hardcoded secrets in codebase
grep -r "password:" . --include="*.js" | grep -v node_modules | grep -v "\.git"
grep -r "secret:" . --include="*.js" | grep -v node_modules | grep -v "\.git"
grep -r "api_key" . --include="*.js" | grep -v node_modules | grep -v "\.git"

# Should return: NOTHING (all secrets must be in environment variables)
```

#### Verify Secure Defaults
```bash
# Check NODE_ENV is set
echo $NODE_ENV
# Expected: production

# Check BOOTSTRAP_ADMIN_PASSWORD is set to strong value
# (do NOT echo this, just verify it's set)
```

#### Verify HTTPS in Production
```bash
# Check that secure cookies are enforced
curl -I https://yourdomain.com
# Should show: Set-Cookie headers with Secure flag

# Non-HTTPS access should be redirected
curl -I http://yourdomain.com
# Should show: 301/302 redirect to HTTPS
```

## Vulnerability Testing

### XSS Prevention Testing
```html
<!-- Try to inject script via input fields -->
<!-- Input: <script>alert('XSS')</script> -->
<!-- Expected: HTML entities, no script execution -->
```

### CSRF Prevention Testing
```javascript
// Try to make state-modifying request without CSRF token
fetch('/api/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reports: [] })
})
.then(r => r.json())
.then(d => console.log(d));
// Expected: 403 Forbidden - Invalid CSRF token
```

### SQL Injection Testing (N/A - File-based, but good to verify)
```javascript
// Try to inject SQL-like commands
// Input: '); DROP TABLE admins; --
// Expected: Treated as plain text, no injection possible
```

### Path Traversal Testing
```javascript
// Try to access files outside upload directory
fetch('/uploads/../../server/server.js')
// Expected: 400 Bad Request or 404 Not Found
```

## Performance & Load Testing

### Basic Load Test
```bash
# Use Apache Bench to test API performance
ab -n 1000 -c 10 http://localhost:3000/api/session

# Expected: 
# - No errors
# - Response time < 100ms
# - Requests per second > 100
```

### Concurrent User Test
```bash
# Simulate 50 concurrent users
ab -n 1000 -c 50 http://localhost:3000/api/health

# Expected:
# - All requests succeed
# - No timeouts
# - No server crashes
```

## Compliance & Best Practices

### OWASP Top 10 Verification
- [x] A01:2021 – Broken Access Control → Role/permission checks
- [x] A02:2021 – Cryptographic Failures → Bcrypt hashing, HTTPS
- [x] A03:2021 – Injection → Input sanitization
- [x] A04:2021 – Insecure Design → CSRF tokens, rate limiting
- [x] A05:2021 – Security Misconfiguration → Helmet, proper headers
- [x] A06:2021 – Vulnerable Components → Keep dependencies updated
- [x] A07:2021 – Authentication Failure → Session/password security
- [x] A08:2021 – Data Integrity Failure → Input validation
- [x] A09:2021 – Logging & Monitoring Failure → Activity logs
- [x] A10:2021 – SSRF → File upload validation

### CWE Most Dangerous Verification
- [x] CWE-79 (XSS) → Input sanitization
- [x] CWE-89 (SQL Injection) → Parameterized queries (N/A - file-based)
- [x] CWE-352 (CSRF) → CSRF tokens
- [x] CWE-434 (Unrestricted File Upload) → File validation
- [x] CWE-502 (Deserialization) → JSON parsing safety
- [x] CWE-613 (Insufficient Transport Security) → HTTPS, secure cookies

## Post-Deployment Verification

### Daily Checks
- [ ] Review activity logs for suspicious activity
- [ ] Check for errors in server-errors.log
- [ ] Verify backups completed successfully
- [ ] Monitor server disk space

### Weekly Checks
- [ ] Review warehouse logs for unauthorized access
- [ ] Audit admin permissions
- [ ] Check for failed login attempts patterns
- [ ] Verify backup restoration capability

### Monthly Checks
- [ ] Update dependencies and Node.js
- [ ] Review and update security policies
- [ ] Audit all admin accounts
- [ ] Test disaster recovery procedures

## Export/Import & Backup Testing

### Warehouse Export/Import Tests

**1. Export Warehouse to Excel**
```bash
curl -X GET http://localhost:3000/api/warehouse/export/excel \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -o warehouse.xlsx

# Expected: 200 OK, .xlsx file downloaded
```

**2. Import Warehouse from Excel**
```bash
curl -X POST http://localhost:3000/api/warehouse/import/excel \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -F "file=@warehouse.xlsx"

# Expected: 200 OK, { "ok": true, "itemsImported": N }
```

**3. Read-Only User Cannot Import**
```bash
# Login as read-only user, then:
curl -X POST http://localhost:3000/api/warehouse/import/excel \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -F "file=@warehouse.xlsx"

# Expected: 403 Forbidden - "Read-only users cannot import"
```

### TidPlan Export/Import Tests

**1. Export TidPlan to PDF**
```bash
curl -X GET "http://localhost:3000/api/tidplan/export/pdf?site=gradiliste-1" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -o tidplan.pdf

# Expected: 200 OK, .pdf file downloaded
```

**2. Import TidPlan from PDF**
```bash
curl -X POST http://localhost:3000/api/tidplan/import/pdf \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -F "file=@tidplan.pdf" \
  -F "site=gradiliste-1"

# Expected: 200 OK, { "ok": true, "itemsImported": N }
```

**3. Site Access Control on Export**
```bash
# Try to export from site you don't have access to
curl -X GET "http://localhost:3000/api/tidplan/export/pdf?site=restricted-site" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: 403 Forbidden - "Access denied to this site"
```

### Planner Export/Import Tests

**1. Export to Excel**
```bash
curl -X GET "http://localhost:3000/api/planner/export/excel?site=gradiliste-1" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -o planner.xlsx

# Expected: 200 OK
```

**2. Export to PDF**
```bash
curl -X GET "http://localhost:3000/api/planner/export/pdf?site=gradiliste-1" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -o planner.pdf

# Expected: 200 OK
```

**3. Export to Word**
```bash
curl -X GET "http://localhost:3000/api/planner/export/word?site=gradiliste-1" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -o planner.docx

# Expected: 200 OK
```

**4. Import from Excel**
```bash
curl -X POST http://localhost:3000/api/planner/import/excel \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -F "file=@planner.xlsx" \
  -F "site=gradiliste-1"

# Expected: 200 OK, { "ok": true, "tasksImported": N }
```

### Backup Management Tests

**1. Manual Backup Creation**
```bash
curl -X POST http://localhost:3000/api/backup \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: 200 OK
# {
#   "ok": true,
#   "id": "manual-admin@example.com-1234567890.json",
#   "file": "manual-admin@example.com-1234567890.json",
#   "createdAt": "2026-04-29T10:00:00Z",
#   "storage": "filesystem"
# }
```

**2. Read-Only User Cannot Create Backup**
```bash
# Login as read-only, then:
curl -X POST http://localhost:3000/api/backup \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: 403 Forbidden - "Read-only users cannot create backups"
```

**3. Backup Rate Limiting**
```bash
# Try to create 11 backups in 15 minutes
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/backup \
    -H "x-csrf-token: YOUR_CSRF_TOKEN" \
    -b "cmax_session=YOUR_SESSION_COOKIE"
  echo "Backup $i"
done

# Expected: First 10 succeed (200 OK), 11th gets 429 Too Many Requests
```

**4. List Backups**
```bash
curl -X GET http://localhost:3000/api/backups \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: 200 OK
# {
#   "backups": [
#     {
#       "filename": "auto-1704067200000.json",
#       "size": 524288,
#       "createdAt": "2026-04-29T12:00:00Z"
#     }
#   ]
# }
```

**5. Backup Info**
```bash
curl -X GET http://localhost:3000/api/backup/info \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: 200 OK
# {
#   "backupInterval": 6,
#   "backupIntervalMs": 21600000,
#   "storageType": "json",
#   "backupsDir": "/app/data/backups",
#   "dataDir": "/app/data",
#   "lastBackupTime": 1704067200000,
#   "createdAt": "2026-04-29T12:00:00Z"
# }
```

### Data Isolation Tests

**1. Verify Site Separation**
```bash
# Create item in site A
curl -X POST http://localhost:3000/api/tidplan \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -d '{"site": "site-a", "data": [{"name": "Task A"}]}'

# Create item in site B
curl -X POST http://localhost:3000/api/tidplan \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE" \
  -d '{"site": "site-b", "data": [{"name": "Task B"}]}'

# Get data from site A
curl "http://localhost:3000/api/tidplan?site=site-a" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: Only Task A, NOT Task B
```

**2. Delete One Site, Verify Others Untouched**
```bash
# Delete site A
curl -X DELETE http://localhost:3000/api/sites/site-a \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Check site B still has data
curl "http://localhost:3000/api/tidplan?site=site-b" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -b "cmax_session=YOUR_SESSION_COOKIE"

# Expected: Task B still exists, NOT deleted
```

## Reporting Issues

If you discover a security vulnerability:
1. Do NOT publicly disclose
2. Document the issue with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Proof of concept (if applicable)
3. Report to security team immediately
4. Allow 90 days for remediation

## References

- OWASP Security Guidelines: https://owasp.org/
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- Express Security: https://expressjs.com/en/advanced/best-practice-security.html
- CWE/SANS Top 25: https://cwe.mitre.org/top25/
