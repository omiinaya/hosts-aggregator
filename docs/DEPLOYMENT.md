# Hosts Aggregator - Deployment Guide

## Deployment Options

The Hosts Aggregator application can be deployed using several methods:

1. **Docker Compose** (Recommended for production)
2. **Manual Deployment** (For custom setups)
3. **Cloud Platform Deployment** (AWS, Heroku, etc.)

## Prerequisites

- Node.js 18+ on deployment server
- SQLite database (or PostgreSQL for production)
- 1GB+ RAM recommended
- 10GB+ disk space for hosts files

## Docker Deployment (Recommended)

### Docker Compose Setup

The project includes Docker configuration for easy deployment.

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hosts-aggregator
   ```

2. **Set up environment variables:**
   ```bash
   cp docker/.env.example docker/.env
   # Edit docker/.env with your configuration
   ```

3. **Build and start containers:**
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

4. **Check container status:**
   ```bash
   docker-compose -f docker/docker-compose.yml ps
   ```

5. **View logs:**
   ```bash
   docker-compose -f docker/docker-compose.yml logs -f
   ```

### Docker Configuration

The Docker setup includes:
- **Backend container** - Node.js application
- **Frontend container** - Nginx serving built React app
- **Volume mounts** - Persistent data storage

### Environment Variables for Docker

Create `docker/.env`:

```env
# Backend Configuration
BACKEND_PORT=3001
NODE_ENV=production
DATABASE_URL=file:/app/data/dev.db
CACHE_DIR=/app/data/cache
GENERATED_DIR=/app/data/generated
MAX_FILE_SIZE=10485760
ALLOWED_HOSTS=your-domain.com
LOG_LEVEL=info

# Frontend Configuration
VITE_API_BASE_URL=http://your-domain.com/api
VITE_APP_NAME="Hosts Aggregator"
VITE_APP_VERSION=1.0.0

# Database Configuration
DB_VOLUME=/app/data
```

## Manual Deployment

### Backend Deployment

1. **Build the backend:**
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

3. **Run database migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

### Frontend Deployment

1. **Build the frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Serve with a web server:**
   - Copy `dist` folder to your web server
   - Configure reverse proxy to backend API

### Production Web Server Configuration

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /var/www/hosts-aggregator/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Cloud Platform Deployment

### Heroku Deployment

1. **Create Heroku app:**
   ```bash
   heroku create your-hosts-aggregator
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DATABASE_URL=postgresql://...
   ```

3. **Deploy:**
   ```bash
   git push heroku main
   ```

### AWS Deployment

**Using Elastic Beanstalk:**

1. **Create EB application:**
   ```bash
   eb init hosts-aggregator
   ```

2. **Create environment:**
   ```bash
   eb create production
   ```

3. **Deploy:**
   ```bash
   eb deploy
   ```

## Production Configuration

### Environment Variables

**Backend Production Variables:**

```env
PORT=3001
NODE_ENV=production
DATABASE_URL="file:./prod.db"
CACHE_DIR="./data/cache"
GENERATED_DIR="./data/generated"
MAX_FILE_SIZE=10485760
ALLOWED_HOSTS="your-domain.com"
LOG_LEVEL="warn"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend Production Variables:**

```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_APP_NAME="Hosts Aggregator"
VITE_APP_VERSION=1.0.0
VITE_LOG_LEVEL="warn"
```

### Security Considerations

1. **Use HTTPS:** Always deploy with SSL/TLS
2. **Database Security:** Use strong database credentials
3. **File Permissions:** Restrict file access permissions
4. **Firewall Rules:** Configure appropriate firewall rules
5. **Regular Updates:** Keep dependencies updated

### Performance Optimization

1. **Database Optimization:**
   - Use PostgreSQL for production
   - Add appropriate indexes
   - Configure connection pooling

2. **Caching:**
   - Implement Redis for caching
   - Use CDN for static assets
   - Configure browser caching

3. **Load Balancing:**
   - Use multiple backend instances
   - Implement health checks
   - Configure session persistence

## Monitoring and Logging

### Application Monitoring

**Health Check Endpoint:**
```bash
curl https://your-domain.com/health
```

**Logging Configuration:**
- Winston logger configured for production
- Log rotation for large log files
- Error tracking integration

### Performance Monitoring

**Key Metrics to Monitor:**
- API response times
- Database query performance
- Memory usage
- Disk space usage
- Error rates

## Backup Strategy

### Data Backup

1. **Database Backup:**
   ```bash
   # SQLite backup
   cp ./data/dev.db ./backups/dev-$(date +%Y%m%d).db
   ```

2. **Generated Files Backup:**
   ```bash
   tar -czf ./backups/generated-$(date +%Y%m%d).tar.gz ./data/generated/
   ```

3. **Automated Backup Script:**
   Create a cron job for regular backups

### Disaster Recovery

1. **Recovery Procedure:**
   - Restore database from backup
   - Restore generated files
   - Verify application functionality

2. **Testing Recovery:**
   - Regularly test backup restoration
   - Document recovery procedures

## Scaling Considerations

### Horizontal Scaling

1. **Database Scaling:**
   - Migrate to PostgreSQL
   - Implement read replicas
   - Use connection pooling

2. **Application Scaling:**
   - Use multiple backend instances
   - Implement session storage
   - Use load balancer

3. **File Storage Scaling:**
   - Use cloud storage (S3)
   - Implement CDN for file distribution
   - Use distributed file system

### Vertical Scaling

1. **Resource Allocation:**
   - Increase CPU/RAM as needed
   - Use faster storage (SSD)
   - Optimize database performance

## Maintenance

### Regular Maintenance Tasks

1. **Database Maintenance:**
   - Vacuum SQLite database
   - Clean up old aggregations
   - Optimize queries

2. **File System Maintenance:**
   - Clean up old cache files
   - Remove old generated files
   - Monitor disk space

3. **Application Maintenance:**
   - Update dependencies
   - Apply security patches
   - Monitor performance

### Update Procedures

1. **Backend Updates:**
   ```bash
   git pull origin main
   npm install
   npm run build
   npx prisma migrate deploy
   npm start
   ```

2. **Frontend Updates:**
   ```bash
   git pull origin main
   npm install
   npm run build
   # Restart web server
   ```

## Troubleshooting Production Issues

### Common Production Issues

**Application Won't Start:**
- Check environment variables
- Verify database connection
- Check port availability

**API Errors:**
- Check application logs
- Verify database migrations
- Check file permissions

**Performance Issues:**
- Monitor resource usage
- Check database performance
- Review application logs

### Debugging Production

1. **Enable Debug Logging:**
   ```env
   LOG_LEVEL=debug
   ```

2. **Check Application Logs:**
   ```bash
   tail -f /var/log/hosts-aggregator.log
   ```

3. **Database Diagnostics:**
   ```bash
   npx prisma studio
   ```

## SSL/TLS Configuration

### Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Rest of configuration...
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

This deployment guide covers the essential aspects of deploying the Hosts Aggregator application in various environments. Always test deployments in a staging environment before moving to production.