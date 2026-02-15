// Global test teardown - runs once after all tests
const fs = require('fs');
const path = require('path');

module.exports = async function globalTeardown() {
  // Clean up the test database
  const backendDir = path.join(__dirname, '..', '..');
  const testDbPath = path.join(backendDir, 'test.db');
  
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (error) {
      console.error('Failed to delete test database:', error);
    }
  }
};
