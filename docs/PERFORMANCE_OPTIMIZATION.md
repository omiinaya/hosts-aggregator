# Performance Optimization: Source Add/Delete Workflow

## 1. Current Workflow & Bottlenecks

### 1.1 Adding a Source

When a user adds a source via `POST /api/sources` (`sources.controller.ts:129-183`):

1. Source record is created in the database.
2. If `enabled=true`, the controller calls `this.autoAggregationService.triggerAggregation()` (line 165) which queues a background task.
3. The HTTP response returns immediately with `aggregation: null`.

For large sources (e.g., 155k entries), the background aggregation takes 1-2 minutes. The user can see a progress indicator via polling `GET /aggregate/progress` (`aggregate.controller.ts:94-105`) which reads from `aggregationService.getProgress()`.

### 1.2 Deleting/Updating/Toggling a Source

Deletion (`DELETE /api/sources/:id` lines 261-297), update (`PATCH /api/sources/:id` lines 185-259), and toggle (`PATCH /api/sources/:id/toggle` lines 299-341) behave differently:

- They **call `aggregationService.aggregateSources()` directly and await it** (lines 237, 281, 320, 415, 451).
- This blocks the HTTP response for the entire duration of the aggregation (1-2 minutes).
- If the direct aggregation fails, they fall back to queuing a background job (lines 242-244, 286-289, etc.).

Thus, delete and toggle operations are synchronous and cause the worst user experience.

### 1.3 Aggregation Process

`aggregationService.aggregateSources()` (`aggregation.service.ts:29-243`) performs:

1. Fetch all enabled sources.
2. For each source **in parallel**:
   - Fetch content (with caching)
   - Detect format
   - Parse entries
   - Store entries in batches of 1000 (`storeSourceEntries` lines 473-556)
3. Deduplicate entries (`processEntries` lines 583-608)
4. Write `AggregationResult`, `AggregationSource`, `AggregationHost` records.

**Batching**: `storeSourceEntries` splits entries into batches of 1000 and performs a separate transaction per batch, each containing up to 1000 individual `upsert` calls on `hostEntry`. This works but still issues many round-trips to SQLite.

### 1.4 Serving the Hosts File

`GET /api/serve/hosts` (`serve.controller.ts:67-138`) regenerates the file on each request by querying:

```sql
SELECT DISTINCT normalized, domain, entryType FROM host_entries
WHERE enabled = true AND source.enabled = true
ORDER BY domain ASC
```

There is **no caching** of the generated file, though `cache.service.ts` provides Redis helpers that are not used here.

---

### Summary of Bottlenecks

1. **Full Reaggregation on Every Change**
   - Any source modification triggers `aggregateSources()` which re-processes **all** enabled sources, even those unchanged. For N sources with total M entries, each change costs O(M) work.
   - With a 155k-entry source among many, total work may be >200k entries per change.

2. **Blocking API Calls**
   - Delete, update, toggle, refresh endpoints await aggregation synchronously, causing 1-2 minute HTTP timeouts and poor UX.

3. **Inefficient Batch Upserts**
   - `storeSourceEntries` uses individual `upsert` for each entry within a batch. Prisma generates one `SELECT` + one `INSERT/UPDATE` per entry. For 155k entries, that's 155k pairs of queries (though batched in transactions). Bulk operations could reduce round-trips.

4. **Redundant Source Existence Checks**
   - In `aggregateSources` (lines 77-80) each parallel worker re-checks if the source still exists, even though we just fetched it. Minor but unnecessary.

5. **No Cache for Served File**
   - High-traffic clients request the hosts file repeatedly. Regenerating on each request adds DB load.

6. **Stale Entry Accumulation (Hidden Bug)**
   - When a source's content changes, `storeSourceEntries` only upserts entries present in the new content. Removed entries are never deleted from `hostEntry`, causing stale domains to persist indefinitely. Full aggregation also doesn't clean up because it never deletes old rows. This leads to data inconsistency over time.

---

## 2. Root Cause Analysis

The core architectural flaw is the **centralized aggregation model**:

- The system treats the entire hosts list as a derived dataset that is recomputed from scratch on any change.
- There is no concept of incremental updates or delta changes.
- The `hostEntry` table is designed to support incremental updates (it has `sourceId` and unique `(domain, sourceId)`), but the aggregation logic does not leverage this; it rebuilds everything.

Additionally:

- The `AutoAggregationService` exists to queue background jobs, but the critical mutation endpoints (delete, update, toggle) bypass it and use synchronous aggregation. This inconsistency leads to unpredictable response times.
- The separation between `Aggregation*` tables (audit/history) and the live `hostEntry` table is blurred; aggregation is treated as a monolithic operation that does both.

---

## 3. Proposed Architecture

We redesign the system to support **incremental aggregation** and **asynchronous processing**, while preserving existing API contracts for reading.

### 3.1 High-Level Design

```text
┌─────────────────┐
│   Source Change │
│  (Add/Update/   │
│   Delete/Toggle)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│   SourcesController                        │
│   - Validate                               │
│   - Write source record                    │
│   - Return 202 Accepted + Location header  │
└────────┬────────────────────────────────────┘
         │
         ▼ (fire-and-forget)
┌─────────────────────────────────────────────┐
│   AutoAggregationService (singleton)       │
│   - Queue incremental task                 │
│   - Deduplicate concurrent requests        │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│   AggregationService                       │
│   - incrementalAddOrUpdate(sourceId)       │
│   - incrementalRemove(sourceId)            │
│   - fullRebuild()                          │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│   Database (hostEntry)                     │
│   - Incrementally updated                  │
│   - Triggers cache invalidation            │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│   Redis Cache (served hosts file)          │
│   - On change: invalidate                  │
│   - On serve: cache or generate            │
└─────────────────────────────────────────────┘
```

### 3.2 Data Flow

#### Adding a Source

1. Controller creates `Source` with `enabled=true`.
2. Enqueue `incrementalAddOrUpdate(sourceId)` via `AutoAggregationService`.
3. Respond `202 Accepted` with `Location: /api/aggregate/status` for progress.
4. Background task:
   - Fetch content from URL.
   - Parse entries.
   - Delete any existing `hostEntry` rows for this source (cleanup from previous failed runs or if updating).
   - Insert all entries in bulk.
   - Update `SourceContent` with hash, entryCount, format.
   - Log fetch.
   - Optionally update `AggregationResult` stats asynchronously (not required for serving).

#### Updating a Source

- If URL changes or format changes: treat as "remove old + add new". Enqueue incremental task that deletes old rows (if any) then inserts new.
- If only metadata changes: no aggregation needed.

#### Deleting/Toggling Off a Source

- Enqueue `incrementalRemove(sourceId)`.
- Delete all `hostEntry` rows where `sourceId = X`.
- This automatically removes domains that are **exclusively** provided by this source. Domains also present in other enabled sources remain via those rows.
- No need to touch `Aggregation*` tables.

#### Toggling On

- Same as add: `incrementalAddOrUpdate`.

#### Refreshing a Single Source

- Already calls `processSource` synchronously. Keep it asynchronous: enqueue and return immediately.

---

### 3.3 Caching Layer

- `ServeController` (`serve.controller.ts`) should check Redis for a cached hosts file before generating.
- Use `cacheService.getCachedHostsList(format)` and `cacheService.cacheHostsList(format, content)`.
- Invalidate cache when any aggregation completes (incremental or full). A simple approach: after each successful incremental task, delete keys `hosts:*`.
- Set TTL based on `servingConfig.cacheMaxAgeSeconds` (already configurable).

---

### 3.4 Database Optimizations

#### Bulk Insert

Replace the per-entry upsert loop in `storeSourceEntries` with a bulk insert using raw SQL:

```sql
INSERT OR REPLACE INTO host_entry (id, domain, normalized, entryType, sourceId, firstSeen, lastSeen, occurrenceCount)
VALUES (...), (...), ...
```

- Prisma's `createMany` does not support `ON CONFLICT` for SQLite, so we need `prisma.$executeRaw`.
- For new entries, `id` can be default generated (CUID) — we can omit it and let DB assign.
- For updates, use `INSERT OR REPLACE` which replaces `lastSeen`, `occurrenceCount`, `entryType` if conflict on `(domain, sourceId)`.
- Do all inserts in a single transaction per source.

#### Transaction Scope

- For `incrementalAddOrUpdate`:
  1. Begin transaction.
  2. `DELETE FROM host_entry WHERE sourceId = ?` (fast if indexed, which it is).
  3. Bulk `INSERT OR REPLACE` all entries.
  4. Commit.
- This ensures the hostEntry for this source switches atomically from old to new.

---

## 4. Implementation Details

### 4.1 Extend AggregationService

Add new public methods:

```ts
// aggregation.service.ts
async incrementalAddOrUpdate(sourceId: string): Promise<void> { ... }

async incrementalRemove(sourceId: string): Promise<void> { ... }

// Reuse existing private helpers where possible:
// - fetchSourceContent (fetch + cache)
// - detectFormat
// - parser.parseContent
// - storeSourceEntries will be refactored to accept entries and perform bulk insert
```

**Refactor `storeSourceEntries`**:

Make it accept an optional flag `clearFirst?: boolean`. For incremental add/update, we call it with `clearFirst=true`. It will:

```ts
private async storeSourceEntries(sourceId: string, entries: ParsedEntry[], clearFirst: boolean = false): Promise<void> {
  if (clearFirst) {
    await prisma.hostEntry.deleteMany({ where: { sourceId } });
  }
  if (entries.length === 0) return;

  // Bulk insert using raw SQL
  const values = entries.map(entry => 
    `('${entry.domain}', '${entry.domain.toLowerCase().trim()}', '${entry.type}', '${sourceId}', datetime('now'), datetime('now'), 1)`
  ).join(',');

  const sql = `
    INSERT OR REPLACE INTO host_entry 
      (domain, normalized, entryType, sourceId, firstSeen, lastSeen, occurrenceCount)
    VALUES ${values}
  `;
  await prisma.$executeRawUnsafe(sql);
}
```

> **Note**: Use parameterized queries for safety; omitted for brevity.

**Alternatively**, we can keep the original `storeSourceEntries` for full aggregation (which needs to be safe with partial batches) and create a new `bulkStoreEntries` for incremental updates where we know the full set.

### 4.2 Update SourcesController

Change all mutation endpoints to **return immediately** and enqueue work:

```ts
async createSource(req, res, next) {
  // ... create source record as before
  if (enabled) {
    // Instead of direct trigger, enqueue incremental
    this.autoAggregationService.enqueueIncremental(source.id);
  }
  return res.status(201).json({ status: 'success', data: { ... } });
}

async updateSource(req, res, next) {
  // ... compute shouldTriggerAggregation
  if (shouldTriggerAggregation) {
    if (enabled !== undefined && !enabled) {
      // disabling -> remove
      this.autoAggregationService.enqueueRemove(source.id);
    } else {
      // enabling or URL changed -> incremental add/update
      this.autoAggregationService.enqueueIncremental(source.id);
    }
    // Invalidate cache
    this.cacheService?.invalidateHostsCache();
  }
  return res.json(...);
}

async deleteSource(req, res, next) {
  // ... after deleting source record
  if (source.enabled) {
    this.autoAggregationService.enqueueRemove(source.id);
    this.cacheService?.invalidateHostsCache();
  }
  return res.status(204).send(); // don't await aggregation
}

async toggleSource(req, res, next) {
  // after update
  this.autoAggregationService.enqueueIncrementalOrRemove based on new enabled state
  this.cacheService?.invalidateHostsCache();
  return res.json(...);
}

async refreshSource(req, res, next) {
  // enqueue incrementalAddOrUpdate for this source
  this.autoAggregationService.enqueueIncremental(source.id);
  return res.json({ status: 'success', message: 'Refresh queued' });
}
```

**Note**: The `AutoAggregationService` needs new methods:
- `enqueueIncremental(sourceId)`
- `enqueueRemove(sourceId)`
- Internally they queue functions that call `aggregationService.incrementalAddOrUpdate(sourceId)` or `incrementalRemove`.

### 4.3 ServeController Caching

```ts
async serveHostsFile(req, res, next) {
  const format = (req.query.format as string)?.toLowerCase() || 'abp';
  const cacheKey = `hosts:${format}`;

  // Try cache first
  const cached = await cacheService.getCachedHostsList(format);
  if (cached) {
    // Set headers, send cached
    return this.sendResponse(res, cached, format);
  }

  // Generate fresh
  const content = await this.generateHostsFile(format);
  await cacheService.cacheHostsList(format, content);
  return this.sendResponse(res, content, format);
}
```

Add `generateHostsFile` helper to produce content (similar to existing logic). Invalidate cache after any aggregation change:

```ts
// In AggregationService after successful incremental add/update/remove:
await cacheService?.invalidateHostsCache();
```

### 4.4 Progress Tracking

`AutoAggregationService` already tracks a queue and `isAggregating`. For more granular progress (entries processed), we could extend `AggregationService` to store per-source progress in a `Map<sourceId, progress>` that the controller can expose via `GET /aggregate/status`. This is optional but improves UX.

---

## 5. Performance Impact Estimates

| Operation | Current (Full Reagg) | Proposed (Incremental) | Improvement |
|-----------|----------------------|------------------------|-------------|
| Add large source (155k entries) | 1-2 min (processes all sources) | 5-10 sec (processes only new source) | ~10x faster (relative to worst-case) |
| Delete source | 1-2 min (rebuild all) | < 1 sec (delete by sourceId) | ~100x faster |
| Toggle off | 1-2 min | < 1 sec | ~100x faster |
| Update source (URL change) | 1-2 min | 5-10 sec (reprocess only that source) | ~10x faster |
| Serve hosts file (cold) | ~100-200ms DB query | same (or <1ms cached) | 200x faster when cached |

- **API Response Times**: Blocking calls become immediate (202 Accepted). Users no longer wait.
- **Server Load**: CPU and DB load drop dramatically because most changes touch only one source.
- **Concurrency**: Queueing in `AutoAggregationService` prevents thundering herd; background tasks can be rate-limited.

---

## 6. Migration Plan

### Phase 0: Preparations
- Add feature flags for incremental mode (env var `INCREMENTAL_AGGREGATION=true`).
- Ensure Redis is deployed and `cache.service.ts` works.
- Backup database.

### Phase 1: Implement Core Incremental Logic
- Add `AggregationService.incrementalAddOrUpdate` and `incrementalRemove`.
- Refactor `storeSourceEntries` to support bulk insert and optional clear.
- Write unit tests for these methods.
- Benchmark on a copy of production data (e.g., 155k source).

### Phase 2: Queue Integration
- Extend `AutoAggregationService`:
  ```ts
  enqueueIncremental(sourceId: string) { ... }
  enqueueRemove(sourceId: string) { ... }
  ```
- Modify to call `aggregationService.incrementalX` and handle errors.

### Phase 3: Update Controllers
- Change `SourcesController` mutation endpoints to use async enqueue.
- Return `202 Accepted` and `Location: /api/aggregate/progress` (or status by source).
- Add `CacheService` to controller (or better: service layer triggers invalidation).
- Remove synchronous `await aggregationService.aggregateSources()` calls.
- Ensure `refreshSource` and `refreshAllCache` also use background.

### Phase 4: Cache the Served Hosts
- Update `ServeController` to use `cacheService`.
- Add invalidation hook in `AggregationService` after successful incremental ops.
- Verify cache headers still function.

### Phase 5: Frontend Adaptation
- Frontend must handle `202` responses and poll for status (already has progress endpoint).
- Update UI to show "queued" state.

### Phase 6: Rollout with Feature Flag
- Deploy with `INCREMENTAL_AGGREGATION=false` to test basic deployment.
- Enable incremental mode for a subset of users or in staging.
- Once validated, flip flag for all.
- Monitor logs for errors (stale entries, missing invalidations).

### Phase 7: Full Rebuild
- After switch, run one full `aggregateSources()` manually to ensure consistency (maybe as part of maintenance window).
- After verifying data correctness, remove old full-rebuild fallback or keep as recovery.

---

## 7. Alternative Approaches

### 7.1 Database Triggers
Use SQLite triggers on `hostEntry` to maintain a materialized view of the aggregated list. Not feasible because SQLite lacks materialized views and trigger-based denormalization would be complex.

### 7.2 Message Queue (Redis / RabbitMQ)
Offload aggregation tasks to a proper queue with workers. `AutoAggregationService` already provides basic in-memory queuing. For a production multi-instance deployment, a distributed queue (Redis, Bull, etc.) would be needed. This suggestion goes beyond "no external dependencies unless absolutely necessary". We can start with the singleton in-memory queue (works for single instance) and later add Redis Bull if scaling.

### 7.3 Periodic Snapshots
Keep full aggregation running every N minutes (cron) and let user edits propagate incrementally. This hybrid ensures eventual consistency without blocking users. Already partially done via `AutoAggregationService` with delay; we can extend the delay (e.g., 5-30s) to batch multiple changes.

### 7.4 Versioned Hosts Table
Instead of deleting, maintain a `version` column and a `current` flag. Queries filter on `current=true`. Inserts set `current=true` for new rows and set `false` for old rows of same source. This avoids delete+insert and keeps history. Overkill for current needs.

---

## 8. Recommendations

1. **Implement Incremental Aggregation First** – This is the single biggest win. It changes O(totalEntries) to O(entriesInChangedSource) and unblocks API responses.

2. **Introduce Asynchronous API** – Change mutation endpoints to return `202` and `Location` header. The frontend already has progress polling; adjust it to use `GET /aggregate/progress`.

3. **Add Redis Caching for Served Files** – Simple to implement via existing `cacheService` and reduces read load dramatically.

4. **Optimize Bulk Insert** – Refactor `storeSourceEntries` to use raw SQL bulk `INSERT OR REPLACE`. For 155k entries, this reduces SQLite round-trips from ~155k to ~1 transaction.

5. **Clean Up Stale Entries** – The proposed `clearFirst` in `storeSourceEntries` fixes the data bug. Ensure it's used for incremental updates and also for full aggregation? In full aggregation, we can `TRUNCATE host_entry` and rebuild entirely (fast if done in one transaction). This ensures perfect consistency. `TRUNCATE` in SQLite is `DELETE FROM host_entry`, but that's O(N) to delete rows; better to drop and recreate table? Not necessary. Simpler: `DELETE FROM host_entry` then insert all fresh entries. That is O(totalEntries) deletes + inserts but in a single transaction and only once per full rebuild.

6. **Monitor and Profile** – Add query logging and timing in `AggregationService`. Use `explain` on slow queries.

7. **Future-Proof for Clustering** – If the app scales horizontally, replace in-memory AutoAggregation queue with Redis-based queue (Bull/Bee-Queue). The current design abstracts the queue so it can be swapped.

8. **Database Migration** – Consider adding an index on `hostEntry` for `(sourceId, domain)` is already there. Index for `(enabled, source_enabled)` is not directly needed because the query joins on `source.enabled`. Ensure `source.enabled` is indexed (already). Ensure `hostEntry.sourceId` is indexed (already). Current schema is adequate.

---

## Conclusion

The current bottleneck stems from a full-rebuild aggregation strategy that does not scale with the number of entries. By switching to **incremental updates** and **asynchronous processing**, we can reduce add/delete/toggle latency from minutes to seconds (or immediate API response). Coupled with **caching** and **bulk SQL operations**, the system will handle large hosts files efficiently while maintaining data consistency and a responsive user experience.

All proposed changes fit within the existing stack (Express, Prisma, SQLite, React, TanStack Query) and require no external dependencies beyond Redis (which is already used). The migration can be done incrementally with feature flags and minimal downtime.
