# Production Launch Checklist

A comprehensive checklist for launching Hosts Aggregator into production.

## Table of Contents

1. [Pre-Launch Checks](#pre-launch-checks)
2. [Security Checklist](#security-checklist)
3. [Performance Checklist](#performance-checklist)
4. [Database Checklist](#database-checklist)
5. [Kubernetes Checklist](#kubernetes-checklist)
6. [Monitoring Checklist](#monitoring-checklist)
7. [Documentation Checklist](#documentation-checklist)
8. [Go-Live Steps](#go-live-steps)

---

## Pre-Launch Checks

### Application Functionality

- [ ] Application starts without errors
- [ ] Dashboard loads successfully
- [ ] All API endpoints respond correctly
- [ ] Sources can be added/edited/deleted
- [ ] Aggregation completes successfully
- [ ] Hosts file is served correctly
- [ ] File uploads work (if applicable)
- [ ] Search and filtering work
- [ ] Authentication works (if enabled)
- [ ] All CRUD operations function

### Environment Setup

- [ ] Production environment variables configured
- [ ] `.env` file secured and not in version control
- [ ] Database URL points to production database
- [ ] API base URL is correct
- [ ] Allowed hosts configured correctly
- [ ] CORS origins set appropriately
- [ ] Log level set to appropriate level (warn/error)
- [ ] Debug mode disabled (`NODE_ENV=production`)

### Dependencies

- [ ] All dependencies installed (`npm ci`)
- [ ] No vulnerable dependencies (`npm audit`)
- [ ] No unused dependencies
- [ ] TypeScript compilation successful
- [ ] Production build created
- [ ] Frontend assets optimized
- [ ] Bundle size acceptable

### Data Preparation

- [ ] Database migrated to latest version
- [ ] Prisma client generated
- [ ] Seed data loaded (if applicable)
- [ ] Initial sources configured
- [ ] Test data cleaned up
- [ ] Backup of production data (if upgrading)

---

## Security Checklist

### Authentication & Authorization

- [ ] Authentication enabled (if required)
- [ ] Strong password policy enforced
- [ ] API tokens rotated
- [ ] Session management configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Brute force protection active

### Data Protection

- [ ] Database credentials secured
- [ ] Environment variables encrypted (if using secrets manager)
- [ ] SSL/TLS certificates installed
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] Secure cookie settings
- [ ] Database encryption at rest (if applicable)
- [ ] Backup encryption enabled

### Network Security

- [ ] Firewall configured
- [ ] Network policies applied (Kubernetes)
- [ ] Security groups configured (Cloud)
- [ ] VPN access for admin (if applicable)
- [ ] DDoS protection enabled (if applicable)
- [ ] WAF configured (if applicable)

### Secrets Management

- [ ] Database passwords changed from defaults
- [ ] JWT secrets rotated
- [ ] API keys regenerated
- [ ] Secrets stored in secure vault
- [ ] No hardcoded credentials in code
- [ ] No secrets in logs
- [ ] Secrets backup procedure documented

### File Security

- [ ] File upload restrictions configured
- [ ] Upload directory permissions set
- [ ] File type validation enabled
- [ ] File size limits enforced
- [ ] Malware scanning (if applicable)

### Security Headers

- [ ] Helmet.js configured
- [ ] Content Security Policy set
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Referrer-Policy configured

---

## Performance Checklist

### Application Performance

- [ ] Response time < 500ms for API calls
- [ ] Aggregation completes in reasonable time
- [ ] Dashboard loads < 3 seconds
- [ ] Database queries optimized
- [ ] Indexes created on frequently queried fields
- [ ] Connection pooling configured
- [ ] Caching strategy implemented

### Resource Usage

- [ ] Memory usage within limits
- [ ] CPU usage acceptable
- [ ] Disk I/O optimized
- [ ] Network bandwidth sufficient
- [ ] Garbage collection tuned
- [ ] No memory leaks detected

### Scalability

- [ ] Horizontal scaling tested (if applicable)
- [ ] Load balancing configured
- [ ] Session storage externalized (if using multiple instances)
- [ ] Database read replicas configured (if applicable)
- [ ] CDN configured for static assets (if applicable)

### Caching

- [ ] Redis/cache configured
- [ ] Cache TTL set appropriately
- [ ] Cache invalidation strategy
- [ ] Cache warming for hot data
- [ ] Cache hit ratio monitored

---

## Database Checklist

### PostgreSQL Setup

- [ ] PostgreSQL 16+ installed
- [ ] Database created
- [ ] User created with limited privileges
- [ ] Password is strong and secure
- [ ] Connection string configured correctly
- [ ] SSL/TLS enabled for connections

### Schema & Migrations

- [ ] Migrations run successfully
- [ ] Prisma client generated
- [ ] Database schema matches Prisma schema
- [ ] No migration drift
- [ ] Migration history clean

### Performance

- [ ] Indexes created
- [ ] Query performance acceptable
- [ ] Vacuum and analyze run
- [ ] Auto-vacuum configured
- [ ] Connection pooling enabled
- [ ] Slow query log enabled

### Backup Strategy

- [ ] Automated backups configured
- [ ] Backup retention policy set
- [ ] Backup encryption enabled
- [ ] Backup restoration tested
- [ ] Point-in-time recovery configured (if applicable)
- [ ] Offsite backup storage configured

### Monitoring

- [ ] Database metrics collected
- [ ] Alerting configured for issues
- [ ] Connection count monitored
- [ ] Disk usage monitored
- [ ] Replication lag monitored (if applicable)

---

## Kubernetes Checklist

### Cluster Setup

- [ ] Kubernetes cluster 1.24+ running
- [ ] kubectl configured
- [ ] Namespace created
- [ ] RBAC configured
- [ ] Network policies defined

### Secrets

- [ ] postgres-secret.yaml applied
- [ ] Secrets base64 encoded correctly
- [ ] No secrets in plain text in manifests
- [ ] External Secrets Operator configured (if applicable)

### Storage

- [ ] PersistentVolumeClaims created
- [ ] Storage class available
- [ ] PostgreSQL PVC applied
- [ ] Backup PVC applied
- [ ] Redis PVC applied (if applicable)

### Deployments

- [ ] postgres-deployment.yaml applied
- [ ] backend-deployment.yaml applied
- [ ] frontend-deployment.yaml applied (if separate)
- [ ] redis-deployment.yaml applied (if applicable)
- [ ] Image pull secrets configured (if private registry)

### Services

- [ ] Services created
- [ ] ClusterIP for internal services
- [ ] LoadBalancer/NodePort for external access
- [ ] Service selectors correct
- [ ] Port mappings correct

### Ingress

- [ ] Ingress resource created
- [ ] TLS certificate configured
- [ ] Hostname configured
- [ ] Path routing correct
- [ ] Ingress controller running

### HPA (Horizontal Pod Autoscaler)

- [ ] hpa.yaml applied
- [ ] Metrics server running
- [ ] Min/max replicas set appropriately
- [ ] CPU/memory thresholds configured
- [ ] Scaling tested

### Health Checks

- [ ] Liveness probes configured
- [ ] Readiness probes configured
- [ ] Startup probes configured (if needed)
- [ ] Probe endpoints working
- [ ] Probe intervals appropriate

### Resource Limits

- [ ] Resource requests set
- [ ] Resource limits set
- [ ] Resource quotas configured (if applicable)
- [ ] Limit ranges configured (if applicable)

### Security Contexts

- [ ] runAsNonRoot: true
- [ ] runAsUser set
- [ ] readOnlyRootFilesystem (where possible)
- [ ] SecurityContext applied
- [ ] Pod Security Standards followed

---

## Monitoring Checklist

### Health Checks

- [ ] /health endpoint working
- [ ] /api/serve/health endpoint working
- [ ] Health checks integrated with load balancer
- [ ] Health check failures trigger alerts
- [ ] Database health monitored

### Logging

- [ ] Application logging configured
- [ ] Structured logging enabled (JSON format)
- [ ] Log rotation configured
- [ ] Centralized logging setup (if applicable)
- [ ] Error tracking integrated (Sentry, etc.)
- [ ] Log retention policy set

### Metrics

- [ ] Prometheus metrics exposed (/metrics)
- [ ] Key metrics identified:
  - [ ] Request rate
  - [ ] Response time
  - [ ] Error rate
  - [ ] Aggregation duration
  - [ ] Database connections
  - [ ] Memory usage
  - [ ] CPU usage
- [ ] Grafana dashboards created
- [ ] Alerting rules configured

### Alerting

- [ ] Alert manager configured
- [ ] Alert channels set up (email, Slack, PagerDuty)
- [ ] Critical alerts defined:
  - [ ] Application down
  - [ ] Database connection lost
  - [ ] High error rate
  - [ ] High latency
  - [ ] Disk space low
  - [ ] Memory usage high
- [ ] Alert thresholds set appropriately
- [ ] Alert escalation configured

### Uptime Monitoring

- [ ] External uptime monitoring setup
- [ ] Health check interval configured
- [ ] Multiple regions monitored
- [ ] Notifications configured
- [ ] Status page configured (optional)

---

## Documentation Checklist

### User Documentation

- [ ] USER_GUIDE.md complete
- [ ] Installation instructions clear
- [ ] Configuration documented
- [ ] API documentation up-to-date
- [ ] Troubleshooting guide complete
- [ ] FAQ section included

### Operational Documentation

- [ ] Deployment guide complete
- [ ] Runbook for common issues
- [ ] Escalation procedures documented
- [ ] Backup/restore procedures documented
- [ ] Disaster recovery plan documented
- [ ] Security incident response documented

### Technical Documentation

- [ ] Architecture documentation complete
- [ ] API reference current
- [ ] Database schema documented
- [ ] Environment variables documented
- [ ] Configuration options documented
- [ ] Integration guides complete

### On-Call Documentation

- [ ] Contact information current
- [ ] Alert response procedures
- [ ] Common issues and fixes
- [ ] Rollback procedures
- [ ] Communication templates

---

## Go-Live Steps

### Pre-Launch (T-24 hours)

- [ ] Final security scan completed
- [ ] Performance tests passed
- [ ] Load tests completed
- [ ] Backup verified
- [ ] Team notified of launch window
- [ ] Rollback plan reviewed

### Launch Day (T-0)

- [ ] Database backup taken
- [ ] Application deployed
- [ ] Health checks pass
- [ ] Smoke tests executed
- [ ] Monitoring dashboards verified
- [ ] Logs flowing correctly
- [ ] Team on standby

### Post-Launch (T+1 hour)

- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify alerts working
- [ ] Confirm users can access
- [ ] Test critical paths
- [ ] Document any issues

### Post-Launch (T+24 hours)

- [ ] Review performance metrics
- [ ] Check resource usage
- [ ] Verify backups completed
- [ ] Review logs for issues
- [ ] Gather user feedback
- [ ] Document lessons learned

### Post-Launch (T+1 week)

- [ ] Performance review meeting
- [ ] Security review
- [ ] Cost analysis
- [ ] Update runbooks
- [ ] Plan improvements
- [ ] Schedule regular reviews

---

## Sign-Off

### Pre-Launch Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Tech Lead | | | |
| Security Lead | | | |
| DevOps Lead | | | |
| QA Lead | | | |

### Post-Launch Verification

| Check | Status | Verified By | Date |
|-------|--------|-------------|------|
| Application functional | ☐ | | |
| Performance acceptable | ☐ | | |
| Security verified | ☐ | | |
| Monitoring active | ☐ | | |
| Backups working | ☐ | | |
| Documentation complete | ☐ | | |
| Team trained | ☐ | | |
| Rollback tested | ☐ | | |

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | | | |
| Tech Lead | | | |
| Product Owner | | | |
| Security Lead | | | |
| Infrastructure Lead | | | |

---

## Notes

*Add any additional notes or special considerations for the launch here*

---

*Checklist Version: 1.0*
*Last Updated: February 2026*
