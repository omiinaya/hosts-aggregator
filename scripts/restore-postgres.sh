#!/bin/bash
# PostgreSQL Restore Script for Hosts Aggregator
# Usage: ./restore-postgres.sh <backup-file>

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-hosts_aggregator}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Check if backup file is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup-file>"
  echo "Example: $0 ./backups/hosts-aggregator-20260101-120000.dump"
  echo ""
  echo "Available backups:"
  ls -1t ./backups/*.dump 2>/dev/null || echo "No backups found in ./backups/"
  exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "=================================="
echo "PostgreSQL Database Restore"
echo "=================================="
echo ""
echo "WARNING: This will overwrite the existing database!"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo ""
echo "Starting restore process..."

# Export password for pg_restore
export PGPASSWORD="$DB_PASSWORD"

# Check if database exists
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
  echo "Database server is ready."
  
  # Terminate existing connections
  echo "Terminating existing connections to $DB_NAME..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
  " 2>/dev/null || true
  
  # Drop and recreate database
  echo "Dropping existing database $DB_NAME..."
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
  
  echo "Creating new database $DB_NAME..."
  createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  
  # Restore database
  echo "Restoring from backup..."
  pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-privileges \
    "$BACKUP_FILE"
  
  echo ""
  echo "Restore completed successfully!"
  echo "Database $DB_NAME has been restored from $BACKUP_FILE"
else
  echo "ERROR: Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT"
  exit 1
fi
