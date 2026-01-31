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
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_host_entries" ("domain", "entryType", "firstSeen", "id", "lastSeen", "normalized", "occurrenceCount") SELECT "domain", "entryType", "firstSeen", "id", "lastSeen", "normalized", "occurrenceCount" FROM "host_entries";
DROP TABLE "host_entries";
ALTER TABLE "new_host_entries" RENAME TO "host_entries";
CREATE UNIQUE INDEX "host_entries_domain_key" ON "host_entries"("domain");
CREATE UNIQUE INDEX "host_entries_normalized_key" ON "host_entries"("normalized");
CREATE INDEX "host_entries_domain_idx" ON "host_entries"("domain");
CREATE INDEX "host_entries_normalized_idx" ON "host_entries"("normalized");
CREATE INDEX "host_entries_entryType_idx" ON "host_entries"("entryType");
CREATE INDEX "host_entries_enabled_idx" ON "host_entries"("enabled");
CREATE INDEX "host_entries_lastSeen_idx" ON "host_entries"("lastSeen");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
