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
    CONSTRAINT "host_entries_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_host_entries" ("domain", "enabled", "entryType", "firstSeen", "id", "lastSeen", "normalized", "occurrenceCount", "sourceId") SELECT "domain", "enabled", "entryType", "firstSeen", "id", "lastSeen", "normalized", "occurrenceCount", "sourceId" FROM "host_entries";
DROP TABLE "host_entries";
ALTER TABLE "new_host_entries" RENAME TO "host_entries";
CREATE INDEX "host_entries_domain_idx" ON "host_entries"("domain");
CREATE INDEX "host_entries_normalized_idx" ON "host_entries"("normalized");
CREATE INDEX "host_entries_entryType_idx" ON "host_entries"("entryType");
CREATE INDEX "host_entries_enabled_idx" ON "host_entries"("enabled");
CREATE INDEX "host_entries_lastSeen_idx" ON "host_entries"("lastSeen");
CREATE INDEX "host_entries_sourceId_idx" ON "host_entries"("sourceId");
CREATE INDEX "host_entries_sourceId_domain_idx" ON "host_entries"("sourceId", "domain");
CREATE INDEX "host_entries_normalized_sourceId_idx" ON "host_entries"("normalized", "sourceId");
CREATE UNIQUE INDEX "host_entries_domain_sourceId_key" ON "host_entries"("domain", "sourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
