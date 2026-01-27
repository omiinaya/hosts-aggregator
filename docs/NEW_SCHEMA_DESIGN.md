# New Database Schema Design

## Overview

This document describes the redesigned database schema for the hosts-aggregator project. The new schema eliminates file-based caching entirely and implements proper source-host relationship tracking through a database-first approach.

## Problem Statement

### Previous Schema Limitations

The old schema had several critical issues:

1. **Missing host-to-source relationship tracking** - Could not determine which domains came from which sources
2. **File-based caching causing orphaned cache files** - Cache files persisted after source deletion
3. **No granular domain-level source attribution** - Could not track individual domain origins
4. **Cannot track which domains came from which sources** - Limited visibility into data lineage
5. **No proper cleanup when sources are deleted** - Orphaned data accumulated over time

## New Schema Architecture

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│     Source      │────▶│  SourceHostMapping  │◀────│   HostEntry     │
├─────────────────┤     ├─────────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)             │     │ id (PK)         │
│ name (unique)   │     │ sourceId (FK)       │     │ domain (unique) │
│ url             │     │ hostEntryId (FK)    │     │ normalized      │
│ filePath        │     │ lineNumber          │     │ entryType       │
│ type            │     │ rawLine             │     │ firstSeen       │
│ enabled         │     │ comment             │     │ lastSeen        │
│ metadata        │     │ firstSeen           │     │ occurrenceCount │
│ createdAt       │     │ lastSeen            │     └─────────────────┘
│ updatedAt       │     └─────────────────────┘              │
└─────────────────┘                                          │
         │                                                   │
         │    ┌─────────────────┐                            │
         └───▶│  SourceContent  │                            │
              ├─────────────────┤                            │
              │ id (PK)         │                            │
              │ sourceId (FK)   │                            │
              │ content         │                            │
              │ contentHash     │                            │
              │ lineCount       │                            │
              │ entryCount      │                            │
              │ fetchedAt       │                            │
              └─────────────────┘                            │
                                                             │
         ┌─────────────────┐                                 │
         │ SourceFetchLog  │                                 │
         ├─────────────────┤                                 │
         │ id (PK)         │                                 │
         │ sourceId (FK)   │                                 │
         │ status          │                                 │
         │ httpStatus      │                                 │
         │ errorMessage    │                                 │
         │ responseTimeMs  │                                 │
         │ contentChanged  │                                 │
         │ fetchedAt       │                                 │
         └─────────────────┘                                 │
                                                             │
┌─────────────────────┐     ┌─────────────────┐              │
│   AggregationResult │◀────│ AggregationHost │──────────────┘
├─────────────────────┤     ├─────────────────┤
│ id (PK)             │     │ id (PK)         │
│ timestamp           │     │ aggregationId   │
│ totalSources        │     │ hostEntryId     │
│ successfulSources   │     │ sourceIds       │
│ failedSources       │     │ primarySourceId │
│ totalEntries        │     └─────────────────┘
│ uniqueEntries       │
│ duplicatesRemoved   │     ┌───────────────────┐
│ allowEntries        │◀────│ AggregationSource │
│ blockEntries        │     ├───────────────────┤
│ processingTimeMs    │     │ id (PK)           │
│ triggeredBy         │     │ aggregationId     │
│ filePath            │     │ sourceId          │
│ fileSizeBytes       │     │ entriesContributed│
│ fileHash            │     │ uniqueDomains     │
│ createdAt           │     │ fetchStatus       │
│ updatedAt           │     │ fetchDurationMs   │
└─────────────────────┘     └───────────────────┘
```

## Table Descriptions

### 1. Source Table

**Purpose**: Represents a hosts file source (URL or FILE type).

**Key Changes from Old Schema**:
- Removed `entryCount`, `lastFetched`, `lastFetchStatus`, `lastChecked` fields
- These are now tracked in related tables for better audit history

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `name` | String (unique) | Human-readable source name |
| `url` | String? | URL for URL-type sources |
| `filePath` | String? | Original upload path for FILE-type sources |
| `type` | String | 'URL' or 'FILE' |
| `enabled` | Boolean | Whether source is active |
| `metadata` | String? | JSON metadata |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Indexes**:
- `enabled` - For filtering active sources
- `type` - For filtering by source type

**Relationships**:
- `hostMappings` → SourceHostMapping[] (hosts from this source)
- `contentCache` → SourceContent? (cached content, replaces file cache)
- `fetchLogs` → SourceFetchLog[] (fetch history)
- `aggregationSources` → AggregationSource[] (aggregation participation)

---

### 2. HostEntry Table

**Purpose**: Stores unique host entries (domains) discovered from sources.

**Design Rationale**:
- Each domain is stored exactly once
- Source relationships tracked via SourceHostMapping
- Normalized field ensures case-insensitive deduplication

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `domain` | String (unique) | Original domain (e.g., "Ads.Example.COM") |
| `normalized` | String (unique) | Lowercase version (e.g., "ads.example.com") |
| `entryType` | String | 'block', 'allow', or 'element' |
| `firstSeen` | DateTime | When first discovered |
| `lastSeen` | DateTime | When last seen |
| `occurrenceCount` | Int | How many times seen across all sources |

**Indexes**:
- `domain` - For exact lookups
- `normalized` - For case-insensitive lookups
- `entryType` - For filtering by type
- `lastSeen` - For cleanup operations

**Relationships**:
- `sourceMappings` → SourceHostMapping[] (sources containing this host)
- `aggregationHosts` → AggregationHost[] (aggregations including this host)

---

### 3. SourceHostMapping Table

**Purpose**: Many-to-many relationship table linking Sources to HostEntries.

**Design Rationale**:
- Tracks which hosts came from which sources
- Stores context (line number, raw content) for debugging
- Enables efficient queries for hosts by source and vice versa

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `sourceId` | String (FK) | Reference to Source |
| `hostEntryId` | String (FK) | Reference to HostEntry |
| `lineNumber` | Int? | Line number in source file |
| `rawLine` | String? | Original line content |
| `comment` | String? | Inline comment from source |
| `firstSeen` | DateTime | When this mapping was created |
| `lastSeen` | DateTime | When this mapping was last updated |

**Constraints**:
- Unique constraint on `[sourceId, hostEntryId]` - prevents duplicate mappings

**Indexes**:
- `sourceId` - For finding all hosts from a source
- `hostEntryId` - For finding all sources for a host
- `firstSeen` - For chronological queries

**Cascade Behavior**:
- `onDelete: Cascade` on both relations - deleting a source or host removes all mappings

---

### 4. SourceContent Table

**Purpose**: Replaces file-based caching entirely.

**Design Rationale**:
- Stores raw content in the database
- One-to-one relationship with Source
- Content hash enables change detection without full comparison
- Eliminates orphaned cache files problem

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `sourceId` | String (FK, unique) | Reference to Source |
| `content` | String | Raw hosts file content |
| `contentHash` | String | SHA256 hash for change detection |
| `lineCount` | Int | Number of lines in content |
| `entryCount` | Int | Number of parsed entries |
| `fetchedAt` | DateTime | When content was fetched |
| `updatedAt` | DateTime | Last update timestamp |

**Indexes**:
- `contentHash` - For detecting duplicate content across sources
- `fetchedAt` - For cache freshness queries

**Cascade Behavior**:
- `onDelete: Cascade` - deleting a source removes its cached content

---

### 5. SourceFetchLog Table

**Purpose**: Tracks all fetch attempts for URL sources.

**Design Rationale**:
- Replaces `lastFetched` and `lastFetchStatus` fields from old schema
- Provides full audit history
- Enables debugging and monitoring

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `sourceId` | String (FK) | Reference to Source |
| `status` | String | 'SUCCESS', 'ERROR', 'TIMEOUT', 'NOT_MODIFIED' |
| `httpStatus` | Int? | HTTP response code |
| `errorMessage` | String? | Error details |
| `responseTimeMs` | Int? | Fetch duration |
| `contentChanged` | Boolean | Whether content changed from previous |
| `contentId` | String? | Reference to SourceContent if successful |
| `fetchedAt` | DateTime | When fetch occurred |

**Indexes**:
- `sourceId` - For fetch history by source
- `status` - For filtering by result
- `fetchedAt` - For chronological queries

**Cascade Behavior**:
- `onDelete: Cascade` - deleting a source removes its fetch history

---

### 6. AggregationResult Table

**Purpose**: Tracks aggregation runs with detailed statistics.

**Key Enhancements**:
- Per-source statistics via AggregationSource
- Host-level tracking via AggregationHost
- More detailed entry type breakdown

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `timestamp` | DateTime | When aggregation ran |
| `totalSources` | Int | Total sources processed |
| `successfulSources` | Int | Sources successfully fetched |
| `failedSources` | Int | Sources that failed |
| `totalEntries` | Int | Total entries before deduplication |
| `uniqueEntries` | Int | Unique domains after deduplication |
| `duplicatesRemoved` | Int | Number of duplicates removed |
| `allowEntries` | Int | Allow-list entries count |
| `blockEntries` | Int | Block-list entries count |
| `processingTimeMs` | Int | Aggregation duration |
| `triggeredBy` | String | 'manual', 'scheduled', 'auto', 'webhook' |
| `filePath` | String | Generated hosts file path |
| `fileSizeBytes` | Int? | Generated file size |
| `fileHash` | String? | Generated file hash |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Indexes**:
- `timestamp` - For chronological queries
- `createdAt` - For recent aggregation queries

**Relationships**:
- `sources` → AggregationSource[] (per-source stats)
- `hosts` → AggregationHost[] (host-level tracking)

---

### 7. AggregationSource Table

**Purpose**: Junction table linking AggregationResults to Sources with per-source statistics.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `aggregationResultId` | String (FK) | Reference to AggregationResult |
| `sourceId` | String (FK) | Reference to Source |
| `entriesContributed` | Int | Entries from this source |
| `uniqueDomainsContributed` | Int | Unique domains from this source |
| `fetchStatus` | String | 'SUCCESS', 'ERROR', 'CACHED', 'SKIPPED' |
| `fetchDurationMs` | Int? | Time to fetch this source |

**Constraints**:
- Unique constraint on `[aggregationResultId, sourceId]`

**Indexes**:
- `aggregationResultId` - For finding all sources in an aggregation
- `sourceId` - For finding all aggregations for a source

**Cascade Behavior**:
- `onDelete: Cascade` on both relations

---

### 8. AggregationHost Table

**Purpose**: Junction table linking AggregationResults to HostEntries.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String (CUID) | Primary key |
| `aggregationResultId` | String (FK) | Reference to AggregationResult |
| `hostEntryId` | String (FK) | Reference to HostEntry |
| `sourceIds` | String | JSON array of contributing source IDs |
| `primarySourceId` | String | First source that contributed this host |

**Constraints**:
- Unique constraint on `[aggregationResultId, hostEntryId]`

**Indexes**:
- `aggregationResultId` - For finding all hosts in an aggregation
- `hostEntryId` - For finding all aggregations containing a host
- `primarySourceId` - For attribution queries

**Cascade Behavior**:
- `onDelete: Cascade` on both relations

---

## Key Design Decisions

### 1. Elimination of File-Based Caching

**Problem**: File-based caching caused orphaned files when sources were deleted.

**Solution**: [`SourceContent`](backend/prisma/schema.prisma:115) table stores content in the database with cascade delete.

**Benefits**:
- No orphaned cache files
- Transactional consistency
- Queryable content
- Automatic cleanup on source deletion

### 2. Many-to-Many Source-Host Relationships

**Problem**: Could not track which domains came from which sources.

**Solution**: [`SourceHostMapping`](backend/prisma/schema.prisma:82) junction table with metadata.

**Benefits**:
- Full source attribution for every domain
- Context preservation (line numbers, comments)
- Efficient bidirectional queries
- Proper cascade deletion

### 3. Normalized Domain Storage

**Problem**: Case sensitivity caused duplicate entries.

**Solution**: [`HostEntry.normalized`](backend/prisma/schema.prisma:66) field stores lowercase version.

**Benefits**:
- Case-insensitive deduplication
- Preserves original casing for display
- Unique constraint prevents duplicates

### 4. Audit History for Fetches

**Problem**: Limited visibility into fetch history and failures.

**Solution**: [`SourceFetchLog`](backend/prisma/schema.prisma:147) table tracks all fetch attempts.

**Benefits**:
- Full fetch history
- Error tracking and debugging
- Performance monitoring
- Content change detection

### 5. Granular Aggregation Tracking

**Problem**: Could not track per-source contributions to aggregations.

**Solution**: [`AggregationSource`](backend/prisma/schema.prisma:229) and [`AggregationHost`](backend/prisma/schema.prisma:256) tables.

**Benefits**:
- Per-source statistics
- Host-level source attribution
- Historical aggregation data
- Debugging and auditing

## Query Patterns

### Get All Hosts from a Source

```typescript
const hosts = await prisma.sourceHostMapping.findMany({
  where: { sourceId: 'source-id' },
  include: { hostEntry: true }
});
```

### Get All Sources for a Host

```typescript
const sources = await prisma.sourceHostMapping.findMany({
  where: { hostEntryId: 'host-id' },
  include: { source: true }
});
```

### Get Cached Content for a Source

```typescript
const content = await prisma.sourceContent.findUnique({
  where: { sourceId: 'source-id' }
});
```

### Get Latest Aggregation with Source Details

```typescript
const aggregation = await prisma.aggregationResult.findFirst({
  orderBy: { timestamp: 'desc' },
  include: {
    sources: {
      include: { source: true }
    },
    hosts: {
      include: { hostEntry: true }
    }
  }
});
```

### Get Fetch History for a Source

```typescript
const logs = await prisma.sourceFetchLog.findMany({
  where: { sourceId: 'source-id' },
  orderBy: { fetchedAt: 'desc' },
  take: 10
});
```

## Migration Strategy

### Step 1: Schema Migration

Create new tables and modify existing ones:

```sql
-- Remove deprecated fields from Source
ALTER TABLE sources DROP COLUMN entryCount;
ALTER TABLE sources DROP COLUMN lastFetched;
ALTER TABLE sources DROP COLUMN lastFetchStatus;
ALTER TABLE sources DROP COLUMN lastChecked;

-- Create new tables (Prisma migration will handle this)
```

### Step 2: Data Migration

1. **Migrate cache files to SourceContent**:
   - Read each cache file
   - Create SourceContent record
   - Calculate content hash

2. **Parse and create HostEntry records**:
   - Parse content from SourceContent
   - Create unique HostEntry for each domain
   - Create SourceHostMapping for each source-host pair

3. **Create initial SourceFetchLog entries**:
   - Create log entry for each source's current state

### Step 3: Code Updates

1. Update [`aggregation.service.ts`](backend/src/services/aggregation.service.ts) to use new schema
2. Update [`file.service.ts`](backend/src/services/file.service.ts) to use SourceContent instead of files
3. Update controllers to leverage new relationships
4. Remove file-based cache operations

## Performance Considerations

### Indexes

All tables have appropriate indexes for common query patterns:
- Foreign key indexes for join performance
- Timestamp indexes for chronological queries
- Unique indexes for constraint enforcement

### Query Optimization

- Use `include` for related data fetching
- Leverage Prisma's query batching
- Consider pagination for large result sets

### Storage

- SourceContent stores full text - monitor database size
- Consider content compression for large sources
- Implement retention policies for old AggregationResults

## Data Integrity

### Cascade Deletes

All relationships use `onDelete: Cascade`:
- Deleting a Source removes:
  - SourceContent
  - SourceHostMappings
  - SourceFetchLogs
  - AggregationSources
- Deleting a HostEntry removes:
  - SourceHostMappings
  - AggregationHosts
- Deleting an AggregationResult removes:
  - AggregationSources
  - AggregationHosts

### Unique Constraints

- `Source.name` - prevents duplicate source names
- `HostEntry.domain` and `HostEntry.normalized` - prevents duplicate domains
- `SourceHostMapping[sourceId, hostEntryId]` - prevents duplicate mappings
- `SourceContent.sourceId` - one content per source
- `AggregationSource[aggregationResultId, sourceId]` - one entry per source per aggregation
- `AggregationHost[aggregationResultId, hostEntryId]` - one entry per host per aggregation

## Benefits Summary

1. **No Orphaned Data**: Cascade deletes ensure clean removal
2. **Full Attribution**: Every domain can be traced to its source(s)
3. **Audit History**: Complete fetch and aggregation history
4. **Query Flexibility**: Rich relationships enable complex queries
5. **Data Integrity**: Constraints prevent inconsistencies
6. **Performance**: Proper indexes optimize common operations
7. **Maintainability**: Clear schema with comprehensive documentation
