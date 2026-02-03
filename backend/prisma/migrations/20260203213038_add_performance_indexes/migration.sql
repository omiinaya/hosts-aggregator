-- CreateIndex
CREATE INDEX "host_entries_sourceId_domain_idx" ON "host_entries"("sourceId", "domain");

-- CreateIndex
CREATE INDEX "host_entries_normalized_sourceId_idx" ON "host_entries"("normalized", "sourceId");
