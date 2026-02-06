-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "filePath" TEXT,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "format" TEXT DEFAULT 'auto',

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_entries" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'block',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "sourceId" TEXT,

    CONSTRAINT "host_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_host_mappings" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "hostEntryId" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "rawLine" TEXT,
    "comment" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_host_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_contents" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "format" TEXT,

    CONSTRAINT "source_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_fetch_logs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "errorMessage" TEXT,
    "responseTimeMs" INTEGER,
    "contentChanged" BOOLEAN NOT NULL DEFAULT false,
    "contentId" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregation_results" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aggregation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregation_sources" (
    "id" TEXT NOT NULL,
    "aggregationResultId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entriesContributed" INTEGER NOT NULL DEFAULT 0,
    "uniqueDomainsContributed" INTEGER NOT NULL DEFAULT 0,
    "fetchStatus" TEXT NOT NULL,
    "fetchDurationMs" INTEGER,

    CONSTRAINT "aggregation_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aggregation_hosts" (
    "id" TEXT NOT NULL,
    "aggregationResultId" TEXT NOT NULL,
    "hostEntryId" TEXT NOT NULL,
    "sourceIds" TEXT NOT NULL,
    "primarySourceId" TEXT NOT NULL,

    CONSTRAINT "aggregation_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "apiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE INDEX "sources_enabled_idx" ON "sources"("enabled");

-- CreateIndex
CREATE INDEX "sources_type_idx" ON "sources"("type");

-- CreateIndex
CREATE UNIQUE INDEX "host_entries_domain_sourceId_key" ON "host_entries"("domain", "sourceId");

-- CreateIndex
CREATE INDEX "host_entries_domain_idx" ON "host_entries"("domain");

-- CreateIndex
CREATE INDEX "host_entries_normalized_idx" ON "host_entries"("normalized");

-- CreateIndex
CREATE INDEX "host_entries_entryType_idx" ON "host_entries"("entryType");

-- CreateIndex
CREATE INDEX "host_entries_enabled_idx" ON "host_entries"("enabled");

-- CreateIndex
CREATE INDEX "host_entries_lastSeen_idx" ON "host_entries"("lastSeen");

-- CreateIndex
CREATE INDEX "host_entries_sourceId_idx" ON "host_entries"("sourceId");

-- CreateIndex
CREATE INDEX "host_entries_sourceId_domain_idx" ON "host_entries"("sourceId", "domain");

-- CreateIndex
CREATE INDEX "host_entries_normalized_sourceId_idx" ON "host_entries"("normalized", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "source_host_mappings_sourceId_hostEntryId_key" ON "source_host_mappings"("sourceId", "hostEntryId");

-- CreateIndex
CREATE INDEX "source_host_mappings_sourceId_idx" ON "source_host_mappings"("sourceId");

-- CreateIndex
CREATE INDEX "source_host_mappings_hostEntryId_idx" ON "source_host_mappings"("hostEntryId");

-- CreateIndex
CREATE INDEX "source_host_mappings_enabled_idx" ON "source_host_mappings"("enabled");

-- CreateIndex
CREATE INDEX "source_host_mappings_firstSeen_idx" ON "source_host_mappings"("firstSeen");

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
CREATE INDEX "aggregation_results_timestamp_idx" ON "aggregation_results"("timestamp");

-- CreateIndex
CREATE INDEX "aggregation_results_createdAt_idx" ON "aggregation_results"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "aggregation_sources_aggregationResultId_sourceId_key" ON "aggregation_sources"("aggregationResultId", "sourceId");

-- CreateIndex
CREATE INDEX "aggregation_sources_aggregationResultId_idx" ON "aggregation_sources"("aggregationResultId");

-- CreateIndex
CREATE INDEX "aggregation_sources_sourceId_idx" ON "aggregation_sources"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "aggregation_hosts_aggregationResultId_hostEntryId_key" ON "aggregation_hosts"("aggregationResultId", "hostEntryId");

-- CreateIndex
CREATE INDEX "aggregation_hosts_aggregationResultId_idx" ON "aggregation_hosts"("aggregationResultId");

-- CreateIndex
CREATE INDEX "aggregation_hosts_hostEntryId_idx" ON "aggregation_hosts"("hostEntryId");

-- CreateIndex
CREATE INDEX "aggregation_hosts_primarySourceId_idx" ON "aggregation_hosts"("primarySourceId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiKey_key" ON "users"("apiKey");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_apiKey_idx" ON "users"("apiKey");

-- AddForeignKey
ALTER TABLE "host_entries" ADD CONSTRAINT "host_entries_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_host_mappings" ADD CONSTRAINT "source_host_mappings_hostEntryId_fkey" FOREIGN KEY ("hostEntryId") REFERENCES "host_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_contents" ADD CONSTRAINT "source_contents_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_fetch_logs" ADD CONSTRAINT "source_fetch_logs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregation_sources" ADD CONSTRAINT "aggregation_sources_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregation_sources" ADD CONSTRAINT "aggregation_sources_aggregationResultId_fkey" FOREIGN KEY ("aggregationResultId") REFERENCES "aggregation_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregation_hosts" ADD CONSTRAINT "aggregation_hosts_hostEntryId_fkey" FOREIGN KEY ("hostEntryId") REFERENCES "host_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aggregation_hosts" ADD CONSTRAINT "aggregation_hosts_aggregationResultId_fkey" FOREIGN KEY ("aggregationResultId") REFERENCES "aggregation_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
