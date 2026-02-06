# PostgreSQL Migration Guide

This guide covers migrating the Hosts Aggregator from SQLite to PostgreSQL.

## Overview

We've migrated from SQLite to PostgreSQL to support:
- Better concurrency handling
- Production-grade performance
- Horizontal scaling capabilities
- Advanced querying features

## Changes Made

### 1. Database Schema (`backend/prisma/schema.prisma`)
- Changed provider from `sqlite` to `postgresql`
- All existing models preserved with PostgreSQL-compatible syntax

### 2. Environment Configuration (`backend/.env.example`)
```env
# PostgreSQL Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/hosts_aggregator?schema=public"
# For local development without Docker:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hosts_aggregator"
```

### 3. Docker Compose Files
- **docker-compose.yml**: Added PostgreSQL 16 service with health checks
- **docker-compose.dev.yml**: Added PostgreSQL for development
- Both include persistent volumes for data

### 4. Migration Scripts
Created migration file: `backend/prisma/migrations/postgres_init/migration.sql`

## Migration Steps

### Option 1: Fresh Installation (Recommended for new deployments)

1. **Start PostgreSQL**
   ```bash
   # Using Docker
   docker-compose up -d postgres
   
   # Or install PostgreSQL locally
   ```

2. **Configure Environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set DATABASE_URL
   ```

3. **Apply Migration**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Start Application**
   ```bash
   npm run dev
   ```

### Option 2: Migrate Existing SQLite Data

1. **Backup Your SQLite Database**
   ```bash
   cp backend/prisma/dev.db backend/prisma/dev.db.backup
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```

3. **Run Migration Script**
   ```bash
   cd scripts
   ./migrate-sqlite-to-postgres.sh
   ```

   This script will:
   - Export SQLite data
   - Convert syntax to PostgreSQL
   - Import into PostgreSQL

4. **Update Environment**
   ```bash
   cd backend
   # Update .env with PostgreSQL URL
   echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hosts_aggregator"' > .env
   ```

5. **Verify Migration**
   ```bash
   psql -h localhost -p 5432 -U postgres -d hosts_aggregator -c "SELECT COUNT(*) FROM sources;"
   ```

## Backup and Restore

### Automated Backups

```bash
# Run backup (creates timestamped backup)
cd scripts
./backup-db.sh

# Backups are saved to ./backups/ with 7-day retention
```

### Manual Backup

```bash
# Create backup
pg_dump -h localhost -p 5432 -U postgres -d hosts_aggregator > backup.sql

# Compress
gzip backup.sql
```

### Restore from Backup

```bash
# Interactive restore
cd scripts
./restore-db.sh ./backups/hosts_aggregator_backup_YYYYMMDD_HHMMSS.sql.gz

# Or manual restore
gunzip -c backup.sql.gz | psql -h localhost -p 5432 -U postgres -d hosts_aggregator
```

## Docker Deployment

### Production

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f postgres
docker-compose logs -f backend
```

### Development

```bash
# Start development stack
docker-compose -f docker-compose.dev.yml up -d

# Database will be available at localhost:5432
```

## Performance Considerations

### PostgreSQL Tuning

For production deployments, consider these PostgreSQL settings:

```sql
-- Connection settings
max_connections = 200

-- Memory settings
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 10485kB
maintenance_work_mem = 512MB

-- Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

-- Query planner
effective_io_concurrency = 200
random_page_cost = 1.1
```

### Indexing

All indexes from the SQLite schema have been migrated:
- Primary keys
- Unique constraints
- Foreign keys
- Query optimization indexes on frequently filtered columns

## Troubleshooting

### Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres | tail -50

# Test connection
psql -h localhost -p 5432 -U postgres -d hosts_aggregator -c "SELECT 1;"
```

### Migration Failures

1. **Permission Denied**: Ensure PostgreSQL user has CREATE privileges
2. **Connection Refused**: Check if PostgreSQL is running and port is correct
3. **Syntax Errors**: Review the migration SQL for SQLite-specific syntax

### Data Integrity

After migration, verify:
```bash
# Check row counts
psql -h localhost -p 5432 -U postgres -d hosts_aggregator <<EOF
SELECT 'Sources' as table_name, COUNT(*) as count FROM sources
UNION ALL
SELECT 'Host Entries', COUNT(*) FROM host_entries
UNION ALL
SELECT 'Users', COUNT(*) FROM users;
EOF
```

## Rollback Plan

If you need to rollback to SQLite:

1. Stop the application
2. Restore your SQLite backup:
   ```bash
   cp backend/prisma/dev.db.backup backend/prisma/dev.db
   ```
3. Update `.env` to use SQLite URL
4. Restart the application

## Next Steps

1. **Monitoring**: Set up PostgreSQL monitoring (pg_stat_statements, slow query log)
2. **High Availability**: Consider PostgreSQL replication for production
3. **Performance**: Monitor query performance and adjust indexes as needed
4. **Backups**: Schedule automated backups using cron

## Support

For issues with the migration:
1. Check the logs: `docker-compose logs postgres`
2. Review PostgreSQL documentation: https://www.postgresql.org/docs/
3. Check Prisma documentation: https://www.prisma.io/docs/concepts/database-connectors/postgresql
