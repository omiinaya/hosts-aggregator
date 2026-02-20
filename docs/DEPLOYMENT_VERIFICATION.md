# Deployment Verification Guide

A comprehensive guide for verifying Hosts Aggregator deployments.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Smoke Test Script](#smoke-test-script)
4. [API Endpoint Tests](#api-endpoint-tests)
5. [Dashboard Verification](#dashboard-verification)
6. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Prerequisites

Ensure you have the following tools installed:

```bash
# curl - for HTTP requests
curl --version

# jq - for JSON parsing
jq --version

# psql - for PostgreSQL verification (if using PostgreSQL)
psql --version

# kubectl - for Kubernetes verification (if using K8s)
kubectl version

# docker-compose - for Docker verification (if using Docker)
docker-compose --version
```

### Environment Variables

Set up environment variables for testing:

```bash
# Required
export BASE_URL="https://your-hosts-aggregator-domain.com"
export API_URL="${BASE_URL}/api"

# Optional - if authentication is enabled
export AUTH_TOKEN="your-api-token"

# Optional - if using PostgreSQL
export DATABASE_URL="postgresql://user:pass@localhost:5432/hosts_aggregator"

# Optional - for Kubernetes
export K8S_NAMESPACE="hosts-aggregator"
```

### Test Data Preparation

Create a test source for verification:

```bash
# Create a test source
curl -X POST "${API_URL}/sources" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Source - Deployment Verification",
    "url": "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    "type": "URL",
    "enabled": true
  }'
```

---

## Health Check Endpoints

### Basic Health Check

Verify the application is running:

```bash
curl -s "${BASE_URL}/health" | jq .
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-20T12:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

### API Health Check

Check API-specific health:

```bash
curl -s "${API_URL}/serve/health" | jq .
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "healthy": true,
    "hasHostsFile": true,
    "lastGenerated": "2026-02-20T11:30:00.000Z",
    "totalEntries": 150000,
    "message": "Hosts file is available for serving"
  }
}
```

### Database Health Check

**SQLite:**
```bash
curl -s "${API_URL}/sources" -o /dev/null -w "%{http_code}"
# Expected: 200
```

**PostgreSQL:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
# Expected: 1 row returned
```

### Kubernetes Health Checks

```bash
# Check pod status
kubectl get pods -n ${K8S_NAMESPACE} -l app=hosts-aggregator

# Check service status
kubectl get svc -n ${K8S_NAMESPACE} -l app=hosts-aggregator

# Check ingress
kubectl get ingress -n ${K8S_NAMESPACE}

# View pod logs
kubectl logs -n ${K8S_NAMESPACE} -l component=backend --tail=50
```

### Docker Health Checks

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs --tail=50 backend

# Check resource usage
docker stats --no-stream
```

---

## Smoke Test Script

### Quick Verification Script

Create `verify-deployment.sh`:

```bash
#!/bin/bash
set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3010}"
API_URL="${BASE_URL}/api"
TIMEOUT=30

echo "=== Hosts Aggregator Deployment Verification ==="
echo "Target URL: ${BASE_URL}"
echo "Time: $(date)"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0

# Test function
run_test() {
    local name=$1
    local command=$2
    
    echo -n "Testing: $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}FAILED${NC}"
        ((FAILED++))
    fi
}

# 1. Basic Connectivity
echo "=== Basic Connectivity ==="
run_test "HTTP GET /health" "curl -sf --max-time ${TIMEOUT} ${BASE_URL}/health"
run_test "HTTP GET /api/sources" "curl -sf --max-time ${TIMEOUT} ${API_URL}/sources"

# 2. API Endpoints
echo ""
echo "=== API Endpoints ==="
run_test "GET /api/aggregated/stats" "curl -sf --max-time ${TIMEOUT} ${API_URL}/aggregated/stats"
run_test "GET /api/serve/hosts/info" "curl -sf --max-time ${TIMEOUT} ${API_URL}/serve/hosts/info"
run_test "GET /api/serve/health" "curl -sf --max-time ${TIMEOUT} ${API_URL}/serve/health"

# 3. Serve Endpoints
echo ""
echo "=== Serve Endpoints ==="
run_test "Serve ABP format" "curl -sf --max-time ${TIMEOUT} ${API_URL}/serve/hosts"
run_test "Serve Standard format" "curl -sf --max-time ${TIMEOUT} ${API_URL}/serve/hosts?format=standard"
run_test "Serve Raw ABP" "curl -sf --max-time ${TIMEOUT} ${API_URL}/serve/hosts/raw"
run_test "Serve Raw Standard" "curl -sf --max-time ${TIMEOUT} ${API_URL}/serve/hosts/raw?format=standard"

# 4. Content Verification
echo ""
echo "=== Content Verification ==="
run_test "Hosts file has content" "curl -sf ${API_URL}/serve/hosts/raw | grep -q '||'"
run_test "Standard format valid" "curl -sf ${API_URL}/serve/hosts/raw?format=standard | grep -q '0.0.0.0'"
run_test "JSON responses valid" "curl -sf ${API_URL}/sources | jq -e '.status == \"success\"'"

# Summary
echo ""
echo "=== Summary ==="
echo -e "Tests Passed: ${GREEN}${PASSED}${NC}"
echo -e "Tests Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Deployment is healthy.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
```

Make executable and run:
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

### Comprehensive Verification Script

Create `full-verification.sh`:

```bash
#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3010}"
API_URL="${BASE_URL}/api"
OUTPUT_DIR="./verification-results-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUTPUT_DIR"

echo "=== Full Deployment Verification ==="
echo "Results will be saved to: $OUTPUT_DIR"
echo ""

# Function to save responses
save_response() {
    local endpoint=$1
    local filename=$2
    curl -s --max-time 30 "${API_URL}${endpoint}" > "${OUTPUT_DIR}/${filename}.json" 2>&1 || echo '{"error": "Request failed"}' > "${OUTPUT_DIR}/${filename}.json"
}

# Test all endpoints
echo "Testing all endpoints..."

save_response "/sources" "sources"
save_response "/aggregated/stats" "aggregation-stats"
save_response "/serve/hosts/info" "hosts-info"
save_response "/serve/health" "serve-health"

# Test serve endpoints
echo "Testing serve endpoints..."
curl -s --max-time 30 "${API_URL}/serve/hosts" > "${OUTPUT_DIR}/hosts-abp.txt"
curl -s --max-time 30 "${API_URL}/serve/hosts?format=standard" > "${OUTPUT_DIR}/hosts-standard.txt"
curl -s --max-time 30 "${API_URL}/serve/hosts/raw" > "${OUTPUT_DIR}/hosts-raw-abp.txt"
curl -s --max-time 30 "${API_URL}/serve/hosts/raw?format=standard" > "${OUTPUT_DIR}/hosts-raw-standard.txt"

# Verify content
echo "Verifying content..."
echo "=== Content Verification ===" > "${OUTPUT_DIR}/verification-report.txt"
echo "Timestamp: $(date)" >> "${OUTPUT_DIR}/verification-report.txt"
echo "" >> "${OUTPUT_DIR}/verification-report.txt"

# Check ABP format
if grep -q '||' "${OUTPUT_DIR}/hosts-raw-abp.txt" 2>/dev/null; then
    echo "✓ ABP format contains blocking rules" >> "${OUTPUT_DIR}/verification-report.txt"
else
    echo "✗ ABP format missing blocking rules" >> "${OUTPUT_DIR}/verification-report.txt"
fi

# Check Standard format
if grep -q '0.0.0.0' "${OUTPUT_DIR}/hosts-raw-standard.txt" 2>/dev/null; then
    echo "✓ Standard format contains entries" >> "${OUTPUT_DIR}/verification-report.txt"
else
    echo "✗ Standard format missing entries" >> "${OUTPUT_DIR}/verification-report.txt"
fi

# Count entries
ABP_COUNT=$(grep -c '^||' "${OUTPUT_DIR}/hosts-raw-abp.txt" 2>/dev/null || echo "0")
STD_COUNT=$(grep -c '^0\.0\.0\.0' "${OUTPUT_DIR}/hosts-raw-standard.txt" 2>/dev/null || echo "0")

echo "" >> "${OUTPUT_DIR}/verification-report.txt"
echo "=== Statistics ===" >> "${OUTPUT_DIR}/verification-report.txt"
echo "ABP format entries: $ABP_COUNT" >> "${OUTPUT_DIR}/verification-report.txt"
echo "Standard format entries: $STD_COUNT" >> "${OUTPUT_DIR}/verification-report.txt"

echo ""
echo "Verification complete!"
echo "Results saved to: ${OUTPUT_DIR}/"
echo ""
cat "${OUTPUT_DIR}/verification-report.txt"
```

---

## API Endpoint Tests

### Sources API Tests

```bash
# Test 1: List sources
echo "Testing GET /api/sources..."
curl -s "${API_URL}/sources" | jq '.status'
# Expected: "success"

# Test 2: Create source (if allowed)
echo "Testing POST /api/sources..."
TEST_SOURCE=$(curl -s -X POST "${API_URL}/sources" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Source",
    "url": "https://example.com/hosts.txt",
    "type": "URL",
    "enabled": false
  }' | jq -r '.data.id')

echo "Created test source ID: $TEST_SOURCE"

# Test 3: Get specific source
echo "Testing GET /api/sources/{id}..."
curl -s "${API_URL}/sources/${TEST_SOURCE}" | jq '.status'

# Test 4: Update source
echo "Testing PUT /api/sources/{id}..."
curl -s -X PUT "${API_URL}/sources/${TEST_SOURCE}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Test Source"}' | jq '.status'

# Test 5: Delete test source
echo "Testing DELETE /api/sources/{id}..."
curl -s -X DELETE "${API_URL}/sources/${TEST_SOURCE}" -o /dev/null -w "%{http_code}"
# Expected: 200
```

### Aggregation API Tests

```bash
# Test 1: Get aggregation stats
echo "Testing GET /api/aggregated/stats..."
curl -s "${API_URL}/aggregated/stats" | jq '.status'

# Test 2: Get latest aggregation
echo "Testing GET /api/aggregated..."
curl -s "${API_URL}/aggregated" | jq '.status'

# Test 3: Get aggregation history
echo "Testing GET /api/aggregated/history..."
curl -s "${API_URL}/aggregated/history?limit=5" | jq '.status'

# Test 4: Trigger aggregation (use with caution in production)
echo "Testing POST /api/aggregated..."
curl -s -X POST "${API_URL}/aggregated" | jq '.status'
```

### Serve API Tests

```bash
# Test 1: Get ABP format
echo "Testing ABP format..."
curl -s "${API_URL}/serve/hosts" | head -20

# Test 2: Get Standard format
echo "Testing Standard format..."
curl -s "${API_URL}/serve/hosts?format=standard" | head -20

# Test 3: Get Raw ABP
echo "Testing Raw ABP..."
curl -s "${API_URL}/serve/hosts/raw" | head -20

# Test 4: Get hosts info
echo "Testing GET /api/serve/hosts/info..."
curl -s "${API_URL}/serve/hosts/info" | jq '.'

# Test 5: Verify content types
echo "Testing Content-Type headers..."
curl -sI "${API_URL}/serve/hosts" | grep -i content-type
curl -sI "${API_URL}/serve/hosts/info" | grep -i content-type
```

### Response Time Tests

```bash
# Measure API response times
echo "=== Response Time Tests ==="

echo "GET /health:"
curl -s -o /dev/null -w "%{time_total}s\n" "${BASE_URL}/health"

echo "GET /api/sources:"
curl -s -o /dev/null -w "%{time_total}s\n" "${API_URL}/sources"

echo "GET /api/serve/hosts:"
curl -s -o /dev/null -w "%{time_total}s\n" "${API_URL}/serve/hosts/raw"

echo "GET /api/aggregated/stats:"
curl -s -o /dev/null -w "%{time_total}s\n" "${API_URL}/aggregated/stats"

# Performance thresholds
# /health: < 100ms
# /api/sources: < 500ms
# /api/serve/hosts: < 2000ms
# /api/aggregated/stats: < 500ms
```

---

## Dashboard Verification

### Frontend Accessibility

```bash
# Test 1: Dashboard loads
echo "Testing dashboard accessibility..."
curl -s -o /dev/null -w "%{http_code}\n" "${BASE_URL}/"
# Expected: 200

# Test 2: Static assets
echo "Testing static assets..."
curl -s -o /dev/null -w "%{http_code}\n" "${BASE_URL}/index.html"
# Expected: 200

# Test 3: API connectivity from frontend
echo "Testing frontend API connectivity..."
curl -s "${BASE_URL}/" | grep -q "script" && echo "✓ HTML loads" || echo "✗ HTML failed"
```

### Browser Console Tests

Manual verification in browser:

1. Open browser DevTools (F12)
2. Navigate to Console tab
3. Load application URL
4. Verify no critical errors:
   - No 404 errors for assets
   - No CORS errors
   - No JavaScript exceptions
   - API calls succeed (Network tab)

### Responsive Design Check

Verify UI on different screen sizes:

```javascript
// Run in browser console
// Test responsive breakpoints

const breakpoints = [
    { width: 1920, height: 1080, name: 'Desktop' },
    { width: 1366, height: 768, name: 'Laptop' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' }
];

breakpoints.forEach(bp => {
    console.log(`Testing ${bp.name}: ${bp.width}x${bp.height}`);
    window.resizeTo(bp.width, bp.height);
});
```

### Functional Tests

Manual verification checklist:

- [ ] Dashboard loads and displays statistics
- [ ] Sources page lists all sources
- [ ] Can add a new source (test with temporary source)
- [ ] Can edit a source
- [ ] Can toggle source on/off
- [ ] Can delete a source (test source)
- [ ] Aggregation runs successfully
- [ ] Can view aggregated hosts
- [ ] Filtering works on hosts page
- [ ] Search functionality works
- [ ] Settings page loads
- [ ] Can export hosts file
- [ ] All navigation links work

---

## Troubleshooting

### Common Issues

#### Application Not Responding

```bash
# Check if process is running
pgrep -f "node.*backend" || echo "Backend not running"

# Check ports
netstat -tlnp | grep 3010 || ss -tlnp | grep 3010

# Check logs
tail -f backend/logs/app.log
tail -f /var/log/nginx/error.log  # if using nginx
```

#### Database Connection Issues

**SQLite:**
```bash
# Check database file
ls -la backend/dev.db

# Verify permissions
sqlite3 backend/dev.db ".tables"
```

**PostgreSQL:**
```bash
# Test connection
pg_isready -h localhost -p 5432 -U postgres

# Check logs
docker-compose logs postgres
# or
kubectl logs -n ${K8S_NAMESPACE} -l component=postgres
```

#### API Returns 404

```bash
# Check routes are registered
curl -s "${BASE_URL}/health"

# Verify base URL
echo "Base URL: ${BASE_URL}"
echo "API URL: ${API_URL}"

# Test with verbose output
curl -v "${API_URL}/sources" 2>&1 | head -50
```

#### Serve Endpoint Empty

```bash
# Check if aggregation has run
curl -s "${API_URL}/serve/health" | jq '.'

# Verify sources exist
curl -s "${API_URL}/sources" | jq '.data | length'

# Check sources are enabled
curl -s "${API_URL}/sources" | jq '.data[] | select(.enabled == true) | .name'

# Trigger manual aggregation
curl -s -X POST "${API_URL}/aggregated" | jq '.'
```

### Debug Mode

Enable debug logging:

```bash
# Set log level
export LOG_LEVEL=debug

# Restart application
npm run dev  # or production command

# View detailed logs
tail -f backend/logs/app.log | grep -i "error\|warn\|debug"
```

### Network Diagnostics

```bash
# DNS resolution
dig +short your-domain.com

# Connection test
curl -v --max-time 10 "${BASE_URL}/health" 2>&1 | head -30

# SSL/TLS check (if HTTPS)
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null

# Traceroute
traceroute your-domain.com
```

### Recovery Procedures

#### If Deployment Fails

1. **Check logs first:**
   ```bash
   docker-compose logs --tail=100
   kubectl logs -n ${K8S_NAMESPACE} --all-containers --previous
   ```

2. **Verify configuration:**
   ```bash
   cat backend/.env
   env | grep -E "DATABASE|PORT|HOST"
   ```

3. **Restart services:**
   ```bash
   # Docker
docker-compose restart
   
   # Kubernetes
   kubectl rollout restart deployment/hosts-aggregator-backend -n ${K8S_NAMESPACE}
   ```

4. **Rollback if needed:**
   ```bash
   # Docker
docker-compose down
git checkout previous-version
docker-compose up -d
   
   # Kubernetes
   kubectl rollout undo deployment/hosts-aggregator-backend -n ${K8S_NAMESPACE}
   ```

#### Database Recovery

```bash
# Restore from backup
./scripts/restore-postgres.sh /path/to/backup.dump

# Or reset and re-migrate
cd backend
npx prisma migrate reset --force
npx prisma migrate deploy
```

### Verification Checklist Summary

Run this final checklist:

```bash
echo "=== Final Verification Checklist ==="

checks=(
    "Health endpoint responds:curl -sf ${BASE_URL}/health"
    "API accessible:curl -sf ${API_URL}/sources"
    "Sources endpoint returns data:curl -sf ${API_URL}/sources | jq -e '.data'"
    "Aggregation stats available:curl -sf ${API_URL}/aggregated/stats | jq -e '.data'"
    "Hosts file serves:curl -sf ${API_URL}/serve/hosts/raw | grep -q '||'"
    "Standard format works:curl -sf ${API_URL}/serve/hosts/raw?format=standard | grep -q '0.0.0.0'"
    "Serve health OK:curl -sf ${API_URL}/serve/health | jq -e '.data.healthy == true'"
)

for check in "${checks[@]}"; do
    IFS=: read -r name cmd <<< "$check"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "✓ $name"
    else
        echo "✗ $name"
    fi
done
```

---

## Sign-Off Template

```
DEPLOYMENT VERIFICATION SIGN-OFF
================================

Environment: [Production/Staging/Development]
Date: _______________
Version: _______________
Verified By: _______________

PRE-DEPLOYMENT CHECKS:
□ All tests pass
□ Configuration validated
□ Backup completed
□ Team notified

POST-DEPLOYMENT VERIFICATION:
□ Application accessible
□ Health checks pass
□ API endpoints respond
□ Dashboard loads
□ Sources list displays
□ Aggregation works
□ Hosts file serves
□ Monitoring active
□ Logs flowing

APPROVAL:
______________
Signature

NOTES:
_______________________________________________
_______________________________________________
```

---

*Last Updated: February 2026*
