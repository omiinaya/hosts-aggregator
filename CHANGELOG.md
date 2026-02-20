# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-20

### 🎉 Initial Production Release

### Security
- Added ReDoS protection in filter.service.ts with pattern complexity analysis
- Implemented regex timeout protection (default: 1s, max: 5s)
- Added pattern validation to prevent catastrophic backtracking
- JWT authentication with role-based access control (admin, operator, viewer)
- API key authentication for programmatic access
- Security headers (CSP, HSTS, referrer policy, CORS)
- All containers run as non-root users
- Kubernetes security contexts with minimal privileges
- Network policies for pod-to-pod communication

### Added

#### Core Features
- **Source Management**: Add, edit, remove, and toggle hosts file sources
- **Host Aggregation**: Automatic aggregation from multiple sources with deduplication
- **Filter Rules**: Advanced filtering with regex, wildcard, and exact pattern matching
- **Multiple Output Formats**: Standard hosts file, ABP format, JSON, BIND, Unbound, DNSmasq
- **Source Categories**: Organize sources by category (ads, malware, tracking, etc.)
- **Source Health Monitoring**: Automatic health checks with uptime tracking

#### API & Documentation
- **RESTful API**: Full CRUD operations for sources and hosts
- **Swagger/OpenAPI Documentation**: Interactive API docs at `/api-docs`
- **Configuration Import/Export**: Backup and restore all configuration
- **Metrics Endpoint**: Prometheus metrics for monitoring
- **Health Checks**: Live, ready, and deep health check endpoints

#### Dashboard (Phase 7.1)
- **Interactive Charts**: Line charts, bar charts, pie charts for visualization
- **Real-time Statistics**: Total sources, hosts, blocked domains, sources health
- **Domain Search**: Debounced search across all aggregated hosts
- **Sources Health Overview**: Monitor health and performance of all sources
- **Aggregation History**: View historical aggregation results
- **Tabbed Interface**: Organized sections (Overview, Charts, Sources, Search)
- **Quick Actions**: Navigate to common tasks quickly

#### DevOps & Infrastructure
- **Docker Support**: Multi-stage builds for backend and frontend
- **Docker Compose**: Production and development configurations
- **Kubernetes**: Complete manifests with security hardening
  - Backend deployment with HPA
  - Frontend deployment
  - PostgreSQL with backup jobs
  - Redis caching
  - Ingress with TLS/cert-manager
  - Network policies
- **CI/CD Pipeline**: GitHub Actions with automated testing
- **Dependabot**: Automated dependency updates
- **CodeQL**: Security analysis workflow

#### Monitoring & Observability
- **Prometheus Metrics**: HTTP request duration, aggregation duration, source fetch counters
- **Structured Logging**: JSON format with correlation IDs
- **Log Rotation**: Daily rotation with compression
- **Health Monitoring**: Automatic source health tracking with auto-disable

#### Database & Performance
- **PostgreSQL**: Production-ready database with proper indexes
- **Redis Caching**: Caching layer for aggregation results and metadata
- **Query Optimization**: Indexed queries for fast lookups
- **Connection Pooling**: Efficient database connection management

#### Documentation
- **User Guide**: Comprehensive guide for using the application
- **Launch Checklist**: Production deployment checklist
- **Deployment Verification**: Step-by-step verification guide
- **API Documentation**: Full API reference
- **Architecture Guide**: System architecture overview
- **Troubleshooting**: Common issues and solutions

### Technical Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Testing**: Jest (backend), Vitest (frontend)
- **Linting**: ESLint, Prettier
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **Monitoring**: Prometheus, Grafana (ready)

### Testing
- **Unit Tests**: Parser service, aggregation service
- **Integration Tests**: API endpoints
- **Frontend Tests**: Component tests with React Testing Library
- **Coverage Target**: 60% (infrastructure in place)

### Security Audit
- **Semgrep Scan**: 17 findings (all acceptable)
  - ReDoS protection implemented
  - Docker security hardening applied
  - Non-root containers configured
  - Network policies implemented

### Known Issues
- Frontend bundle size warning (>500KB) - can be optimized with code splitting
- Test coverage below 60% threshold - new services need test coverage
- Benchmark script requires running PostgreSQL instance

## Migration Notes

### From Development to Production
1. Update `VITE_API_BASE_URL` to use HTTPS
2. Configure PostgreSQL with proper credentials
3. Set up Redis for caching
4. Configure JWT secrets
5. Enable Swagger in production (optional)
6. Set up SSL certificates for HTTPS

### Database Migration
- SQLite to PostgreSQL migration script included
- Run `scripts/migrate-sqlite-to-postgres.sh`

## Contributors
- Initial development and architecture
- Security hardening and ReDoS protection
- Kubernetes deployment configurations
- Dashboard improvements and charts

## License
MIT License - see LICENSE file for details

---

## Future Roadmap

### Version 1.1.0 (Planned)
- [ ] Rate limiting per API key
- [ ] Advanced filtering UI in dashboard
- [ ] Bulk operations for hosts
- [ ] Email notifications for source failures
- [ ] Webhook support for aggregation events

### Version 1.2.0 (Planned)
- [ ] GraphQL API
- [ ] Real-time updates via WebSockets
- [ ] Mobile app
- [ ] Custom rule builder
- [ ] Analytics dashboard

### Version 2.0.0 (Future)
- [ ] Multi-tenant support
- [ ] Federation support
- [ ] Machine learning for threat detection
- [ ] Community rule sharing
