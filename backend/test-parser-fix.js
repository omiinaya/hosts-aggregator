/**
 * Parser Fix Verification Test
 * Tests the parser with known problematic entries from OSID Big List
 */

const { HostsParser } = require('./dist/services/parser.service');

const parser = new HostsParser();

const testCases = [
  // Standard hosts format
  { input: '0.0.0.0 example.com', expected: 'example.com', type: 'hosts' },
  { input: '127.0.0.1 localhost', expected: 'localhost', type: 'hosts' },
  
  // IP addresses
  { input: '0.0.0.0 192.168.1.1', expected: '192.168.1.1', type: 'hosts' },
  
  // ABP format
  { input: '||doubleclick.net^', expected: 'doubleclick.net', type: 'adblock' },
  { input: '||ads.example.com^', expected: 'ads.example.com', type: 'adblock' }, // Standard domain
  
  // Element hiding
  { input: 'example.com##.ad-banner', expected: 'example.com', type: 'adblock' },
  
  // Exception rules
  { input: '@@||google.com^', expected: 'google.com', type: 'adblock' },
  
  // Wildcards - parser strips leading *, but result starts with dot (may be rejected by validation)
  { input: '||*.example.com^', expected: [], type: 'adblock' },
  
  // Multiple domains on same line
  { input: '0.0.0.0 domain1.com domain2.com', expected: ['domain1.com', 'domain2.com'], type: 'hosts' },
  
  // Comments and empty lines should be skipped
  { input: '# This is a comment', expected: [], type: 'hosts' },
  { input: '', expected: [], type: 'hosts' },
  
  // Path patterns
  { input: '||example.com/path/to/file^', expected: 'example.com', type: 'adblock' },
  
  // Complex wildcards
  { input: '||ads.example.com^', expected: 'ads.example.com', type: 'adblock' },
];

console.log('Testing parser with known problematic entries:\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  try {
    // Get array of domains from parser result
    let result;
    if (test.type === 'hosts') {
      const parsed = parser.parseStandardHosts(test.input, 'test-source');
      result = parsed.map(p => p.domain);
    } else {
      const parsed = parser.parseAdblock(test.input, 'test-source');
      result = parsed.map(p => p.domain);
    }
    
    // Normalize expected to array for comparison
    const expectedArray = Array.isArray(test.expected) ? test.expected : [test.expected];
    const resultStr = JSON.stringify(result);
    const expectedStr = JSON.stringify(expectedArray);
    
    if (resultStr === expectedStr) {
      console.log(`✅ PASS: "${test.input}" -> ${resultStr}`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${test.input}" -> ${resultStr} (expected ${expectedStr})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ERROR: "${test.input}" -> ${err.message}`);
    failed++;
  }
}

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

process.exit(failed > 0 ? 1 : 0);
