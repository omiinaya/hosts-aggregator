/*
  Warnings:

  - You are about to drop the column `sourceId` on the `aggregation_results` table. All the data in the column will be lost.
  - You are about to drop the column `totalDomains` on the `aggregation_results` table. All the data in the column will be lost.
  - You are about to drop the column `uniqueDomains` on the `aggregation_results` table. All the data in the column will be lost.
  - You are about to drop the column `lastChecked` on the `sources` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `sources` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `sources` table. All the data in the column will be lost.
  - Added the required column `duplicatesRemoved` to the `aggregation_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourcesUsed` to the `aggregation_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalEntries` to the `aggregation_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSources` to the `aggregation_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uniqueEntries` to the `aggregation_results` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_aggregation_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSources" INTEGER NOT NULL,
    "totalEntries" INTEGER NOT NULL,
    "uniqueEntries" INTEGER NOT NULL,
    "duplicatesRemoved" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "sourcesUsed" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_aggregation_results" ("createdAt", "filePath", "id", "timestamp", "updatedAt") SELECT "createdAt", "filePath", "id", "timestamp", "updatedAt" FROM "aggregation_results";
DROP TABLE "aggregation_results";
ALTER TABLE "new_aggregation_results" RENAME TO "aggregation_results";
CREATE TABLE "new_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetched" DATETIME,
    "lastFetchStatus" TEXT,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_sources" ("createdAt", "filePath", "id", "name", "type", "updatedAt", "url") SELECT "createdAt", "filePath", "id", "name", "type", "updatedAt", "url" FROM "sources";
DROP TABLE "sources";
ALTER TABLE "new_sources" RENAME TO "sources";
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
