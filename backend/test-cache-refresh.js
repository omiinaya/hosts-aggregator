// Test script for cache refresh functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testCacheRefresh() {
  console.log('Testing cache refresh functionality...\n');

  try {
    // 1. Get all sources first
    console.log('1. Getting all sources...');
    const sourcesResponse = await axios.get(`${BASE_URL}/sources`);
    const sources = sourcesResponse.data.data;
    
    if (sources.length === 0) {
      console.log('No sources found. Please create a source first.');
      return;
    }

    console.log(`Found ${sources.length} sources\n`);

    // 2. Test individual cache refresh
    const firstSource = sources[0];
    console.log('2. Testing individual cache refresh...');
    console.log(`Source: ${firstSource.name} (ID: ${firstSource.id})`);
    
    try {
      const refreshResponse = await axios.post(`${BASE_URL}/sources/${firstSource.id}/refresh-cache`);
      console.log(`Response: ${refreshResponse.data.message}\n`);
    } catch (error) {
      console.log(`Error refreshing cache: ${error.response?.data?.message || error.message}\n`);
    }

    // 3. Test bulk cache refresh
    console.log('3. Testing bulk cache refresh...');
    try {
      const bulkRefreshResponse = await axios.post(`${BASE_URL}/sources/refresh-cache`);
      console.log(`Response: ${bulkRefreshResponse.data.message}\n`);
    } catch (error) {
      console.log(`Error refreshing all cache: ${error.response?.data?.message || error.message}\n`);
    }

    // 4. Test source update with URL change
    console.log('4. Testing source update with URL change...');
    const testUrl = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts';
    
    try {
      const updateResponse = await axios.put(`${BASE_URL}/sources/${firstSource.id}`, {
        url: testUrl
      });
      console.log(`Source updated successfully: ${updateResponse.data.data.name}\n`);
    } catch (error) {
      console.log(`Error updating source: ${error.response?.data?.message || error.message}\n`);
    }

    console.log('Cache refresh functionality test completed!');

  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('Make sure the backend server is running on port 3000');
    }
  }
}

// Run the test
testCacheRefresh();