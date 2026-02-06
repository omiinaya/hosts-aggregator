#!/bin/bash
# PostgreSQL Backup Script for Hosts Aggregator
# This script can be run manually or via CronJob

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-hosts_aggregator}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hosts-aggregator-$TIMESTAMP.dump"

echo "Starting PostgreSQL backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"

# Perform backup using pg_dump
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --format=custom \
  --verbose \
  --file="$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
  echo "Backup completed successfully!"
  echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
  echo "ERROR: Backup file was not created!"
  exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.dump" -type f -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "Remaining backups:"
ls -lh "$BACKUP_DIR"
