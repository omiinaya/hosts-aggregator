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
  // Delete in order to respect foreign keys
  const tables = [
    'AggregationHost',
    'AggregationSource',
    'AggregationResult',
    'HostEntry',
    'SourceFetchLog',
    'SourceContent',
    'Source',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    } catch (error) {
      // Table might not exist yet
      console.warn(`Could not clean table ${table}:`, error);
    }
  }
}
