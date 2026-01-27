# Cache Management Issue Documentation

## Overview

This document describes a critical cache management issue in the hosts-aggregator system where cached content from deleted sources continues to be processed during aggregation, leading to incorrect source attribution in generated hosts files.

---

## Issue Description

### Problem Statement

When all sources are deleted from the system, the generated hosts file continues to show `Sources: multiple` in its header and contains domains from previously cached content. The system incorrectly processes cached files that belong to sources that no longer exist in the database.

### Expected Behavior

- When a source is deleted, its cached content should be removed from [`backend/data/cache/`](backend/data/cache/)
- The aggregation service should only process content from sources that exist and are enabled in the database
- The generated hosts file header should accurately reflect the actual number of sources used

### Actual Behavior

- Cached files remain in [`backend/data/cache/`](backend/data/cache/) after source deletion
- The aggregation service processes cached content without validating that the source still exists
- The hosts file header shows `Sources: multiple` even when no sources exist in the database

---

## Root Cause Analysis

### 1. Missing Cache Cleanup on Source Deletion

The [`deleteSource()`](backend/src/controllers/sources.controller.ts:160) method in [`sources.controller.ts`](backend/src/controllers/sources.controller.ts) does not clean up cached files when a source is deleted:

```typescript
async deleteSource(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const source = await prisma.source.findUnique({
      where: { id }
    });

    if (!source) {
      return next(createError('Source not found', 404));
    }

    await prisma.source.delete({
      where: { id }
    });

    // Trigger automatic aggregation if source was enabled
    if (source.enabled) {
      this.autoAggregationService.triggerAggregation().catch(error => {
        logger.error('Failed to trigger auto-aggregation after source deletion:', error);
      });
    }

    res.status(204).send();
  } catch (error) {
    logger.error(`Failed to delete source ${req.params.id}:`, error);
    next(error);
  }
}
```

**Missing:** No call to [`fileService.deleteCachedContent()`](backend/src/services/file.service.ts) or similar method to remove the cached file.

### 2. No Source Validation in Cache Retrieval

The [`fetchSourceContent()`](backend/src/services/aggregation.service.ts:105) method in [`aggregation.service.ts`](backend/src/services/aggregation.service.ts) retrieves cached content without validating that the source still exists:

```typescript
private async fetchSourceContent(source: any): Promise<string> {
  if (source.type === 'URL' && source.url) {
    // Try to get cached content first
    const cachedContent = await this.fileService.getCachedContent(source.id);
    if (cachedContent) {
      return cachedContent;  // No validation that source still exists!
    }
    // ... fetch from URL
  } else if (source.type === 'FILE' && source.filePath) {
    return await this.fileService.getCachedContent(source.id) || '';
  }
  // ...
}
```

**Issue:** The method assumes that if cached content exists, it should be used. It doesn't verify that the source is still in the database and enabled.

### 3. Incorrect Header Logic in File Generation

The [`generateUnifiedHostsFile()`](backend/src/services/file.service.ts:47) method in [`file.service.ts`](backend/src/services/file.service.ts) uses a hardcoded `Sources: multiple` string:

```typescript
async generateUnifiedHostsFile(domains: string[]): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(this.generatedDir, `unified-hosts-${timestamp}.txt`);

  const header = `# Unified Hosts File
# Generated: ${new Date().toISOString()}
# Total domains: ${domains.length}
# Sources: ${domains.length > 0 ? 'multiple' : 'none'}

`;
  // ...
}
```

**Issue:** The header logic only checks if domains exist, not the actual number of sources used. It should receive the actual source count from the aggregation service.

### 4. Auto-Aggregation Trigger Timing

When a source is deleted, the [`deleteSource()`](backend/src/controllers/sources.controller.ts:176) method triggers auto-aggregation **after** the source is deleted but **before** cache cleanup:

```typescript
await prisma.source.delete({
  where: { id }
});

// Trigger automatic aggregation if source was enabled
if (source.enabled) {
  this.autoAggregationService.triggerAggregation().catch(error => {
    logger.error('Failed to trigger auto-aggregation after source deletion:', error);
  });
}
```

**Issue:** The aggregation runs while the deleted source's cache file still exists, causing the stale data to be included.

---

## Affected Files

| File | Purpose | Issue |
|------|---------|-------|
| [`backend/src/services/aggregation.service.ts`](backend/src/services/aggregation.service.ts) | Core aggregation logic | Processes cached content without source validation |
| [`backend/src/controllers/sources.controller.ts`](backend/src/controllers/sources.controller.ts) | Source CRUD operations | No cache cleanup on source deletion |
| [`backend/src/services/file.service.ts`](backend/src/services/file.service.ts) | File operations | Missing `deleteCachedContent()` method; incorrect header logic |

---

## Technical Details

### Cache File Storage

Cache files are stored in [`backend/data/cache/`](backend/data/cache/) with the naming convention `{sourceId}.txt`:

```typescript
// From file.service.ts
private readonly cacheDir = path.join(process.cwd(), 'data', 'cache');

async cacheSourceContent(sourceId: string, content: string): Promise<string> {
  const filePath = path.join(this.cacheDir, `${sourceId}.txt`);
  // ...
}
```

### Cache Retrieval Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Aggregation    │────▶│  fetchSource     │────▶│  getCached      │
│  Service        │     │  Content()       │     │  Content()      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  Read from      │
                                               │  data/cache/    │
                                               │  {sourceId}.txt │
                                               └─────────────────┘
```

### Data Flow During Source Deletion

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Delete Source  │────▶│  Remove from     │────▶│  Trigger Auto   │
│  Request        │     │  Database        │     │  Aggregation    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                          │
                               │                          ▼
                               │                   ┌─────────────────┐
                               │                   │  Process Cache  │
                               │                   │  (STALE DATA!)  │
                               │                   └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Cache File     │
                        │  STILL EXISTS!  │
                        └─────────────────┘
```

---

## Required Fixes

### Fix 1: Add Cache Cleanup Method to FileService

Add a method to [`backend/src/services/file.service.ts`](backend/src/services/file.service.ts) to delete cached content:

```typescript
async deleteCachedContent(sourceId: string): Promise<void> {
  const filePath = path.join(this.cacheDir, `${sourceId}.txt`);
  try {
    await fs.unlink(filePath);
    logger.info(`Deleted cached content for source ${sourceId}`);
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      logger.error(`Failed to delete cached content for source ${sourceId}:`, error);
      throw error;
    }
    // File doesn't exist, which is fine
  }
}
```

### Fix 2: Clean Up Cache When Source is Deleted

Update [`deleteSource()`](backend/src/controllers/sources.controller.ts:160) in [`backend/src/controllers/sources.controller.ts`](backend/src/controllers/sources.controller.ts):

```typescript
async deleteSource(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const source = await prisma.source.findUnique({
      where: { id }
    });

    if (!source) {
      return next(createError('Source not found', 404));
    }

    // Delete cached content BEFORE removing from database
    await this.fileService.deleteCachedContent(id);

    await prisma.source.delete({
      where: { id }
    });

    // Trigger automatic aggregation if source was enabled
    if (source.enabled) {
      this.autoAggregationService.triggerAggregation().catch(error => {
        logger.error('Failed to trigger auto-aggregation after source deletion:', error);
      });
    }

    res.status(204).send();
  } catch (error) {
    logger.error(`Failed to delete source ${req.params.id}:`, error);
    next(error);
  }
}
```

### Fix 3: Validate Sources Before Using Cached Content

Update [`aggregateSources()`](backend/src/services/aggregation.service.ts:17) in [`backend/src/services/aggregation.service.ts`](backend/src/services/aggregation.service.ts) to validate cached content:

```typescript
async aggregateSources(): Promise<AggregationStats> {
  const startTime = Date.now();

  try {
    // Get all enabled sources
    const sources = await prisma.source.findMany({
      where: { enabled: true }
    });

    // Clean up orphaned cache files
    await this.fileService.cleanupOrphanedCacheFiles(sources.map(s => s.id));

    if (sources.length === 0) {
      return {
        totalSources: 0,
        totalEntries: 0,
        uniqueEntries: 0,
        duplicatesRemoved: 0,
        processingTime: Date.now() - startTime,
        blockedDomains: [],
        allowedDomains: []
      };
    }

    const allEntries: ParsedEntry[] = [];
    const processedSources: string[] = [];

    // Process each source
    for (const source of sources) {
      try {
        const content = await this.fetchSourceContent(source);
        // ... rest of processing
      } catch (error) {
        // ... error handling
      }
    }
    // ...
  }
}
```

### Fix 4: Update Header Logic to Show Actual Source Count

Update [`generateUnifiedHostsFile()`](backend/src/services/file.service.ts:47) in [`backend/src/services/file.service.ts`](backend/src/services/file.service.ts) to accept source count:

```typescript
async generateUnifiedHostsFile(
  domains: string[],
  sourceCount: number,
  sourceNames?: string[]
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(this.generatedDir, `unified-hosts-${timestamp}.txt`);

  const header = `# Unified Hosts File
# Generated: ${new Date().toISOString()}
# Total domains: ${domains.length}
# Sources: ${sourceCount}
${sourceNames ? `# Source list: ${sourceNames.join(', ')}` : ''}

`;
  // ...
}
```

### Fix 5: Add Cleanup Method for Orphaned Cache Files

Add to [`backend/src/services/file.service.ts`](backend/src/services/file.service.ts):

```typescript
async cleanupOrphanedCacheFiles(validSourceIds: string[]): Promise<void> {
  try {
    const files = await fs.readdir(this.cacheDir);
    const validIds = new Set(validSourceIds);

    for (const file of files) {
      if (!file.endsWith('.txt')) continue;

      const sourceId = file.replace('.txt', '');
      if (!validIds.has(sourceId)) {
        const filePath = path.join(this.cacheDir, file);
        await fs.unlink(filePath);
        logger.info(`Cleaned up orphaned cache file: ${file}`);
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup orphaned cache files:', error);
  }
}
```

---

## Testing Scenarios

### Scenario 1: Delete Single Source

1. Create a source with URL
2. Run aggregation (cache is populated)
3. Delete the source
4. **Expected:** Cache file is deleted, aggregation shows 0 sources

### Scenario 2: Delete All Sources

1. Create multiple sources
2. Run aggregation
3. Delete all sources
4. **Expected:** All cache files deleted, hosts file shows `Sources: 0`

### Scenario 3: Orphaned Cache Files

1. Manually create a cache file with a non-existent source ID
2. Run aggregation
3. **Expected:** Orphaned cache file is cleaned up

### Scenario 4: Toggle Source Off

1. Create and enable a source
2. Run aggregation
3. Disable (toggle off) the source
4. **Expected:** Cache file remains but is not used in aggregation

---

## Related Components

- [`backend/src/services/auto-aggregation.service.ts`](backend/src/services/auto-aggregation.service.ts) - Triggers aggregation after source changes
- [`backend/src/controllers/serve.controller.ts`](backend/src/controllers/serve.controller.ts) - Serves the generated hosts file
- [`backend/src/config/serving.ts`](backend/src/config/serving.ts) - Serving configuration

---

## Impact Assessment

| Impact Area | Severity | Description |
|-------------|----------|-------------|
| Data Accuracy | **High** | Generated hosts files contain data from deleted sources |
| Source Attribution | **Medium** | Header shows incorrect source count |
| Disk Usage | **Low** | Orphaned cache files accumulate over time |
| User Trust | **Medium** | Users may see unexpected domains in their hosts file |

---

## References

- Cache directory: [`backend/data/cache/`](backend/data/cache/)
- Generated files directory: [`backend/data/generated/`](backend/data/generated/)
- File service: [`backend/src/services/file.service.ts`](backend/src/services/file.service.ts)
- Aggregation service: [`backend/src/services/aggregation.service.ts`](backend/src/services/aggregation.service.ts)
- Sources controller: [`backend/src/controllers/sources.controller.ts`](backend/src/controllers/sources.controller.ts)
