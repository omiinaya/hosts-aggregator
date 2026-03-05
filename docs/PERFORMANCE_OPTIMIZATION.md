# Performance Optimization: Source Add/Delete Workflow

## Status: ✅ COMPLETED (Incremental Aggregation Implemented)

**Implementation Date:** March 2026  
**Developer:** opencode (AI assistant)

---

## What Was Implemented

### 1. Incremental Aggregation Methods

Added to `aggregation.service.ts`:

- `incrementalAddSource(sourceId)` - Adds a single source to existing aggregation without re-processing all sources
- `incrementalDeleteSource(sourceId)` - Removes a single source from aggregation without full rebuild
- Both methods operate on the normalized many-to-many schema via `AggregationHostSource` join table

### 2. Schema Redesign

**Prisma Schema Changes:**

- ✅ Removed `sourceIds` JSON field from `AggregationHost`
- ✅ Added `AggregationHostSource` model linking `AggregationHost` ↔ `Source`
- ✅ Added proper indexes on join table fields
- ✅ Schema now fully normalized for efficient querying

**Migration required:** Run `prisma generate` and apply database changes. Existing data will need migration script (not yet implemented).

### 3. Controllers Updated

All source mutation endpoints now use incremental updates:

- ✅ `POST /api/sources` - When `enabled=true`: calls `processSource()` then `incrementalAddSource()`
- ✅ `PATCH /api/sources/:id` - If URL changed or enabled: `incrementalDeleteSource()` (if was enabled), then `processSource()`, then `incrementalAddSource()`
- ✅ `DELETE /api/sources/:id` - If source was enabled: calls `incrementalDeleteSource()`
- ✅ `PATCH /api/sources/:id/toggle` - Off: `incrementalDeleteSource()`, On: `processSource()`+`incrementalAddSource()`
- ✅ `POST /api/sources/:id/refresh` - Only calls `processSource()` (content only, no aggregation table changes)
- ⚠️ `POST /api/sources/:id/refresh-cache` - **STILL SLOW** - calls full `aggregateSources()` (fallback)
- ⚠️ `POST /api/sources/refresh-all-cache` - **STILL SLOW** - calls full `aggregateSources()` (fallback)

### 4. Progress Tracking

- ✅ `AggregationProgress` interface exported
- ✅ `updateProgress()` method added to `AggregationService`
- ✅ All incremental endpoints update progress (totalSources=1, status running/completed/error)
- ✅ Frontend already polls `/api/aggregate/progress` - shows progress bar

### 5. HostsController Updates

- ✅ `getAllHosts()` - Now queries normalized schema via `AggregationHost` + `AggregationHostSource`
- ✅ `getHostById()` - Same
- ✅ `getHostStats()` - Same

---

## Performance Impact

### Expected Improvements

| Operation | Old (Full Agg) | New (Incremental) | Improvement |
|-----------|----------------|-------------------|-------------|
| Add source | 1-2 min (all sources) | ~5-10 sec (1 source only) | **10x** (relative) |
| Delete source | 1-2 min (blocking) | <1 sec | **100x+** |
| Toggle source | 1-2 min | <1 sec | **100x+** |
| Update source (URL) | 1-2 min | ~5-10 sec | **10x** |
| Refresh source (content) | ~seconds | ~seconds | same |

**Note:** Absolute improvement depends on source size. A 150k-entry source still takes time to fetch/parse/store, but we no longer re-process ALL other sources.

### Actual Testing Required

If you're not seeing improvement when adding a source through the UI:

1. **Are you testing "refresh cache" or "refresh all"?** Those endpoints still use full aggregation and will be slow by design. Test creating a new source, deleting a source, or toggling a source.

2. **What source are you testing?** Large sources (e.g., big.oisd.nl with 150k+ entries) will still take several seconds to process even incrementally. That's expected - we're still doing O(entries) work, just for one source instead of all.

3. **Check the logs** - With timing logs added, you should see:
   ```
   [TIMING] incrementalAddSource START
   [TIMING] Fetch source: Xms
   [TIMING] Get latest aggregation result ID: Xms
   [TIMING] Built domain map: Xms
   [TIMING] Fetched existing host entries: Xms
   ...
   ```
   This will show where time is spent.

---

## Current Bottlenecks (Not Yet Solved)

1. **Bulk Upsert Still Individual** - `storeSourceEntries()` uses per-entry `upsert` within batches. Could be optimized with raw SQL bulk `INSERT OR REPLACE`.

2. **Multiple Round-trips** - `incrementalAddSource()` does:
   - `findMany` existing hostEntries
   - `create` missing hostEntries (one-by-one in transaction)
   - `findMany` existing aggregationHosts
   - `createMany` new aggregationHosts
   - `findMany` created hosts (to get IDs)
   - `createMany` aggregationHostSource
   Could be consolidated with fewer queries.

3. **Full Aggregation Fallbacks** - The `refresh-cache` endpoints still trigger full aggregation. Consider deprecating or making them async.

4. **No Redis Caching** - Served hosts file still regenerated on every request. Planned but not implemented.

5. **Stale Entry Cleanup** - Full aggregation doesn't clean up `hostEntry` rows from removed sources. Not addressed yet.

---

## What Still Needs To Be Done

### High Priority

1. **Optimize Bulk Operations**
   - Replace per-entry upserts with bulk SQL (`INSERT OR REPLACE`)
   - Reduce database round-trips in incremental methods
   - Use `ON CONFLICT` properly for SQLite

2. **Add Database Indexes** (verify all needed)
   - Ensure indexes on `AggregationHostSource.aggregationHostId` and `.sourceId`
   - Consider composite indexes for common query patterns

3. **Performance Testing**
   - Benchmark with large real-world sources (150k+ entries)
   - Profile database queries (EXPLAIN ANALYZE)
   - Measure endpoint response times before/after

4. **Fix `refresh-cache` Endpoints**
   - Either make them async (return 202 immediately)
   - Or remove them if they're not needed
   - Document that they're slow operations

### Medium Priority

5. **Implement Redis Caching for Served File**
   - Cache generated hosts file in Redis
   - Invalidate on aggregation completion
   - Should make `GET /serve/hosts` sub-millisecond

6. **Progress Granularity**
   - Currently progress only shows 0→1 for source operations
   - Could show entries processed count during bulk operations

### Low Priority

7. **Data Consistency Migration**
   - Write script to clean up stale `hostEntry` rows (from deleted/updated sources)
   - Run one full aggregation after migration to ensure consistency

8. **Monitoring**
   - Add metrics for incremental vs full aggregation durations
   - Track which endpoints trigger which aggregation mode

---

## Architecture Notes

### Why Incremental Works

The old approach: Any change → fetch all enabled sources → aggregate all → rebuild all tables  
The new approach: Change → fetch only that source → merge its entries into existing aggregation

The key insight: The `hostEntry` table already stores entries with `sourceId`. Aggregation is just grouping by domain and tracking which sources contributed. We can compute that incrementally by:

- **Add**: Insert/update entries for this source, then create `AggregationHost` and `AggregationHostSource` links
- **Delete**: Remove links from `AggregationHostSource`, delete `AggregationHost` if no links remain

This eliminates O(totalEntries) work per change, reducing to O(entriesInChangedSource).

### Schema Evolution

Previous design had `AggregationHost.sourceIds` as JSON array, which:
- Couldn't be indexed efficiently
- Required full table rewrite on any change
- Made queries slower

New normalized schema:
- `AggregationHost` represents a domain in an aggregation result
- `AggregationHostSource` links domains to sources (many-to-many)
- Enables efficient queries like "which sources contribute to domain X"
- Supports incremental updates naturally

---

## References

- `backend/src/services/aggregation.service.ts` - Contains `incrementalAddSource`, `incrementalDeleteSource`
- `backend/src/controllers/sources.controller.ts` - All mutation endpoints
- `backend/src/controllers/hosts.controller.ts` - Updated queries
- `backend/prisma/schema.prisma` - Updated schema

---
