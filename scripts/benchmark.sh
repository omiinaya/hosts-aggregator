#!/bin/bash
# Performance Benchmarking Script for Hosts Aggregator
# This script benchmarks database operations and API performance

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3010}"
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/hosts_aggregator}"
DURATION="${DURATION:-30}"
CONCURRENT_USERS="${CONCURRENT_USERS:-10}"
OUTPUT_DIR="${OUTPUT_DIR:-./benchmarks}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Hosts Aggregator Performance Benchmark"
echo "=================================="
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$OUTPUT_DIR/benchmark-$TIMESTAMP.txt"

# Function to log with timestamp
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$REPORT_FILE"
}

# Check if required tools are installed
check_tools() {
  log "Checking required tools..."
  
  if ! command -v curl &> /dev/null; then
    echo -e "${RED}ERROR: curl is not installed${NC}"
    exit 1
  fi
  
  if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql is not installed${NC}"
    exit 1
  fi
  
  log "All required tools are available ✓"
}

# Benchmark database query performance
benchmark_database() {
  log ""
  log "=================================="
  log "Database Query Performance"
  log "=================================="
  
  # Test 1: Count sources
  log ""
  log "Test 1: Count sources"
  START_TIME=$(date +%s%N)
  SOURCE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM sources;" 2>/dev/null || echo "0")
  END_TIME=$(date +%s%N)
  DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  log "  Sources: $SOURCE_COUNT"
  log "  Query time: ${DURATION_MS}ms"
  
  # Test 2: Count host entries
  log ""
  log "Test 2: Count host entries"
  START_TIME=$(date +%s%N)
  HOST_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM host_entries;" 2>/dev/null || echo "0")
  END_TIME=$(date +%s%N)
  DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  log "  Host entries: $HOST_COUNT"
  log "  Query time: ${DURATION_MS}ms"
  
  # Test 3: Aggregation query performance
  log ""
  log "Test 3: Aggregation results query"
  START_TIME=$(date +%s%N)
  AGG_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM aggregation_results;" 2>/dev/null || echo "0")
  END_TIME=$(date +%s%N)
  DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  log "  Aggregation results: $AGG_COUNT"
  log "  Query time: ${DURATION_MS}ms"
  
  # Test 4: Database size
  log ""
  log "Test 4: Database size"
  DB_SIZE=$(psql "$DB_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null || echo "Unknown")
  log "  Database size: $DB_SIZE"
  
  # Test 5: Table sizes
  log ""
  log "Test 5: Table sizes"
  psql "$DB_URL" -c "
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  " 2>/dev/null | tee -a "$REPORT_FILE" || log "  Could not retrieve table sizes"
}

# Benchmark API endpoints
benchmark_api() {
  log ""
  log "=================================="
  log "API Performance"
  log "=================================="
  
  # Test 1: Health endpoint
  log ""
  log "Test 1: Health endpoint"
  START_TIME=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" 2>/dev/null || echo "000")
  END_TIME=$(date +%s%N)
  RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  log "  Status: $HTTP_CODE"
  log "  Response time: ${RESPONSE_TIME}ms"
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ API is healthy${NC}" | tee -a "$REPORT_FILE"
  else
    echo -e "${YELLOW}  ⚠ API health check returned $HTTP_CODE${NC}" | tee -a "$REPORT_FILE"
  fi
  
  # Test 2: List sources
  log ""
  log "Test 2: List sources endpoint"
  START_TIME=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/sources" 2>/dev/null || echo "000")
  END_TIME=$(date +%s%N)
  RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  log "  Status: $HTTP_CODE"
  log "  Response time: ${RESPONSE_TIME}ms"
  
  # Test 3: Get aggregated hosts
  log ""
  log "Test 3: Get aggregated hosts endpoint"
  START_TIME=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/serve/hosts" 2>/dev/null || echo "000")
  END_TIME=$(date +%s%N)
  RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  log "  Status: $HTTP_CODE"
  log "  Response time: ${RESPONSE_TIME}ms"
}

# Benchmark aggregation operation
benchmark_aggregation() {
  log ""
  log "=================================="
  log "Aggregation Performance"
  log "=================================="
  
  log ""
  log "Triggering aggregation..."
  START_TIME=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_URL}/api/aggregate" 2>/dev/null || echo "000")
  END_TIME=$(date +%s%N)
  AGG_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
  
  log "  Status: $HTTP_CODE"
  log "  Total time: ${AGG_TIME}ms"
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ Aggregation completed successfully${NC}" | tee -a "$REPORT_FILE"
  else
    echo -e "${YELLOW}  ⚠ Aggregation returned $HTTP_CODE${NC}" | tee -a "$REPORT_FILE"
  fi
}

# Generate summary
generate_summary() {
  log ""
  log "=================================="
  log "Benchmark Summary"
  log "=================================="
  log ""
  log "Report saved to: $REPORT_FILE"
  log "Timestamp: $(date)"
  log ""
  log "Environment:"
  log "  API URL: $API_URL"
  log "  Database: PostgreSQL"
  log ""
  log "Recommendations:"
  log "  - Review response times above 1000ms"
  log "  - Monitor database growth over time"
  log "  - Consider adding indexes for slow queries"
  log "  - Implement caching for frequently accessed data"
  log ""
}

# Main execution
main() {
  check_tools
  benchmark_database
  benchmark_api
  benchmark_aggregation
  generate_summary
  
  echo ""
  echo -e "${GREEN}Benchmark completed!${NC}"
  echo "Report saved to: $REPORT_FILE"
}

main
