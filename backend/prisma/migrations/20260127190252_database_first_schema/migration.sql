/*
  Warnings:

  - You are about to drop the column `sourcesUsed` on the `aggregation_results` table. All the data in the column will be lost.
  - You are about to drop the column `entryCount` on the `sources` table. All the data in the column will be lost.
  - You are about to drop the column `lastChecked` on the `sources` table. All the data in the column will be lost.
  - You are about to drop the column `lastFetchStatus` on the `sources` table. All the data in the column will be lost.
  - You are about to drop the column `lastFetched` on the `sources` table. All the data in the column will be lost.
  - Added the required column `processingTimeMs` to the `aggregation_results` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "host_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'block',
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "source_host_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "hostEntryId" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "rawLine" TEXT,
    "comment" TEXT,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    CONSTRAINT "source_host_mappings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "source_host_mappings_hostEntryId_fkey" FOREIGN KEY ("hostEntryId") REFERENCES "host_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "source_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "source_contents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "source_fetch_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "errorMessage" TEXT,
    "responseTimeMs" INTEGER,
    "contentChanged" BOOLEAN NOT NULL DEFAULT false,
    "contentId" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "source_fetch_logs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aggregation_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aggregationResultId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entriesContributed" INTEGER NOT NULL DEFAULT 0,
    "uniqueDomainsContributed" INTEGER NOT NULL DEFAULT 0,
    "fetchStatus" TEXT NOT NULL,
    "fetchDurationMs" INTEGER,
    CONSTRAINT "aggregation_sources_aggregationResultId_fkey" FOREIGN KEY ("aggregationResultId") REFERENCES "aggregation_results" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "aggregation_sources_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "aggregation_hosts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aggregationResultId" TEXT NOT NULL,
    "hostEntryId" TEXT NOT NULL,
    "sourceIds" TEXT NOT NULL,
    "primarySourceId" TEXT NOT NULL,
    CONSTRAINT "aggregation_hosts_aggregationResultId_fkey" FOREIGN KEY ("aggregationResultId") REFERENCES "aggregation_results" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "aggregation_hosts_hostEntryId_fkey" FOREIGN KEY ("hostEntryId") REFERENCES "host_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_aggregation_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSources" INTEGER NOT NULL,
    "successfulSources" INTEGER NOT NULL DEFAULT 0,
    "failedSources" INTEGER NOT NULL DEFAULT 0,
    "totalEntries" INTEGER NOT NULL,
    "uniqueEntries" INTEGER NOT NULL,
    "duplicatesRemoved" INTEGER NOT NULL,
    "allowEntries" INTEGER NOT NULL DEFAULT 0,
    "blockEntries" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'manual',
    "filePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "fileHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_aggregation_results" ("createdAt", "duplicatesRemoved", "filePath", "id", "timestamp", "totalEntries", "totalSources", "uniqueEntries", "updatedAt", "processingTimeMs", "successfulSources", "failedSources", "allowEntries", "blockEntries", "triggeredBy") SELECT "createdAt", "duplicatesRemoved", "filePath", "id", "timestamp", "totalEntries", "totalSources", "uniqueEntries", "updatedAt", 0, 0, 0, 0, 0, 'manual' FROM "aggregation_results";
DROP TABLE "aggregation_results";
ALTER TABLE "new_aggregation_results" RENAME TO "aggregation_results";
CREATE INDEX "aggregation_results_timestamp_idx" ON "aggregation_results"("timestamp");
CREATE INDEX "aggregation_results_createdAt_idx" ON "aggregation_results"("createdAt");
CREATE TABLE "new_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_sources" ("createdAt", "enabled", "filePath", "id", "metadata", "name", "type", "updatedAt", "url") SELECT "createdAt", "enabled", "filePath", "id", "metadata", "name", "type", "updatedAt", "url" FROM "sources";
DROP TABLE "sources";
ALTER TABLE "new_sources" RENAME TO "sources";
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");
CREATE INDEX "sources_enabled_idx" ON "sources"("enabled");
CREATE INDEX "sources_type_idx" ON "sources"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "host_entries_domain_key" ON "host_entries"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "host_entries_normalized_key" ON "host_entries"("normalized");

-- CreateIndex
CREATE INDEX "host_entries_domain_idx" ON "host_entries"("domain");

-- CreateIndex
CREATE INDEX "host_entries_normalized_idx" ON "host_entries"("normalized");

-- CreateIndex
CREATE INDEX "host_entries_entryType_idx" ON "host_entries"("entryType");

-- CreateIndex
CREATE INDEX "host_entries_lastSeen_idx" ON "host_entries"("lastSeen");

-- CreateIndex
CREATE INDEX "source_host_mappings_sourceId_idx" ON "source_host_mappings"("sourceId");

-- CreateIndex
CREATE INDEX "source_host_mappings_hostEntryId_idx" ON "source_host_mappings"("hostEntryId");

-- CreateIndex
CREATE INDEX "source_host_mappings_firstSeen_idx" ON "source_host_mappings"("firstSeen");

-- CreateIndex
CREATE UNIQUE INDEX "source_host_mappings_sourceId_hostEntryId_key" ON "source_host_mappings"("sourceId", "hostEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "source_contents_sourceId_key" ON "source_contents"("sourceId");

-- CreateIndex
CREATE INDEX "source_contents_contentHash_idx" ON "source_contents"("contentHash");

-- CreateIndex
CREATE INDEX "source_contents_fetchedAt_idx" ON "source_contents"("fetchedAt");

-- CreateIndex
CREATE INDEX "source_fetch_logs_sourceId_idx" ON "source_fetch_logs"("sourceId");

-- CreateIndex
CREATE INDEX "source_fetch_logs_status_idx" ON "source_fetch_logs"("status");

-- CreateIndex
CREATE INDEX "source_fetch_logs_fetchedAt_idx" ON "source_fetch_logs"("fetchedAt");

-- CreateIndex
CREATE INDEX "aggregation_sources_aggregationResultId_idx" ON "aggregation_sources"("aggregationResultId");

-- CreateIndex
CREATE INDEX "aggregation_sources_sourceId_idx" ON "aggregation_sources"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "aggregation_sources_aggregationResultId_sourceId_key" ON "aggregation_sources"("aggregationResultId", "sourceId");

-- CreateIndex
CREATE INDEX "aggregation_hosts_aggregationResultId_idx" ON "aggregation_hosts"("aggregationResultId");

-- CreateIndex
CREATE INDEX "aggregation_hosts_hostEntryId_idx" ON "aggregation_hosts"("hostEntryId");

-- CreateIndex
CREATE INDEX "aggregation_hosts_primarySourceId_idx" ON "aggregation_hosts"("primarySourceId");

-- CreateIndex
CREATE UNIQUE INDEX "aggregation_hosts_aggregationResultId_hostEntryId_key" ON "aggregation_hosts"("aggregationResultId", "hostEntryId");
