# Nginx Proxy Manager Setup Guide

This guide explains how to configure Nginx Proxy Manager (NPM) to work with the Hosts Aggregator backend using custom locations.

## What is Nginx Proxy Manager?

Nginx Proxy Manager is a web-based interface for managing Nginx reverse proxy configurations. It provides:
- Easy-to-use web UI for managing proxies
- Automatic SSL certificate management via Let's Encrypt
- Custom locations and advanced routing
- Access control and authentication

## Prerequisites

1. Docker and Docker Compose installed
2. Hosts Aggregator running (either via Docker or directly)
3. Nginx Proxy Manager installed

## Installation

### Step 1: Install Nginx Proxy Manager

Create a `docker-compose.yml` file for NPM:

```yaml
version: '3'
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    ports:
      - "80:80"
      - "81:81"  # Admin UI
      - "443:443"
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    environment:
      - DB_SQLITE_FILE=/data/database.sqlite
    restart: unless-stopped
```

Start NPM:
```bash
docker-compose up -d
```

Access the admin UI at `http://your-server-ip:81`
- Default login: `admin@example.com` / `changeme`

### Step 2: Configure DNS

Point your domain to your server's IP address:
- `hosts.yourdomain.com` → Your server IP
- `hosts-api.yourdomain.com` → Your server IP (optional, for API)

## Configuration Scenarios

### Scenario 1: Single Domain with Custom Locations (Recommended)

This setup serves both frontend and backend from the same domain with different paths.

#### Backend Configuration

1. In NPM, click **Proxy Hosts** → **Add Proxy Host**

2. **Details Tab:**
   - Domain Names: `hosts.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname/IP: `hosts-aggregator-backend` (or your backend container name/IP)
   - Forward Port: `3010`

3. **Custom Locations Tab:**
   
   Click **Add Location** and add these locations:

   **Location 1: API Routes**
   ```
   Location: /api
   Scheme: http
   Forward Hostname: hosts-aggregator-backend
   Forward Port: 3010
   ```

   **Location 2: Serve Endpoint**
   ```
   Location: /serve
   Scheme: http
   Forward Hostname: hosts-aggregator-backend
   Forward Port: 3010
   ```

   **Location 3: Health Checks**
   ```
   Location: /health
   Scheme: http
   Forward Hostname: hosts-aggregator-backend
   Forward Port: 3010
   ```

4. **Advanced Tab:**
   Add this custom Nginx configuration:
   ```nginx
   # CORS headers for API
   location /api {
       proxy_pass http://hosts-aggregator-backend:3010;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
       
       # CORS headers
       add_header 'Access-Control-Allow-Origin' '*' always;
       add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
       add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
       
       # Handle preflight requests
       if ($request_method = 'OPTIONS') {
           add_header 'Access-Control-Allow-Origin' '*';
           add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
           add_header 'Access-Control-Max-Age' 1728000;
           add_header 'Content-Type' 'text/plain; charset=utf-8';
           add_header 'Content-Length' 0;
           return 204;
       }
   }
   ```

#### Frontend Configuration

If using separate domains:

1. Create another Proxy Host:
   - Domain Names: `hosts.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname/IP: `hosts-aggregator-frontend` (or your frontend container)
   - Forward Port: `80` or `3011`

### Scenario 2: Subdomain Setup (API + Frontend)

This setup uses separate subdomains for frontend and backend.

#### API Subdomain

1. **Proxy Host:**
   - Domain Names: `api.hosts.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname: `hosts-aggregator-backend`
   - Forward Port: `3010`

2. **SSL Tab:**
   - Request a new SSL certificate
   - Enable **Force SSL**
   - Enable **HTTP/2 Support**

#### Frontend Subdomain

1. **Proxy Host:**
   - Domain Names: `hosts.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname: `hosts-aggregator-frontend`
   - Forward Port: `80`

2. **SSL Tab:**
   - Request SSL certificate

### Scenario 3: Path-Based Routing

Route different paths to different services:

```
hosts.yourdomain.com/        → Frontend
hosts.yourdomain.com/api/    → Backend API
hosts.yourdomain.com/serve/  → Backend serve endpoint
hosts.yourdomain.com/docs/   → Swagger documentation
```

**Custom Locations:**

1. `/api` → Backend:3010
2. `/serve` → Backend:3010
3. `/health` → Backend:3010
4. `/api-docs` → Backend:3010
5. `/` → Frontend:80

## Advanced Configuration

### Rate Limiting

Add to **Advanced** tab:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req zone=api_limit burst=20 nodelay;

location /api {
    limit_req zone=api_limit;
    proxy_pass http://hosts-aggregator-backend:3010;
    # ... rest of config
}
```

### WebSocket Support (for future real-time features)

```nginx
location /api/ws {
    proxy_pass http://hosts-aggregator-backend:3010;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### IP Whitelisting

Restrict access to serve endpoint:

```nginx
location /serve {
    # Allow specific IPs
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    proxy_pass http://hosts-aggregator-backend:3010;
    # ... rest of config
}
```

### Custom Headers

Add security headers in **Advanced** tab:

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

## Docker Compose Integration

Complete setup with NPM + Hosts Aggregator:

```yaml
version: '3.8'

services:
  # Nginx Proxy Manager
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    volumes:
      - npm-data:/data
      - npm-letsencrypt:/etc/letsencrypt
    environment:
      - DB_SQLITE_FILE=/data/database.sqlite
    restart: unless-stopped
    networks:
      - hosts-network

  # Backend
  backend:
    build: ./backend
    container_name: hosts-aggregator-backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/hosts_aggregator
      - REDIS_URL=redis://redis:6379
      - PORT=3010
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - hosts-network

  # Frontend
  frontend:
    build: ./frontend
    container_name: hosts-aggregator-frontend
    environment:
      - VITE_API_BASE_URL=/api  # Uses relative path through NPM
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - hosts-network

  # Database
  postgres:
    image: postgres:15-alpine
    container_name: hosts-aggregator-postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hosts_aggregator
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - hosts-network

  # Cache
  redis:
    image: redis:7-alpine
    container_name: hosts-aggregator-redis
    restart: unless-stopped
    networks:
      - hosts-network

volumes:
  npm-data:
  npm-letsencrypt:
  postgres-data:

networks:
  hosts-network:
    driver: bridge
```

## Frontend Configuration for NPM

Update the frontend to use relative URLs when behind NPM:

### Option 1: Environment Variable

`.env.production`:
```
VITE_API_BASE_URL=/api
```

### Option 2: Runtime Configuration

Update `frontend/src/hooks/useApiStatus.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (window.location.hostname.includes('localhost') 
    ? 'http://localhost:3010' 
    : '/api');  // Use relative path for production
```

## Testing the Setup

1. **Test API endpoint:**
   ```bash
   curl https://hosts.yourdomain.com/api/health
   ```

2. **Test serve endpoint:**
   ```bash
   curl https://hosts.yourdomain.com/serve/hosts
   ```

3. **Test Swagger docs:**
   Visit: `https://hosts.yourdomain.com/api-docs`

4. **Test frontend:**
   Visit: `https://hosts.yourdomain.com`

## Troubleshooting

### 502 Bad Gateway

**Problem:** Backend not reachable
**Solution:**
- Check backend container is running: `docker ps`
- Verify container name/IP in NPM configuration
- Check backend logs: `docker logs hosts-aggregator-backend`

### CORS Errors

**Problem:** Browser blocks requests due to CORS
**Solution:**
- Add CORS headers in NPM advanced configuration
- Ensure backend CORS is configured for the NPM domain
- Check `backend/src/app.ts` CORS settings

### SSL Certificate Issues

**Problem:** Certificate not valid
**Solution:**
- Ensure port 80 is open for Let's Encrypt validation
- Check DNS records point to correct IP
- Try regenerating certificate in NPM

### Frontend Can't Reach Backend

**Problem:** API calls fail from browser
**Solution:**
- Verify `VITE_API_BASE_URL` is set to relative path (`/api`)
- Check browser console for errors
- Verify NPM custom locations are configured correctly

## Security Best Practices

1. **Always use HTTPS** in production
2. **Enable HSTS** after confirming HTTPS works
3. **Set up rate limiting** to prevent abuse
4. **Use IP whitelisting** for sensitive endpoints
5. **Keep NPM updated** regularly
6. **Monitor access logs** for suspicious activity

## Example: Pi-hole Integration

Point Pi-hole to your proxied serve endpoint:

```
Adlist URL: https://hosts.yourdomain.com/serve/hosts
```

Or for automatic updates:
```bash
# Add to Pi-hole crontab
curl -o /etc/pihole/custom.list https://hosts.yourdomain.com/serve/hosts
pihole restartdns
```

## Migration from Direct Access

If currently accessing directly:

1. **Before migration:**
   - Note current backend URL (e.g., `http://server:3010`)
   - Note current frontend URL (e.g., `http://server:3011`)

2. **Update frontend environment:**
   - Change `VITE_API_BASE_URL` from `http://server:3010` to `/api`
   - Rebuild and redeploy

3. **Update any clients:**
   - Change bookmarks from `http://server:3010` to `https://hosts.yourdomain.com`
   - Update Pi-hole adlist URLs
   - Update any automation scripts

4. **Test thoroughly** before disabling direct access

## Additional Resources

- [Nginx Proxy Manager Documentation](https://nginxproxymanager.com/)
- [Nginx Location Directive](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
