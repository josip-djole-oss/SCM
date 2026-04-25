# CMAX SCM

A comprehensive construction planning application with server-side data storage, file uploads, and multi-site support.

## Features

- **Work Scheduling**: Plan workers, lifts, and construction moments
- **Waste Bin Management**: Track bin availability and status
- **Tidplan (Timeline)**: Visual timeline planning with Gantt charts
- **Reports System**: Report lift issues with approval workflow
- **Warehouse Management**: Manage inventory items and assign to admins (NEW)
- **Admin Panel**: Manage users, permissions, and system settings
- **Multi-language Support**: Croatian, English, Swedish
- **Dark Mode & Themes**: Customizable UI themes
- **File Uploads**: Upload images and documents
- **Server-side Storage**: Data persistence with automatic backups
- **Multi-site Support**: Manage multiple construction sites
- **Read-Only Mode**: Restrict users to viewing specific data
- **Enterprise Security**: CSRF protection, rate limiting, input validation

## Installation

1. **Clone or download** the project files to your server
2. **Install Node.js** (version 14 or higher) from https://nodejs.org
3. **Navigate to the project directory**:
   ```bash
   cd "Cmax Planner"
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 by default. Access the application at:
```
http://localhost:3000
```

## Project Structure

```
Cmax Planner/
├── public/                 # Static web files
│   ├── index.html         # Main HTML page
│   ├── styles.css         # CSS styles
│   └── script.js          # JavaScript logic
├── server/                # Server-side code
│   └── server.js          # Express server
├── data/                  # Data storage (auto-created)
├── uploads/               # File uploads (auto-created)
├── package.json           # Node.js dependencies
└── README.md             # This file
```

## Bootstrap Admin

Za novi deployment koristi `.env.example` i postavi:

- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`

Ako `admins.json` već postoji, server će zadržati postojeće admine i automatski hashirati stare plain-text lozinke pri startupu.

## Features Overview

### Main Planning View
- Assign workers to specific plans, karnas, and moments
- Track lift availability and assignments
- Mark worker attendance and lift status
- Add comments to planning entries

### Bins Management
- Track waste bin availability per plan/karna
- Monitor bin status (OK, Low, Not enough, etc.)
- Editable columns based on permissions

### Tidplan (Timeline)
- Visual Gantt chart for construction activities
- Filter by plan, zone, moment
- Manage zones with custom colors
- Sort and organize activities

### Reports System
- Report lift issues with details
- Admin approval workflow
- Notification system for new reports

### Admin Features
- User management with granular permissions
- System logs and activity monitoring
- Theme and language settings
- Data export capabilities
- **Warehouse Management**: Create and manage inventory items (NEW)
- **Admin Assignment**: Assign warehouse items to specific admins (NEW)
- **Read-Only Mode**: Restrict users to viewing specific data (NEW)

### Warehouse Management (NEW)

Manage construction site inventory with the new Warehouse module:
- **Create Items**: Add inventory items with name, quantity, unit, category, location
- **Assign to Admins**: Assign warehouse items to specific team members
- **Track Operations**: Separate warehouse activity logs
- **Permissions**: Granular control over who can manage warehouse inventory

See [WAREHOUSE.md](WAREHOUSE.md) for detailed documentation.

### Read-Only Mode (NEW)

Create read-only user accounts for viewing and monitoring:
- **Enable/Disable**: Toggle read-only mode for any admin
- **Site-Based Access**: Restrict read-only users to specific construction sites
- **View Only**: Read-only users cannot modify any data
- **Audit Trail**: All read-only user activities are logged

See [SECURITY.md](SECURITY.md) for detailed information.

## File Uploads

The application supports uploading images and documents. Files are automatically organized by date in the `uploads/` directory.

Supported file types:
- Images: JPG, PNG, GIF
- Documents: PDF, DOC, DOCX, XLS, XLSX

## Data Storage

All data is stored server-side in JSON files within the `data/` directory:
- `state.json` - Main application state
- `admins.json` - User accounts and permissions
- `reports.json` - Lift reports
- `logs.json` - Activity logs
- `warehouse.json` - Warehouse inventory and admin assignments (NEW)
- `warehouse-logs.json` - Warehouse activity logs (NEW)

## Multi-Site Support

The application supports multiple construction sites. Each site has its own data storage and can be switched between using the site selector.

## Security

- **Authentication**: Server-side session authentication with `HttpOnly` cookie
- **Authorization**: Role-based access control (RBAC) with granular permissions
- **CSRF Protection**: CSRF tokens for all mutating API requests
- **Password Security**: Passwords hashed with `bcryptjs` (12 rounds)
- **Rate Limiting**: Login endpoint limited to 10 attempts per 15 minutes
- **API Rate Limiting**: General API limited to 300 requests per minute
- **CORS**: Restricted CORS allowlist via environment variables
- **Security Headers**: Helmet.js for X-Frame-Options, XSS Protection, etc.
- **Input Validation**: All inputs sanitized and validated
- **File Uploads**: Size and type restrictions, random file naming
- **Session Security**: Session expiration (8 hours), auto-cleanup of expired sessions
- **Read-Only Mode**: Enforcement of read-only restrictions on all operations
- **Backup Security**: Daily automated backups in `server/backups/`
- **Error Handling**: Internal errors not exposed in production
- **Audit Logs**: Comprehensive activity logging for admin actions
- **Warehouse Logs**: Separate logging for warehouse operations

### Security Documentation

See [SECURITY.md](SECURITY.md) for comprehensive security guidelines and best practices.

See [TESTING_SECURITY.md](TESTING_SECURITY.md) for security testing procedures and vulnerability verification.

## Troubleshooting

### Port Already in Use
If port 3000 is busy, you can change it in `server/server.js`:
```javascript
const PORT = process.env.PORT || 3001; // Change to desired port
```

### Permission Errors
Make sure the user running the server has write permissions to the project directory.

### Missing Dependencies
Run `npm install` again if you encounter module errors.

## Development

The application uses:
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express
- **File Storage**: JSON files (easily replaceable with database)
- **Libraries**: jsPDF for PDF export, Flatpickr for date picking

## License

MIT License - feel free to modify and distribute.
