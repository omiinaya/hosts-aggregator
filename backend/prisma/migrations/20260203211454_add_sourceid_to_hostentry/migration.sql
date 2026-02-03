-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_host_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'block',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "sourceId" TEXT,
    CONSTRAINT "host_entries_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_host_entries" ("domain", "enabled", "entryType", "firstSeen", "id", "lastSeen", "normalized", "occurrenceCount") SELECT "domain", "enabled", "entryType", "firstSeen", "id", "lastSeen", "normalized", "occurrenceCount" FROM "host_entries";
DROP TABLE "host_entries";
ALTER TABLE "new_host_entries" RENAME TO "host_entries";
CREATE UNIQUE INDEX "host_entries_normalized_key" ON "host_entries"("normalized");
CREATE INDEX "host_entries_domain_idx" ON "host_entries"("domain");
CREATE INDEX "host_entries_normalized_idx" ON "host_entries"("normalized");
CREATE INDEX "host_entries_entryType_idx" ON "host_entries"("entryType");
CREATE INDEX "host_entries_enabled_idx" ON "host_entries"("enabled");
CREATE INDEX "host_entries_lastSeen_idx" ON "host_entries"("lastSeen");
CREATE INDEX "host_entries_sourceId_idx" ON "host_entries"("sourceId");
CREATE UNIQUE INDEX "host_entries_domain_sourceId_key" ON "host_entries"("domain", "sourceId");
CREATE TABLE "new_source_host_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "hostEntryId" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "rawLine" TEXT,
    "comment" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    CONSTRAINT "source_host_mappings_hostEntryId_fkey" FOREIGN KEY ("hostEntryId") REFERENCES "host_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_source_host_mappings" ("comment", "enabled", "firstSeen", "hostEntryId", "id", "lastSeen", "lineNumber", "rawLine", "sourceId") SELECT "comment", "enabled", "firstSeen", "hostEntryId", "id", "lastSeen", "lineNumber", "rawLine", "sourceId" FROM "source_host_mappings";
DROP TABLE "source_host_mappings";
ALTER TABLE "new_source_host_mappings" RENAME TO "source_host_mappings";
CREATE INDEX "source_host_mappings_sourceId_idx" ON "source_host_mappings"("sourceId");
CREATE INDEX "source_host_mappings_hostEntryId_idx" ON "source_host_mappings"("hostEntryId");
CREATE INDEX "source_host_mappings_enabled_idx" ON "source_host_mappings"("enabled");
CREATE INDEX "source_host_mappings_firstSeen_idx" ON "source_host_mappings"("firstSeen");
CREATE UNIQUE INDEX "source_host_mappings_sourceId_hostEntryId_key" ON "source_host_mappings"("sourceId", "hostEntryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
