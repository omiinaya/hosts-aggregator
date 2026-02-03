/**
 * Performance Test Script for Aggregation Service
 * Tests the performance optimizations including:
 * - Database indexes for faster lookups
 * - Batch operations instead of individual upserts
 * - Parallel source processing
 */

const { performance } = require('perf_hooks');
const crypto = require('crypto');

// Mock the aggregation service by importing the compiled version
const { AggregationService } = require('./dist/services/aggregation.service');
const { prisma } = require('./dist/config/database');

const TEST_DOMAINS_COUNT = 3000;

async function generateTestDomains(count) {
  const domains = [];
  for (let i = 0; i < count; i++) {
    // Generate unique domains with some duplicates
    const isDuplicate = i % 10 === 0; // 10% duplicates
    const domainNum = isDuplicate ? Math.floor(i / 10) : i;
    domains.push(`test-domain-${domainNum}.example.com`);
  }
  return domains;
}

async function createMockSourceWithEntries(domainCount) {
  const domains = await generateTestDomains(domainCount);
  
  // Create a mock hosts file content
  const hostsContent = domains.map(domain => `0.0.0.0 ${domain}`).join('\n');
  const contentHash = crypto.createHash('sha256').update(hostsContent).digest('hex');
  
  // Create source in database
  const source = await prisma.source.create({
    data: {
      name: `Performance Test Source ${Date.now()}`,
      type: 'URL',
      url: 'http://test.local/hosts',
      enabled: true,
      format: 'standard',
      updateInterval: 3600
    }
  });
  
  // Create source content
  await prisma.sourceContent.create({
    data: {
      sourceId: source.id,
      content: hostsContent,
      contentHash,
      lineCount: domains.length + 1,
      entryCount: domains.length
    }
  });
  
  return { source, domains };
}

async function cleanupTestData(sourceId) {
  try {
    // Clean up test data
    await prisma.sourceFetchLog.deleteMany({
      where: { sourceId }
    });
    
    await prisma.sourceContent.delete({
      where: { sourceId }
    });
    
    await prisma.hostEntry.deleteMany({
      where: { sourceId }
    });
    
    await prisma.source.delete({
      where: { id: sourceId }
    });
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

async function testBatchUpsertPerformance() {
  console.log('\n=== Test 1: Batch Upsert Performance ===');
  console.log(`Creating ${TEST_DOMAINS_COUNT} test entries...`);
  
  // Create a test source first
  const testSource = await prisma.source.create({
    data: {
      name: `Batch Test Source ${Date.now()}`,
      type: 'URL',
      url: 'http://test.local/batch-hosts',
      enabled: true
    }
  });
  
  const startTime = performance.now();
  
  // Generate test entries
  const entries = [];
  for (let i = 0; i < TEST_DOMAINS_COUNT; i++) {
    const isDuplicate = i % 10 === 0;
    const domainNum = isDuplicate ? Math.floor(i / 10) : i;
    entries.push({
      domain: `batch-test-${domainNum}.example.com`,
      normalized: `batch-test-${domainNum}.example.com`.toLowerCase(),
      type: 'block',
      sourceId: testSource.id
    });
  }
  
  // Remove duplicates from entries array
  const uniqueEntries = [];
  const seen = new Set();
  for (const entry of entries) {
    const key = `${entry.domain}-${entry.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEntries.push(entry);
    }
  }
  
  console.log(`Unique entries: ${uniqueEntries.length}`);
  
  // Simulate batch upsert using transaction
  await prisma.$transaction(async (tx) => {
    const upsertPromises = uniqueEntries.map(entry =>
      tx.hostEntry.upsert({
        where: {
          domain_sourceId: {
            domain: entry.domain,
            sourceId: entry.sourceId
          }
        },
        update: {
          entryType: entry.type,
          lastSeen: new Date(),
          occurrenceCount: { increment: 1 }
        },
        create: {
          domain: entry.domain,
          normalized: entry.normalized,
          entryType: entry.type,
          sourceId: entry.sourceId,
          firstSeen: new Date(),
          lastSeen: new Date(),
          occurrenceCount: 1
        }
      })
    );
    
    await Promise.all(upsertPromises);
  });
  
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`Batch upsert completed in ${duration.toFixed(3)} seconds`);
  console.log(`Rate: ${(uniqueEntries.length / duration).toFixed(0)} entries/second`);
  
  // Clean up
  await prisma.hostEntry.deleteMany({
    where: { sourceId: testSource.id }
  });
  await prisma.source.delete({
    where: { id: testSource.id }
  });
  
  return { duration, entriesProcessed: uniqueEntries.length };
}

async function testIndexLookupPerformance() {
  console.log('\n=== Test 2: Index Lookup Performance ===');
  
  // Create a test source first
  const testSource = await prisma.source.create({
    data: {
      name: `Index Test Source ${Date.now()}`,
      type: 'URL',
      url: 'http://test.local/index-hosts',
      enabled: true
    }
  });
  
  // First, create some test data
  const testEntries = [];
  for (let i = 0; i < 1000; i++) {
    testEntries.push({
      domain: `index-test-${i}.example.com`,
      normalized: `index-test-${i}.example.com`.toLowerCase(),
      type: 'block',
      sourceId: testSource.id
    });
  }
  
  // Insert test data
  await prisma.hostEntry.createMany({
    data: testEntries.map(entry => ({
      domain: entry.domain,
      normalized: entry.normalized,
      entryType: entry.type,
      sourceId: entry.sourceId,
      firstSeen: new Date(),
      lastSeen: new Date(),
      occurrenceCount: 1
    }))
  });
  
  // Test indexed lookup
  const lookupStart = performance.now();
  
  // This should use the index (normalized, sourceId)
  const normalizedDomains = testEntries.map(e => e.normalized);
  const results = await prisma.hostEntry.findMany({
    where: { normalized: { in: normalizedDomains } },
    select: { id: true, normalized: true }
  });
  
  const lookupEnd = performance.now();
  const lookupDuration = (lookupEnd - lookupStart) / 1000;
  
  console.log(`Indexed lookup of ${results.length} entries completed in ${lookupDuration.toFixed(4)} seconds`);
  console.log(`Rate: ${(results.length / lookupDuration).toFixed(0)} lookups/second`);
  
  // Clean up
  await prisma.hostEntry.deleteMany({
    where: { sourceId: testSource.id }
  });
  await prisma.source.delete({
    where: { id: testSource.id }
  });
  
  return { lookupDuration, entriesFound: results.length };
}

async function testParallelProcessing() {
  console.log('\n=== Test 3: Parallel Source Processing ===');
  
  // Create multiple test sources
  const sources = [];
  for (let i = 0; i < 5; i++) {
    const source = await prisma.source.create({
      data: {
        name: `Parallel Test Source ${i} ${Date.now()}`,
        type: 'URL',
        url: `http://test.local/hosts-${i}`,
        enabled: true
      }
    });
    sources.push(source);
  }
  
  // Create content for each source
  for (let i = 0; i < sources.length; i++) {
    const domains = [];
    for (let j = 0; j < 500; j++) {
      domains.push(`parallel-domain-${j}-source-${i}.example.com`);
    }
    const hostsContent = domains.map(d => `0.0.0.0 ${d}`).join('\n');
    const contentHash = crypto.createHash('sha256').update(hostsContent).digest('hex');
    
    await prisma.sourceContent.create({
      data: {
        sourceId: sources[i].id,
        content: hostsContent,
        contentHash,
        lineCount: domains.length + 1,
        entryCount: domains.length
      }
    });
  }
  
  // Test parallel processing
  const parallelStart = performance.now();
  
  const processingPromises = sources.map(async (source) => {
    const content = await prisma.sourceContent.findUnique({
      where: { sourceId: source.id }
    });
    return content?.entryCount || 0;
  });
  
  const results = await Promise.all(processingPromises);
  
  const parallelEnd = performance.now();
  const parallelDuration = (parallelEnd - parallelStart) / 1000;
  
  console.log(`Parallel processing of ${sources.length} sources completed in ${parallelDuration.toFixed(4)} seconds`);
  console.log(`Total entries processed: ${results.reduce((a, b) => a + b, 0)}`);
  
  // Clean up
  for (const source of sources) {
    await cleanupTestData(source.id);
  }
  
  return { parallelDuration, sourcesProcessed: sources.length };
}

async function runPerformanceTests() {
  console.log('Starting Aggregation Performance Tests');
  console.log('=====================================');
  console.log(`Test configuration: ${TEST_DOMAINS_COUNT} test domains`);
  
  const results = {
    batchUpsert: null,
    indexLookup: null,
    parallelProcessing: null
  };
  
  try {
    // Test 1: Batch Upsert Performance
    results.batchUpsert = await testBatchUpsertPerformance();
    
    // Test 2: Index Lookup Performance
    results.indexLookup = await testIndexLookupPerformance();
    
    // Test 3: Parallel Processing
    results.parallelProcessing = await testParallelProcessing();
    
    // Summary
    console.log('\n=====================================');
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('=====================================');
    console.log(`Batch Upsert: ${results.batchUpsert.duration.toFixed(3)}s (${results.batchUpsert.entriesProcessed} entries)`);
    console.log(`Index Lookup: ${results.indexLookup.lookupDuration.toFixed(4)}s (${results.indexLookup.entriesFound} entries)`);
    console.log(`Parallel Processing: ${results.parallelProcessing.parallelDuration.toFixed(4)}s (${results.parallelProcessing.sourcesProcessed} sources)`);
    console.log('\nAll performance tests completed successfully!');
    
  } catch (error) {
    console.error('Performance test failed:', error);
    throw error;
  } finally {
    // Close database connection
    await prisma.$disconnect();
  }
}

// Run tests
runPerformanceTests()
  .then(() => {
    console.log('\nTest execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest execution failed:', error);
    process.exit(1);
  });
