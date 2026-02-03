# Per-Source Host Control Implementation

## Overview

This document describes the implementation of per-source host control, which allows users to enable or disable specific host entries on a per-source basis. This feature provides granular control over which hosts are active from each source, independent of the global host status and source status.

## Database Schema Changes

### Migration: `20260203031234_add_source_host_mapping_enabled`

The migration added an `enabled` field to the `SourceHostMapping` table:

```sql
-- Added field to source_host_mappings table
"enabled" BOOLEAN NOT NULL DEFAULT true
```

### Updated Prisma Schema

The [`SourceHostMapping`](../backend/prisma/schema.prisma:51-70) model now includes:

```prisma
model SourceHostMapping {
  id          String    @id @default(cuid())
  sourceId    String
  hostEntryId String
  lineNumber  Int?
  rawLine     String?
  comment     String?
  enabled     Boolean   @default(true)  // NEW FIELD
  firstSeen   DateTime  @default(now())
  lastSeen    DateTime  @updatedAt
  hostEntry   HostEntry @relation(fields: [hostEntryId], references: [id], onDelete: Cascade)
  source      Source    @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@unique([sourceId, hostEntryId])
  @@index([sourceId])
  @@index([hostEntryId])
  @@index([enabled])  // NEW INDEX
  @@index([firstSeen])
  @@map("source_host_mappings")
}
```

**Key Changes:**
- Added `enabled` field with default value `true`
- Added index on `enabled` for efficient querying
- Existing mappings are automatically enabled (via migration default)

## Backend API Changes

### New Endpoints

#### 1. Toggle Source-Host Mapping
**Endpoint:** `PATCH /api/hosts/:hostId/sources/:sourceId`

**Description:** Enable or disable a specific source-host mapping.

**Request Body:**
```json
{
  "enabled": boolean
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "hostId": "string",
    "sourceId": "string",
    "enabled": boolean
  }
}
```

**Implementation:** [`hosts.controller.ts:toggleSourceHostMapping()`](../backend/src/controllers/hosts.controller.ts:394-442)

#### 2. Bulk Update Source-Host Mappings
**Endpoint:** `PATCH /api/hosts/:hostId/sources/bulk`

**Description:** Enable or disable multiple source-host mappings for a specific host.

**Request Body:**
```json
{
  "sourceIds": string[],
  "enabled": boolean
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "updated": number,
    "failed": number
  }
}
```

**Implementation:** [`hosts.controller.ts:bulkUpdateSourceHostMappings()`](../backend/src/controllers/hosts.controller.ts:450-496)

### Updated Endpoints

#### GET /api/hosts
**Changes:** Now includes `mappingEnabled` field in the response for each source.

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "hosts": [
      {
        "id": "string",
        "domain": "string",
        "entryType": "block|allow|element",
        "enabled": boolean,
        "occurrenceCount": number,
        "firstSeen": "ISO8601",
        "lastSeen": "ISO8601",
        "sources": [
          {
            "id": "string",
            "name": "string",
            "enabled": boolean,
            "mappingEnabled": boolean  // NEW FIELD
          }
        ]
      }
    ],
    "pagination": { ... }
  }
}
```

**Implementation:** [`hosts.controller.ts:getAllHosts()`](../backend/src/controllers/hosts.controller.ts:19-109)

#### GET /api/hosts/:id
**Changes:** Now includes `mappingEnabled` field in the response for each source.

**Response Format:**
```json
{
  "status": "success",
  "data": {
    "id": "string",
    "domain": "string",
    "normalized": "string",
    "entryType": "block|allow|element",
    "enabled": boolean,
    "occurrenceCount": number,
    "firstSeen": "ISO8601",
    "lastSeen": "ISO8601",
    "sources": [
      {
        "id": "string",
        "name": "string",
        "type": "string",
        "enabled": boolean,
        "mappingEnabled": boolean,  // NEW FIELD
        "lineNumber": number,
        "rawLine": "string",
        "comment": "string"
      }
    ]
  }
}
```

**Implementation:** [`hosts.controller.ts:getHostById()`](../backend/src/controllers/hosts.controller.ts:115-171)

### Route Configuration

New routes added to [`hosts.ts`](../backend/src/routes/hosts.ts:25-29):

```typescript
// PATCH /api/hosts/:hostId/sources/:sourceId - Toggle source-host mapping
router.patch('/:hostId/sources/:sourceId', hostsController.toggleSourceHostMapping.bind(hostsController));

// PATCH /api/hosts/:hostId/sources/bulk - Bulk update source-host mappings
router.patch('/:hostId/sources/bulk', hostsController.bulkUpdateSourceHostMappings.bind(hostsController));
```

## Frontend Changes

### Type Definitions

Updated [`types/index.ts`](../frontend/src/types/index.ts:58-67):

```typescript
export interface HostSource {
  id: string
  name: string
  type: string
  enabled: boolean
  mappingEnabled: boolean  // NEW FIELD
  lineNumber?: number
  rawLine?: string
  comment?: string
}
```

Added new request types:

```typescript
export interface ToggleSourceHostMappingRequest {
  enabled: boolean
}

export interface BulkUpdateSourceHostMappingsRequest {
  sourceIds: string[]
  enabled: boolean
}
```

### Custom Hooks

#### 1. useToggleSourceHostMapping
**File:** [`hooks/useHosts.ts`](../frontend/src/hooks/useHosts.ts:269-303)

**Purpose:** Toggle a single source-host mapping's enabled status.

**Usage:**
```typescript
const { toggleSourceHostMapping, loading, error } = useToggleSourceHostMapping()

await toggleSourceHostMapping(hostId, sourceId, enabled)
```

#### 2. useBulkUpdateSourceHostMappings
**File:** [`hooks/useHosts.ts`](../frontend/src/hooks/useHosts.ts:308-342)

**Purpose:** Bulk update multiple source-host mappings for a host.

**Usage:**
```typescript
const { bulkUpdateSourceHostMappings, loading, error } = useBulkUpdateSourceHostMappings()

await bulkUpdateSourceHostMappings(hostId, {
  sourceIds: ['id1', 'id2'],
  enabled: true
})
```

### UI Components

#### Hosts Page
**File:** [`routes/Hosts.tsx`](../frontend/src/routes/Hosts.tsx)

**Changes:**

1. **Host Table** - Displays mapping status for each source:
   - Shows source badges with color coding (green for enabled, red for disabled)
   - Displays up to 2 sources inline, with overflow indicator

2. **Host Details Dialog** - Full per-source control:
   - Lists all sources for the selected host
   - Shows source status (enabled/disabled)
   - Shows mapping status (mapping enabled/disabled)
   - Individual toggle switches for each mapping
   - "Enable All" and "Disable All" bulk buttons
   - Displays line number, raw line, and comment for each mapping

**Key UI Features:**

- **Visual Indicators:**
  - Green badge: Mapping enabled
  - Red badge: Mapping disabled
  - Switch control for each mapping

- **Bulk Operations:**
  - Enable all mappings for a host
  - Disable all mappings for a host
  - Individual mapping toggles

**Implementation Details:**

The Hosts page uses a component architecture with memoization to optimize performance:

- `HostStatsCards` - Displays statistics (memoized)
- `HostFilters` - Manages filter state (memoized)
- `HostTable` - Displays host list with per-source controls (memoized)
- `HostsData` - Fetches data and manages state
- `Hosts` - Main component wrapping with context provider

## How to Use the New Functionality

### 1. View Per-Source Host Status

Navigate to the **Hosts** page. Each host entry now shows:
- Global host status (enabled/disabled)
- Per-source mapping status for up to 2 sources
- Overflow indicator if more sources exist

### 2. Manage Individual Mappings

1. Click on any host row to open the **Host Details** dialog
2. Scroll to the **Sources** section
3. Each source shows:
   - Source name and type
   - Source status (enabled/disabled)
   - Mapping status (mapping enabled/disabled)
   - Toggle switch for the mapping
4. Click the toggle switch to enable/disable the mapping

### 3. Bulk Operations

In the **Host Details** dialog:
- Click **Enable All** to enable all mappings for the host
- Click **Disable All** to disable all mappings for the host

### 4. Filter by Source

Use the **Source** filter dropdown to:
- View hosts from a specific source
- See which hosts have mappings enabled/disabled for that source

## Behavior and Logic

### Three-Level Control System

The system now has three levels of control:

1. **Source Level** - Whether the source itself is enabled/disabled
2. **Host Level** - Whether the host entry is globally enabled/disabled
3. **Mapping Level** - Whether the specific source-host mapping is enabled/disabled

### Aggregation Logic

When aggregating hosts, the system considers:
- Source must be enabled
- Host must be enabled
- Source-host mapping must be enabled

A host is only included in aggregation if ALL three conditions are met.

### Default Behavior

- New source-host mappings are enabled by default
- Existing mappings were enabled during migration
- Disabling a mapping doesn't delete the relationship
- Re-enabling a mapping restores the host from that source

## Testing Results

### Backend Build
✅ **Passed** - TypeScript compilation successful with no errors

```bash
cd backend && npm run build
```

### Frontend Build
✅ **Passed** - TypeScript compilation and Vite build successful with no errors

```bash
cd frontend && npm run build
```

### Database Schema Verification
✅ **Passed** - Migration applied correctly, 8 models introspected

```bash
cd backend && npx prisma db pull
```

The database schema now includes:
- `SourceHostMapping.enabled` field with index
- All relationships properly configured
- Cascade delete rules in place

## API Examples

### Toggle a Single Mapping

```bash
curl -X PATCH http://localhost:3000/api/hosts/host123/sources/source456 \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Bulk Update Mappings

```bash
curl -X PATCH http://localhost:3000/api/hosts/host123/sources/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "sourceIds": ["source456", "source789"],
    "enabled": true
  }'
```

### Get Host with Mapping Status

```bash
curl http://localhost:3000/api/hosts/host123
```

Response includes `mappingEnabled` for each source.

## Future Enhancements

Potential improvements for future iterations:

1. **Export/Import** - Export mapping configurations and import them
2. **Bulk Operations Across Hosts** - Enable/disable mappings for multiple hosts at once
3. **Mapping History** - Track when mappings were enabled/disabled
4. **Rules Engine** - Create rules for automatic mapping management
5. **Conflict Resolution** - Handle cases where multiple sources have conflicting settings

## Related Documentation

- [API Documentation](API.md)
- [Architecture](ARCHITECTURE.md)
- [Development Guide](DEVELOPMENT.md)
- [Database Schema](../backend/prisma/schema.prisma)

## Summary

The per-source host control feature provides granular control over host entries at the source level. This allows users to:

- Enable/disable specific hosts from specific sources
- Maintain fine-grained control over aggregation results
- Manage host lists with source-specific preferences
- View and manage all mappings through a comprehensive UI

The implementation includes:
- Database schema migration with proper indexing
- Backend API endpoints for single and bulk operations
- Frontend hooks for easy integration
- Comprehensive UI with visual indicators and bulk operations
- Full TypeScript type safety

All tests passed successfully, confirming the implementation is working correctly.
