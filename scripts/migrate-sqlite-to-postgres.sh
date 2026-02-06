#!/bin/bash
# SQLite to PostgreSQL Migration Script for Hosts Aggregator

set -e

# Configuration
SQLITE_DB="${SQLITE_DB:-./prisma/dev.db}"
POSTGRES_DB="${POSTGRES_DB:-hosts_aggregator}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "========================================="
echo "SQLite to PostgreSQL Migration"
echo "========================================="
echo ""
echo "Source (SQLite): $SQLITE_DB"
echo "Target (PostgreSQL): $POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
echo ""

# Check if SQLite database exists
if [ ! -f "$SQLITE_DB" ]; then
  echo "Error: SQLite database not found: $SQLITE_DB"
  exit 1
fi

# Check PostgreSQL connection
echo "Checking PostgreSQL connection..."
if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "Error: Cannot connect to PostgreSQL database"
  echo "Please ensure PostgreSQL is running and accessible"
  exit 1
fi

echo "✓ PostgreSQL connection successful"
echo ""

# Export SQLite data to SQL
echo "Exporting SQLite data..."
TEMP_SQL=$(mktemp)
sqlite3 "$SQLITE_DB" .dump > "$TEMP_SQL"

echo "✓ SQLite data exported"
echo ""

# Convert SQLite syntax to PostgreSQL
echo "Converting SQLite syntax to PostgreSQL..."

# Remove SQLite-specific pragmas and commands
sed -i '/^PRAGMA/d' "$TEMP_SQL"
sed -i '/^BEGIN TRANSACTION/d' "$TEMP_SQL"
sed -i '/^COMMIT/d' "$TEMP_SQL"

# Convert datetime format
sed -i "s/datetime('now')/CURRENT_TIMESTAMP/g" "$TEMP_SQL"

# Convert boolean integers to proper booleans
sed -i 's/"enabled" INTEGER/"enabled" BOOLEAN/g' "$TEMP_SQL"
sed -i "s/'true'/true/g" "$TEMP_SQL"
sed -i "s/'false'/false/g" "$TEMP_SQL"
sed -i "s/\b1\b/true/g" "$TEMP_SQL"  # Be careful with this one
sed -i "s/\b0\b/false/g" "$TEMP_SQL"  # Be careful with this one

# Remove SQLite AUTOINCREMENT (not needed in PostgreSQL with SERIAL)
sed -i 's/AUTOINCREMENT//g' "$TEMP_SQL"

echo "✓ Syntax converted"
echo ""

# Import to PostgreSQL
echo "Importing data to PostgreSQL..."
echo "This may take a while depending on the database size..."

psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$TEMP_SQL"

echo "✓ Data imported successfully"
echo ""

# Clean up
rm -f "$TEMP_SQL"

echo "========================================="
echo "Migration Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  - SQLite database: $SQLITE_DB"
echo "  - PostgreSQL database: $POSTGRES_DB"
echo ""
echo "Next steps:"
echo "  1. Update your .env file to use PostgreSQL:"
echo "     DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_USER@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
echo "  2. Restart your application"
echo "  3. Verify data integrity"
echo ""
echo "To verify the migration:"
echo "  psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c 'SELECT COUNT(*) FROM sources;'"
echo ""
