// Global test setup - runs once before all tests
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function globalSetup() {
  // Set DATABASE_URL to use SQLite for tests
  const backendDir = path.join(__dirname, '..', '..');
  const testDbPath = path.join(backendDir, 'test.db');
  
  // Remove existing test database if it exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Set the DATABASE_URL environment variable for tests
  process.env.DATABASE_URL = `file:${testDbPath}`;
  
  // Generate Prisma client with SQLite
  try {
    execSync('npx prisma generate', { 
      cwd: backendDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${testDbPath}` }
    });
  } catch (error) {
    console.error('Failed to generate Prisma client:', error);
    throw error;
  }
  
  // Push schema to SQLite database
  try {
    execSync('npx prisma db push', { 
      cwd: backendDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: `file:${testDbPath}` }
    });
  } catch (error) {
    console.error('Failed to push database schema:', error);
    throw error;
  }
};
