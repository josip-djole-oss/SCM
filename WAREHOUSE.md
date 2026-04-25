# Warehouse Management System

## Overview

The Warehouse Management System is a new module in CMAX SCM that allows admins to:
- Manage inventory items (create, read, update, delete)
- Assign warehouse items to specific admins
- Track warehouse operations through separate logs
- Multi-language support (Croatian included)

## Features

### Inventory Management
- **Create Items**: Add new warehouse items with name, description, quantity, unit, category, location
- **Update Items**: Modify existing items
- **Delete Items**: Remove items (automatically removes from all admin assignments)
- **List Items**: View all warehouse inventory
- **Data Validation**: All inputs sanitized and validated

### Admin Assignment System
- **Assign Items**: Assign warehouse items to specific admins
- **Unassign Items**: Remove items from admin assignments
- **View Assignments**: See which items are assigned to which admins
- **Batch Operations**: Assign/unassign multiple items at once

### Separate Logging
- **Warehouse Logs**: Separate from admin panel logs
- **Activity Tracking**: All warehouse operations logged with timestamp and user
- **Log Retention**: Last 5000 warehouse operations retained
- **Log Clearing**: Admin can clear warehouse logs (requires permission)

## Data Structure

### Warehouse File (`server/data/warehouse.json`)
```json
{
  "version": 1,
  "items": [
    {
      "id": "item-001",
      "name": "Krv kolodvor",
      "description": "Početna stanica",
      "quantity": 5,
      "unit": "komada",
      "category": "oprema",
      "location": "Skladište A",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "adminAssignments": {
    "admin@example.com": ["item-001", "item-002"],
    "supervisor@example.com": ["item-001"]
  },
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Warehouse Logs File (`server/data/warehouse-logs.json`)
```json
[
  {
    "timestamp": "2024-01-15T10:05:00Z",
    "user": "admin@example.com",
    "action": "create_item",
    "details": {
      "id": "item-001",
      "name": "Krv kolodvor"
    }
  },
  {
    "timestamp": "2024-01-15T10:10:00Z",
    "user": "admin@example.com",
    "action": "assign_admin",
    "details": {
      "adminEmail": "supervisor@example.com",
      "itemIds": ["item-001"]
    }
  }
]
```

## API Endpoints

### Get Warehouse Inventory
```
GET /api/warehouse
```
**Requires**: `canViewWarehouse` permission

**Response**:
```json
{
  "version": 1,
  "items": [...],
  "adminAssignments": {...},
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Create/Update Warehouse Item
```
POST /api/warehouse
```
**Requires**: `canManageWarehouse` permission

**Request Body**:
```json
{
  "item": {
    "id": "item-001",
    "name": "Krv kolodvor",
    "description": "Početna stanica",
    "quantity": 5,
    "unit": "komada",
    "category": "oprema",
    "location": "Skladište A"
  }
}
```

**Response**:
```json
{
  "success": true,
  "item": {
    "id": "item-001",
    "name": "Krv kolodvor",
    "description": "Početna stanica",
    "quantity": 5,
    "unit": "komada",
    "category": "oprema",
    "location": "Skladište A",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### Delete Warehouse Item
```
DELETE /api/warehouse/:itemId
```
**Requires**: `canManageWarehouse` permission

**Response**:
```json
{
  "success": true
}
```

### Get Admin Assignments
```
GET /api/warehouse/admin-assignments
```
**Requires**: `canViewWarehouse` permission

**Response**:
```json
{
  "admin@example.com": ["item-001", "item-002"],
  "supervisor@example.com": ["item-001"]
}
```

### Assign Items to Admin
```
POST /api/warehouse/assign-admin
```
**Requires**: `canAssignWarehouseToAdmin` permission

**Request Body**:
```json
{
  "adminEmail": "supervisor@example.com",
  "itemIds": ["item-001", "item-002"]
}
```

**Response**:
```json
{
  "success": true,
  "assignedItemIds": ["item-001", "item-002"]
}
```

### Unassign Items from Admin
```
POST /api/warehouse/unassign-admin
```
**Requires**: `canAssignWarehouseToAdmin` permission

**Request Body**:
```json
{
  "adminEmail": "supervisor@example.com",
  "itemIds": ["item-001"]
}
```

**Response**:
```json
{
  "success": true,
  "unassignedItemIds": ["item-001"]
}
```

### Get Warehouse Logs
```
GET /api/warehouse-logs
```
**Requires**: `canViewLogs` permission

**Response**:
```json
[
  {
    "timestamp": "2024-01-15T10:05:00Z",
    "user": "admin@example.com",
    "action": "create_item",
    "details": {...}
  },
  ...
]
```

### Clear Warehouse Logs
```
DELETE /api/warehouse-logs
```
**Requires**: `canClearLogs` permission

**Response**:
```json
{
  "success": true
}
```

## Permissions

New permissions added to control warehouse access:

| Permission | Description | Default |
|-----------|-------------|---------|
| `canViewWarehouse` | View warehouse inventory | false |
| `canManageWarehouse` | Add/edit/delete warehouse items | false |
| `canAssignWarehouseToAdmin` | Assign items to admins | false |
| `canModifyReadOnly` | Manage read-only mode settings | false |
| `canToggleReadOnly` | Enable/disable read-only for users | false |

## Usage Examples

### JavaScript/Fetch API

#### Get all warehouse items
```javascript
const response = await fetch('/api/warehouse', {
  method: 'GET',
  headers: {
    'x-csrf-token': csrfToken
  },
  credentials: 'include'
});
const warehouse = await response.json();
console.log(warehouse.items);
```

#### Create a new warehouse item
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
      name: 'Krv kolodvor',
      description: 'Početna stanica',
      quantity: 5,
      unit: 'komada',
      category: 'oprema',
      location: 'Skladište A'
    }
  }),
  credentials: 'include'
});
const result = await response.json();
console.log('Item created:', result.item);
```

#### Assign items to an admin
```javascript
const response = await fetch('/api/warehouse/assign-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken
  },
  body: JSON.stringify({
    adminEmail: 'supervisor@example.com',
    itemIds: ['item-001', 'item-002']
  }),
  credentials: 'include'
});
const result = await response.json();
console.log('Items assigned:', result.assignedItemIds);
```

## Security Considerations

### Data Protection
- All warehouse data is protected by authentication and permission checks
- Only users with appropriate permissions can access warehouse APIs
- Warehouse logs are separate from admin panel logs
- Read-only users cannot modify warehouse data

### Access Control
- Super admins can always access warehouse
- Regular admins need specific permissions
- Guest users cannot access warehouse (unless explicitly granted permission)
- All operations are logged

### Input Validation
- All item IDs, names, and other fields are sanitized
- Invalid items are rejected with clear error messages
- Email addresses are validated for admin assignments

## Integration with Admin Panel

The warehouse system integrates with the admin panel:

1. **Tab in Admin Panel**: New "Skladište" (Warehouse) tab
2. **Permission Management**: Warehouse permissions in permission editor
3. **Activity Logging**: Warehouse actions appear in warehouse-specific logs
4. **Admin Assignment**: Assign warehouse items to other admins

## Multilingual Support

Warehouse terms translated to Croatian:

- `btnWarehouse`: "Skladište"
- `warehouseTitle`: "Upravljanje Skladištem"
- `warehouseTabItems`: "Stavke"
- `warehouseTabAssignments`: "Dodjele"
- `warehouseTabLogs`: "Skladišne logove"
- `warehouseItemName`: "Naziv stavke"
- And many more...

## Performance Considerations

- Warehouse data loaded on demand
- Large item lists may need pagination in future
- Logs limited to 5000 entries for performance
- Admin assignments use efficient lookup

## Future Enhancements

Possible future features:
- Item quantity tracking and alerts
- Warehouse item categorization and filtering
- Inventory history and change tracking
- Item image attachments
- Barcode/QR code scanning support
- Warehouse transfer between admins with approval workflow
- Warehouse analytics and reporting

## Troubleshooting

### Warehouse items not loading
- Check user has `canViewWarehouse` permission
- Verify authentication is valid
- Check browser console for network errors
- Verify `warehouse.json` file exists in `server/data/`

### Cannot assign items to admin
- Ensure user has `canAssignWarehouseToAdmin` permission
- Verify admin email is correct and exists
- Ensure items exist in warehouse
- Check CSRF token is valid

### Warehouse logs not clearing
- Verify user has `canClearLogs` permission
- Check for network errors in browser console
- Verify server has write permissions to `warehouse-logs.json`

## Support

For issues or questions about the warehouse system:
1. Check this documentation
2. Review server logs: `server/data/server-errors.log`
3. Check warehouse-specific logs: `server/data/warehouse-logs.json`
4. Contact system administrator
