# Production Readiness Guide

This document outlines the production deployment setup for Hosts Aggregator, including PostgreSQL migration, Kubernetes deployment, backup strategies, and performance monitoring.

## Table of Contents

- [Database Migration](#database-migration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Backup & Recovery](#backup--recovery)
- [Performance Monitoring](#performance-monitoring)
- [Troubleshooting](#troubleshooting)

## Database Migration

### Prerequisites

- PostgreSQL 16 or higher
- Database user with CREATE privileges
- Sufficient disk space (minimum 10GB recommended)

### Migration Steps

1. **Start PostgreSQL using Docker Compose:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Verify PostgreSQL is healthy:**
   ```bash
   docker-compose ps postgres
   ```

3. **Create initial migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name init_postgres
   ```

4. **Verify database tables:**
   ```bash
   npx prisma studio
   ```

### Environment Variables

Update your `.env` file:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hosts_aggregator"
```

For production:

```env
DATABASE_URL="postgresql://user:password@postgres:5432/hosts_aggregator"
```

## Docker Deployment

### Production Setup

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f postgres
   docker-compose logs -f redis
   ```

3. **Scale backend instances:**
   ```bash
   docker-compose up -d --scale backend=3
   ```

### Services

- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)
- **backend**: API server (port 3010)
- **frontend**: React app (port 80)

### Volumes

- `postgres-data`: Persistent PostgreSQL data
- `redis-data`: Persistent Redis data

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- kubectl configured to communicate with your cluster

### Deploy to Kubernetes

1. **Create namespace (optional):**
   ```bash
   kubectl create namespace hosts-aggregator
   ```

2. **Deploy PostgreSQL:**
   ```bash
   kubectl apply -f k8s/postgres-secret.yaml
   kubectl apply -f k8s/postgres-deployment.yaml
   kubectl apply -f k8s/postgres-pvc.yaml
   ```

3. **Deploy backend:**
   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   ```

4. **Verify deployments:**
   ```bash
   kubectl get pods -l app=hosts-aggregator
   kubectl get services -l app=hosts-aggregator
   ```

### Kubernetes Resources

#### Secrets

Database credentials are stored in `postgres-secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
type: Opaque
stringData:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: your-secure-password
  POSTGRES_DB: hosts_aggregator
```

**⚠️ Important:** Change the default password in production!

#### Persistent Volumes

PostgreSQL uses StatefulSet with persistent volume claims:
- Storage: 10Gi (adjust as needed)
- Access Mode: ReadWriteOnce
- Storage Class: standard

#### Backup CronJob

Automated backups run daily at 2 AM:

```bash
kubectl apply -f k8s/postgres-backup.yaml
```

Check backup status:
```bash
kubectl get cronjobs
kubectl get jobs -l app=hosts-aggregator,component=postgres-backup
```

## Backup & Recovery

### Manual Backup

Create a backup manually:

```bash
./scripts/backup-postgres.sh
```

Configuration options:
```bash
DB_HOST=localhost \
DB_USER=postgres \
DB_PASSWORD=secret \
DB_NAME=hosts_aggregator \
BACKUP_DIR=./backups \
RETENTION_DAYS=30 \
./scripts/backup-postgres.sh
```

### Restore from Backup

Restore database from a backup file:

```bash
./scripts/restore-postgres.sh ./backups/hosts-aggregator-20260101-120000.dump
```

**⚠️ Warning:** This will overwrite the existing database!

### Automated Backups (Kubernetes)

Backups are automatically created by the CronJob and stored in the `postgres-backup-pvc` persistent volume.

To access backups:

```bash
# List backup pods
kubectl get pods -l job-name=postgres-backup

# Access backup files
kubectl exec -it <backup-pod> -- ls -la /backup

# Copy backup to local machine
kubectl cp <backup-pod>:/backup/hosts-aggregator-20260101-120000.dump ./backup.dump
```

## Performance Monitoring

### Database Performance

Monitor database health:

```bash
# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Check table sizes
psql $DATABASE_URL -c "
  SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename))
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(tablename) DESC;
"

# Check slow queries
psql $DATABASE_URL -c "
  SELECT query, calls, mean_time, rows
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"
```

### Benchmarking

Run performance benchmarks:

```bash
./scripts/benchmark.sh
```

This will test:
- Database query performance
- API response times
- Aggregation operation duration

Results are saved to `./benchmarks/benchmark-YYYYMMDD-HHMMSS.txt`

### Prometheus Metrics

The application exposes metrics at `/metrics`:

```bash
curl http://localhost:3010/metrics
```

Key metrics:
- `http_request_duration_seconds` - HTTP request latency
- `aggregation_duration_seconds` - Aggregation operation duration
- `source_fetch_total` - Source fetch attempts

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   docker-compose ps postgres
   # or
   kubectl get pods -l component=postgres
   ```

2. **Verify connection string:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **Check logs:**
   ```bash
   docker-compose logs postgres | tail -50
   # or
   kubectl logs -l component=postgres
   ```

### Migration Failures

1. **Reset database:**
   ```bash
   # Docker
   docker-compose down -v postgres
   docker-compose up -d postgres
   
   # Kubernetes
   kubectl delete pvc postgres-data
   kubectl apply -f k8s/postgres-deployment.yaml
   ```

2. **Re-run migrations:**
   ```bash
   npx prisma migrate reset
   ```

### Backup Failures

1. **Check disk space:**
   ```bash
   df -h
   ```

2. **Verify backup directory:**
   ```bash
   ls -la ./backups/
   ```

3. **Check PostgreSQL connectivity:**
   ```bash
   pg_isready -h localhost -U postgres
   ```

## Security Considerations

### Database Security

1. **Use strong passwords:**
   ```bash
   # Generate secure password
   openssl rand -base64 32
   ```

2. **Restrict network access:**
   - Use Kubernetes NetworkPolicies
   - Configure firewall rules
   - Disable external PostgreSQL access in production

3. **Enable SSL/TLS:**
   ```env
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   ```

### Secrets Management

For production, use a secrets management solution:
- Kubernetes: External Secrets Operator
- AWS: AWS Secrets Manager
- GCP: Secret Manager
- Azure: Azure Key Vault

## Maintenance

### Regular Tasks

- **Daily:** Review backup status
- **Weekly:** Run performance benchmarks
- **Monthly:** Review disk usage and cleanup old backups
- **Quarterly:** Update PostgreSQL and dependencies

### Scaling

#### Horizontal Scaling

Scale backend replicas:
```bash
kubectl scale deployment hosts-aggregator-backend --replicas=5
```

#### Vertical Scaling

Update resource limits in `backend-deployment.yaml`:
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Support

For issues or questions:
- Check the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guide
- Review logs: `docker-compose logs` or `kubectl logs`
- Run diagnostics: `./scripts/benchmark.sh`
