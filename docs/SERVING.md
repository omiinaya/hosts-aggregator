# Hosts Aggregator Serving Setup

This document explains how to serve the aggregated hosts file for uBlock Origin, AdGuard, Pi-hole, AdGuard Home, and other DNS filtering systems.

## Overview

The hosts aggregator provides HTTP endpoints to serve the unified hosts file dynamically from the database. All hosts file content is generated on-demand from the database without creating any text files. When you add, update, or remove sources, the aggregated data is automatically updated and available immediately.

## Output Formats

The hosts aggregator supports two output formats:

### ABP Format (Default)
- **Format**: AdBlock Plus style with `||domain^` patterns
- **Use case**: uBlock Origin, AdGuard, and other modern adblockers
- **Example output**:
  ```
  ||example.com^
  ||ads.example.com^
  @@||trusted-site.com^
  ```
- **Default**: Yes - served by default when no format parameter is specified

### Standard Format
- **Format**: Traditional hosts file format with `0.0.0.0 domain` patterns
- **Use case**: Pi-hole, AdGuard Home, and other DNS-based blockers
- **Example output**:
  ```
  0.0.0.0 example.com
  0.0.0.0 ads.example.com
  ```
- **Default**: No - must be requested with `?format=standard` query parameter

## Available Endpoints

### Main Hosts File (ABP Format - Default)
- **URL**: `http://your-server:3010/api/serve/hosts`
- **Content-Type**: `text/plain`
- **Description**: Serves the complete unified hosts file in ABP format with headers
- **Query Parameters**:
  - `format` (optional): `abp` (default) or `standard`

### Raw Hosts File (ABP Format - Default)
- **URL**: `http://your-server:3010/api/serve/hosts/raw`
- **Content-Type**: `text/plain`
- **Description**: Serves only the domain blocking entries in ABP format (no comments/headers)
- **Query Parameters**:
  - `format` (optional): `abp` (default) or `standard`

### ABP Format Endpoints
- **URL**: `http://your-server:3010/api/serve/abp`
- **Content-Type**: `text/plain`
- **Description**: Serves hosts file in ABP format with headers (explicit endpoint)

- **URL**: `http://your-server:3010/api/serve/abp/raw`
- **Content-Type**: `text/plain`
- **Description**: Serves hosts file in ABP format without headers (explicit endpoint)

### Hosts File Information
- **URL**: `http://your-server:3010/api/serve/hosts/info`
- **Content-Type**: `application/json`
- **Description**: Returns metadata about the current hosts file

### Health Check
- **URL**: `http://your-server:3010/api/serve/health`
- **Content-Type**: `application/json`
- **Description**: Health check endpoint for monitoring

## uBlock Origin Configuration

### Method 1: Custom Filter URL

1. Open uBlock Origin settings
2. Navigate to **Settings** → **Filter lists**
3. Scroll to **Custom** section
4. Add a new filter:
   ```
   http://your-server:3010/api/serve/abp
   ```
5. Click **Apply changes**

### Method 2: Raw Filter URL

For a cleaner filter without headers:
```
http://your-server:3010/api/serve/abp/raw
```

## AdGuard Configuration

### Method 1: Filter URL

1. Open AdGuard admin interface
2. Navigate to **Filters** → **DNS blocklists**
3. Add a new custom filter:
   - **Name**: Hosts Aggregator
   - **URL**: `http://your-server:3010/api/serve/abp`
   - **Type**: AdBlock-style

### Method 2: Hosts File

1. Add to AdGuard configuration:
   ```yaml
   # /opt/AdGuardHome/AdGuardHome.yaml
   dns:
     hostsfile: /path/to/hosts-aggregator/hosts.txt
   ```

2. Create a script to update the file:
   ```bash
   #!/bin/bash
   curl -s http://localhost:3010/api/serve/abp/raw > /path/to/hosts-aggregator/hosts.txt
   systemctl restart AdGuardHome
   ```

## Pi-hole Configuration

### Method 1: Custom Blocklist URL

1. Open your Pi-hole admin interface
2. Navigate to **Settings** → **Blocklists**
3. Add a new custom blocklist:
   ```
   http://your-server:3010/api/serve/hosts/raw?format=standard
   ```
4. Click **Save**
5. Update Gravity: **Tools** → **Update Gravity**

### Method 2: Local File (Recommended for Production)

1. Create a script to download the hosts file periodically:
   ```bash
   #!/bin/bash
   curl -s http://localhost:3010/api/serve/hosts/raw?format=standard > /etc/pihole/custom.list
   pihole restartdns
   ```

2. Add to crontab for automatic updates:
   ```bash
   # Update every hour
   0 * * * * /path/to/update-script.sh
   ```

## Configuration Options

### Environment Variables

Add these to your `.env` file in the backend directory:

```bash
# Serving configuration
SERVE_ENABLED=true
SERVE_PORT=3010
SERVE_HOST=0.0.0.0

# Auto-aggregation
AUTO_AGGREGATE_ENABLED=true
AUTO_AGGREGATE_ON_SOURCE_CHANGE=true
AUTO_AGGREGATE_DELAY_MS=5000

# Cache control
CACHE_CONTROL_ENABLED=true
CACHE_MAX_AGE_SECONDS=3600

# Security
REQUIRE_AUTH_FOR_SERVE=false
# SERVE_AUTH_TOKEN=your-secret-token-here

# Output format (default is ABP)
# SERVE_RAW_BY_DEFAULT=false
# INCLUDE_HEADERS=true
```

### Format Selection

The default output format is ABP (AdBlock Plus). To use standard format:

- **ABP Format (Default)**: No query parameter needed
  ```
  http://your-server:3010/api/serve/hosts
  ```

- **Standard Format**: Add `?format=standard` query parameter
  ```
  http://your-server:3010/api/serve/hosts?format=standard
  ```

Both formats are available on all serve endpoints.

### Security Considerations

For production use, consider enabling authentication:

```bash
REQUIRE_AUTH_FOR_SERVE=true
SERVE_AUTH_TOKEN=your-secure-token-here
```

Then configure your DNS filter to use the token:
```
http://your-server:3010/api/serve/hosts/raw?token=your-secure-token-here
```

Or use HTTP Basic Auth:
```
Authorization: Bearer your-secure-token-here
```

## Real-time Updates

The system automatically triggers aggregation when:
- A new source is added
- An existing source is updated
- A source is deleted
- A source is enabled/disabled

Updates typically complete within 5-10 seconds depending on the number of sources.

## Monitoring

### Health Check
Monitor the service using the health endpoint:
```bash
curl http://localhost:3010/api/serve/health
```

### Logs
Check the backend logs for aggregation status:
```bash
tail -f /path/to/backend/logs/app.log
```

### File Information
Get current file stats:
```bash
curl http://localhost:3010/api/serve/hosts/info
```

## Performance Considerations

- The hosts file is cached with appropriate headers
- Aggregation runs in the background to avoid blocking requests
- Large files (>1MB) may take a few seconds to generate
- Consider using a CDN or reverse proxy for high-traffic setups

## Troubleshooting

### Common Issues

1. **"No hosts file available"**
   - Run aggregation manually: `POST /api/aggregate`
   - Check that sources are enabled

2. **Connection refused**
   - Verify the backend server is running
   - Check firewall settings
   - Confirm the correct port (default: 3010)

3. **Authentication failures**
   - Check `SERVE_AUTH_TOKEN` environment variable
   - Verify token is correctly passed in requests

4. **DNS filter rejects file**
   - Try the `/raw` endpoint for AdBlock-compatible format
   - Check file encoding (should be UTF-8)
   - Verify file size is reasonable

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Production Deployment

For production use, consider:

1. **Reverse Proxy**: Use nginx or Apache as a reverse proxy
2. **SSL/TLS**: Enable HTTPS for secure connections
3. **Load Balancing**: Distribute traffic across multiple instances
4. **Monitoring**: Set up alerts for failed aggregations
5. **Backups**: Regularly backup the database and generated files

## Example Integration Scripts

### uBlock Origin Update Script
```bash
#!/bin/bash
SERVER_URL="http://localhost:3010"
TOKEN="your-token-if-enabled"

# Download ABP format filter
if [ -n "$TOKEN" ]; then
    curl -H "Authorization: Bearer $TOKEN" -s "$SERVER_URL/api/serve/abp/raw" > /path/to/ublock-filter.txt
else
    curl -s "$SERVER_URL/api/serve/abp/raw" > /path/to/ublock-filter.txt
fi
```

### AdGuard Update Script
```bash
#!/bin/bash
SERVER_URL="http://localhost:3010"
TOKEN="your-token-if-enabled"
HOSTS_FILE="/opt/AdGuardHome/hosts-aggregator.txt"

# Download ABP format filter
if [ -n "$TOKEN" ]; then
    curl -H "Authorization: Bearer $TOKEN" -s "$SERVER_URL/api/serve/abp/raw" > "$HOSTS_FILE"
else
    curl -s "$SERVER_URL/api/serve/abp/raw" > "$HOSTS_FILE"
fi

# Restart AdGuard Home
systemctl restart AdGuardHome
```

### Pi-hole Update Script
```bash
#!/bin/bash
SERVER_URL="http://localhost:3010"
TOKEN="your-token-if-enabled"

# Download hosts file in standard format
if [ -n "$TOKEN" ]; then
    curl -H "Authorization: Bearer $TOKEN" -s "$SERVER_URL/api/serve/hosts/raw?format=standard" > /etc/pihole/custom.list
else
    curl -s "$SERVER_URL/api/serve/hosts/raw?format=standard" > /etc/pihole/custom.list
fi

# Update Pi-hole gravity
pihole restartdns
```

## Support

For issues or questions:
1. Check the logs in `backend/logs/`
2. Review the API documentation in `docs/API.md`
3. Check the troubleshooting section above