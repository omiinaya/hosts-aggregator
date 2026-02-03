-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "source_host_mappings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "source_host_mappings_hostEntryId_fkey" FOREIGN KEY ("hostEntryId") REFERENCES "host_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_source_host_mappings" ("comment", "firstSeen", "hostEntryId", "id", "lastSeen", "lineNumber", "rawLine", "sourceId") SELECT "comment", "firstSeen", "hostEntryId", "id", "lastSeen", "lineNumber", "rawLine", "sourceId" FROM "source_host_mappings";
DROP TABLE "source_host_mappings";
ALTER TABLE "new_source_host_mappings" RENAME TO "source_host_mappings";
CREATE INDEX "source_host_mappings_sourceId_idx" ON "source_host_mappings"("sourceId");
CREATE INDEX "source_host_mappings_hostEntryId_idx" ON "source_host_mappings"("hostEntryId");
CREATE INDEX "source_host_mappings_enabled_idx" ON "source_host_mappings"("enabled");
CREATE INDEX "source_host_mappings_firstSeen_idx" ON "source_host_mappings"("firstSeen");
CREATE UNIQUE INDEX "source_host_mappings_sourceId_hostEntryId_key" ON "source_host_mappings"("sourceId", "hostEntryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
