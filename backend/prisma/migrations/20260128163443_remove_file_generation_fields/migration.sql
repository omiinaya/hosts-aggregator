/*
  Warnings:

  - You are about to drop the column `fileHash` on the `aggregation_results` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `aggregation_results` table. All the data in the column will be lost.
  - You are about to drop the column `fileSizeBytes` on the `aggregation_results` table. All the data in the column will be lost.

*/
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_aggregation_results" ("allowEntries", "blockEntries", "createdAt", "duplicatesRemoved", "failedSources", "id", "processingTimeMs", "successfulSources", "timestamp", "totalEntries", "totalSources", "triggeredBy", "uniqueEntries", "updatedAt") SELECT "allowEntries", "blockEntries", "createdAt", "duplicatesRemoved", "failedSources", "id", "processingTimeMs", "successfulSources", "timestamp", "totalEntries", "totalSources", "triggeredBy", "uniqueEntries", "updatedAt" FROM "aggregation_results";
DROP TABLE "aggregation_results";
ALTER TABLE "new_aggregation_results" RENAME TO "aggregation_results";
CREATE INDEX "aggregation_results_timestamp_idx" ON "aggregation_results"("timestamp");
CREATE INDEX "aggregation_results_createdAt_idx" ON "aggregation_results"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
