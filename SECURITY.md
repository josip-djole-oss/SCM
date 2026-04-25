# CMAX SCM Security Documentation

## Security Updates & Implementations

### 1. Authentication & Authorization

#### Session Management
- **httpOnly Cookies**: Session cookies are marked as `httpOnly` to prevent XSS attacks
- **Secure Cookies**: In production (`NODE_ENV=production`), cookies are marked as `secure` (HTTPS only)
- **SameSite Policy**: Set to `lax` to prevent CSRF attacks
- **Session Expiration**: Sessions expire after 8 hours (configurable via `SESSION_TTL_MS`)
- **Automatic Cleanup**: Expired sessions are automatically cleaned up

#### CSRF Protection
- **CSRF Tokens**: Generated for each session and required for all state-modifying operations
- **Token Validation**: Applied via `requireCsrf` middleware on all POST/PUT/DELETE operations
- **GET Requests**: Safe from CSRF as they don't modify state

#### Password Security
- **Bcrypt Hashing**: Passwords are hashed using bcrypt with 12 rounds (configurable via `BCRYPT_ROUNDS`)
- **No Plain Text**: Passwords are never stored or transmitted in plain text
- **Password Migration**: Existing plain-text passwords are automatically hashed on first run

#### Admin Levels & Roles
- **Super Admin (Level 6)**: Full access to all functionality
- **Admin (Level 1-5)**: Access restricted by permissions
- **Read-Only Admin**: Can view data but cannot modify anything except approved sites
- **Guest (Read-Only User)**: Limited access based on guest permissions

### 2. Role-Based Access Control (RBAC)

#### Permission System
All admin operations are gated by specific permissions:

```javascript
canAccessPlanner        // Access main planner module
canAccessTidplan       // Access Tidplan module
canAccessBins          // Access Bins module
canViewNotifications   // View notifications
canManageNotifications // Create/edit notifications
canDeleteNotifications // Delete notifications
canCreateReports       // Create lift reports
canOpenAdminPanel      // Open admin panel
canManageAdmins        // Add/remove other admins
canManageSiteAccess    // Assign sites to users
canViewSettings        // View application settings
canManageGuestAccess   // Modify guest permissions
canPrint               // Print functionality
canExport              // Export to PDF
canViewLogs            // View activity logs
canClearLogs           // Clear activity logs
canViewWarehouse       // View warehouse inventory
canManageWarehouse     // Add/edit/delete warehouse items
canAssignWarehouseToAdmin  // Assign warehouse items to admins
canModifyReadOnly       // Manage read-only mode settings
canToggleReadOnly       // Enable/disable read-only for users
```

#### Permission Validation
- **Middleware Check**: Every protected endpoint checks user permissions
- **Super Admin Bypass**: Super admins automatically bypass permission checks
- **Read-Only Enforcement**: Read-only users are blocked from all modify operations

### 3. Read-Only Mode

#### Features
- **Enforcement**: Read-only users cannot:
  - Modify state/data
  - Upload files
  - Create reports/notifications
  - Manage admin settings
  - Clear logs or data

- **Site-Specific Access**: Super admins can restrict read-only users to specific sites:
  - If `allowedSites` is null: read-only user can view all sites
  - If `allowedSites` is array: read-only user can only view specified sites
  - Site access is validated on every request

#### API Endpoints for Read-Only Management
- `POST /api/admin/toggle-readonly` - Enable/disable read-only mode for a user
- `POST /api/admin/set-readonly-sites` - Specify which sites a read-only user can access
- `GET /api/admin/readonly-status` - Check read-only status and allowed sites

### 4. Input Validation & Sanitization

#### String Sanitization
- **Control Characters Removed**: Unicode characters 0x00-0x1F and 0x7F are stripped
- **Length Limits**: All strings have maximum length limits (100-5000 characters depending on field)
- **Type Coercion**: All inputs are coerced to expected types

#### Object Sanitization
- **Depth Limiting**: Nested objects are limited to 8 levels deep
- **Array Limiting**: Arrays are limited to 500 items
- **Recursive Filtering**: All values are recursively sanitized

#### Email Validation
- **Format Check**: Emails must match pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Case Normalization**: Emails are normalized to lowercase

#### Site Name Validation
- **Special Character Removal**: Non-alphanumeric, dash, underscore characters are removed
- **Default Fallback**: Invalid site names default to 'default'

### 5. Rate Limiting

#### Login Endpoint
- **Limit**: 10 attempts per IP address per 15 minutes
- **Applied To**: `/api/login` and `/api/login/guest`
- **Response**: 429 Too Many Requests when limit exceeded

#### General API Endpoints
- **Limit**: Configurable via `API_RATE_LIMIT_MAX` (default: 300 requests per minute)
- **Applied To**: All `/api/*` routes
- **Enforcement**: Rate limiting headers included in all responses

### 6. File Upload Security

#### Validation
- **MIME Type Check**: Files validated by MIME type (not just extension)
- **Extension Whitelist**: Only specific extensions allowed:
  - Images: `.jpeg`, `.jpg`, `.png`, `.gif`
  - Documents: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`
- **Size Limit**: Default 10MB (configurable via `UPLOAD_MAX_BYTES`)

#### Storage
- **Random Naming**: Files renamed with timestamp + random number to prevent name guessing
- **Date-Based Folders**: Files organized into date-based directories (YYYY-MM-DD)
- **Requires Admin**: Only users with appropriate permissions can upload
- **No Executables**: Cannot upload `.js`, `.exe`, `.html`, `.bat`, etc.

### 7. Data Security

#### JSON File Safety
- **Atomic Writes**: Using `writeJsonFile()` ensures complete writes
- **No Race Conditions**: Synchronous writes prevent partial updates
- **Data Validation**: All data validated before saving

#### Backup System
- **Daily Backups**: Automatic daily backup at midnight
- **Date-Based Organization**: Backups stored in `server/backups/YYYY-MM-DD/`
- **Full File Copies**: All data files backed up

#### Logging
- **Activity Logs**: Separate from warehouse logs
- **Audit Trail**: All admin actions logged with timestamp and user email
- **Log Rotation**: Logs limited to last 2000 entries (admin) or 5000 (warehouse)
- **Sensitive Data**: Passwords and sensitive details never logged

### 8. Error Handling & Information Disclosure

#### Production Mode
- **Error Hiding**: Stack traces not exposed in API responses
- **Generic Messages**: Internal errors return generic messages to clients
- **Logging**: Full error details logged server-side for debugging

#### Development Mode
- **Detailed Errors**: Full error information available in logs
- **Set via**: `NODE_ENV` environment variable

### 9. CORS Configuration

#### Default Allowed Origins
- `http://localhost:3000` (development)
- `http://127.0.0.1:3000` (development)
- Custom origins via `CORS_ORIGINS` environment variable

#### Restriction
- **Preflight Requests**: Handled automatically by Express CORS middleware
- **Custom Origins**: Can be configured via environment variable (comma-separated list)
- **Credentials**: CORS allows credentials (cookies)

### 10. Security Headers (Helmet.js)

The server is protected with Helmet.js security headers:
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-XSS-Protection**: Enabled - Additional XSS protection
- **Strict-Transport-Security**: Enabled in production
- **Content-Security-Policy**: Configured
- **Referrer-Policy**: Configured

### 11. Site Access Control

#### Implementation
- `canAccessSite(session, site)` function validates site access
- Super admins can access all sites
- Regular admins: if no `allowedSites` specified, can access all sites
- Regular admins: if `allowedSites` specified, can only access listed sites
- Read-only users: follow same rules as regular admins

#### API Validation
- Reports GET/POST endpoints check site access
- Notifications GET/POST endpoints check site access
- Site parameter sanitized to prevent injection

### 12. Environment Configuration

#### Required Variables (Production)
```
NODE_ENV=production              # Set to 'production' for security
PORT=3000                        # Server port
BOOTSTRAP_ADMIN_EMAIL=...        # Initial admin email
BOOTSTRAP_ADMIN_PASSWORD=...     # Initial admin password
```

#### Security Variables (Recommended)
```
SESSION_TTL_MS=28800000         # Session timeout (8 hours default)
BCRYPT_ROUNDS=12                # Password hash rounds (12+ recommended)
CORS_ORIGINS=https://yourdomain # Allowed origins (comma-separated)
```

#### Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `BOOTSTRAP_ADMIN_PASSWORD` (min 12 characters, mixed case, numbers, symbols)
- [ ] Configure `CORS_ORIGINS` to allow only your domains
- [ ] Use HTTPS (configure in your reverse proxy or load balancer)
- [ ] Enable security headers (Helmet enabled by default)
- [ ] Set up log rotation for `server-errors.log`
- [ ] Regular backups of `server/data/` directory
- [ ] Remove old backup files periodically
- [ ] Monitor `server/data/logs.json` for suspicious activity

## Security Best Practices

### For Admins
1. **Strong Passwords**: Use passwords with 12+ characters, mixed case, numbers, symbols
2. **Regular Audits**: Review activity logs regularly for suspicious activity
3. **Permission Principle**: Follow principle of least privilege - give minimal permissions needed
4. **Read-Only Users**: Use read-only mode for temporary or restricted access
5. **Site Segregation**: Use site-based access control to compartmentalize data
6. **Backup Verification**: Periodically verify backup integrity and restoration capability

### For Deployment
1. **HTTPS Only**: Always use HTTPS in production
2. **Environment Variables**: Never hardcode secrets - use `.env` or environment variables
3. **Regular Updates**: Keep Node.js and dependencies up to date
4. **Monitoring**: Monitor server logs for errors and suspicious activity
5. **Firewalls**: Use firewalls to restrict access to the server
6. **Database Backups**: Maintain secure, off-site backups
7. **Access Logs**: Maintain detailed access logs and review regularly

## Vulnerability Reporting

If you discover a security vulnerability, please report it responsibly:
1. Do not publicly disclose the vulnerability
2. Document the issue with steps to reproduce
3. Contact the security team immediately
4. Allow 90 days for remediation before public disclosure

## Compliance

This security implementation follows:
- OWASP Top 10 guidelines
- CWE (Common Weakness Enumeration) best practices
- Industry-standard security patterns
- Node.js security best practices
