import { prisma } from '../config/database';

// Global test setup
beforeAll(async () => {
  // Ensure test database is clean
  await cleanDatabase();
});

// Clean up after each test
afterEach(async () => {
  await cleanDatabase();
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanDatabase() {
  try {
    // Disable foreign keys to allow deleting in any order
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

    // Delete from all tables using correct SQLite table names
    const tables = [
      'aggregation_hosts',
      'aggregation_sources',
      'aggregation_results',
      'host_entries',
      'source_fetch_logs',
      'source_contents',
      'source_host_mappings',
      'sources',
      'users',
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (error) {
        // Table might not exist yet
      }
    }

    // Reset SQLite sequences
    try {
      await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence');
    } catch {
      // sqlite_sequence might not exist
    }

    // Re-enable foreign keys
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  } catch (error) {
    console.error('Database cleanup error:', error);
  }
}
