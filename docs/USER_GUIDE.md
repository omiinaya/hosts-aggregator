# Hosts Aggregator - User Guide

A comprehensive guide for using the Hosts Aggregator application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Sources](#managing-sources)
3. [Working with Hosts](#working-with-hosts)
4. [Aggregation Process](#aggregation-process)
5. [Serve Endpoint](#serve-endpoint)
6. [Dashboard Features](#dashboard-features)
7. [Configuration Backup/Restore](#configuration-backuprestore)
8. [API Documentation](#api-documentation)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Quick Start

1. **Access the Application**
   - Open your web browser
   - Navigate to `http://localhost:3011` (or your deployed URL)
   - The dashboard will load automatically

2. **Initial Setup**
   - The application comes with a default SQLite database
   - No initial configuration required
   - Start adding sources immediately

3. **First Aggregation**
   - Click "Aggregate Now" on the dashboard
   - Wait for the process to complete
   - Your unified hosts file is ready to serve

### System Requirements

- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Network**: Internet connection for fetching URL sources
- **Display**: Minimum 1280x720 resolution recommended

---

## Managing Sources

### Adding Sources

#### URL Sources

1. Click "Add Source" button on the Sources page
2. Select "URL" as the source type
3. Enter the source details:
   - **Name**: A descriptive name (e.g., "StevenBlack Hosts")
   - **URL**: The hosts file URL (e.g., `https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts`)
   - **Format**: Select format type (auto/standard/adblock)
4. Click "Save"

The system will automatically:
- Fetch the hosts file
- Parse entries
- Store in database
- Update source statistics

#### File Sources

1. Click "Add Source" button
2. Select "File" as the source type
3. Upload your hosts file (max 10MB)
4. Enter a descriptive name
5. Select the format type
6. Click "Save"

### Editing Sources

1. Navigate to the Sources page
2. Find the source you want to edit
3. Click the "Edit" icon
4. Modify the desired fields:
   - **Name**: Update the display name
   - **URL**: Change the source URL (clears cache automatically)
   - **Enabled**: Toggle source on/off
   - **Format**: Change format detection mode
5. Click "Save Changes"

**Note**: Changing the URL will automatically clear the cached content and trigger a fresh fetch.

### Removing Sources

1. Navigate to the Sources page
2. Find the source to remove
3. Click the "Delete" icon
4. Confirm deletion in the dialog
5. The source and all its entries will be removed

**Warning**: This action cannot be undone. The source's hosts will no longer be included in aggregations.

### Source Health Monitoring

Each source displays health status:

- **Healthy**: Successfully fetched and parsed
- **Warning**: Fetch succeeded but with issues
- **Error**: Failed to fetch or parse
- **Unknown**: Never fetched or pending

View detailed status:
- Last fetch time
- Entry count
- Error messages (if any)
- Response time

### Refreshing Sources

**Manual Refresh** (single source):
1. Click the "Refresh" icon on a source
2. System fetches fresh content
3. Cache is cleared and rebuilt

**Bulk Refresh**:
1. Click "Refresh All" button
2. All enabled sources are refreshed
3. Aggregation runs automatically

---

## Working with Hosts

### Viewing Hosts

#### All Hosts View

1. Navigate to "Hosts" section
2. View all aggregated hosts from enabled sources
3. See metadata for each host:
   - Domain
   - Source origin
   - Status (blocked/allowed)
   - Last updated

#### Filtering Hosts

Use the filter panel to narrow results:

**By Source**:
- Select specific sources
- View hosts from multiple sources
- "Select All" / "Clear All" options

**By Status**:
- **Blocked**: Domains that will be blocked
- **Allowed**: Whitelisted domains (@@ rules)
- **All**: Both blocked and allowed

**By Domain**:
- Search by domain name
- Partial matching supported
- Case-insensitive search

**By Pattern**:
- Filter by domain patterns
- Support for wildcards
- Regex patterns (advanced)

### Toggling Hosts

Individual hosts can be toggled on/off:

1. Find the host in the list
2. Toggle the switch to enable/disable
3. Changes take effect on next aggregation

**Note**: Disabling a host removes it from the unified hosts file without deleting it from the database.

### Host Details

Click on any host to view:
- Full domain information
- Source origin
- Format type
- Raw entry from source
- History of changes

### Exporting Hosts

Export filtered results:

1. Apply desired filters
2. Click "Export" button
3. Choose format:
   - **Standard**: `0.0.0.0 domain` format
   - **ABP**: `||domain^` format
   - **JSON**: Structured data export
4. File downloads automatically

---

## Aggregation Process

### What is Aggregation?

Aggregation combines hosts from all enabled sources into a unified, deduplicated hosts file.

### Running Aggregation

**Manual Aggregation**:
1. Go to Dashboard
2. Click "Aggregate Now" button
3. View real-time progress:
   - Sources being processed
   - Entries parsed
   - Duplicates removed
   - Processing time

**Automatic Aggregation**:
- Triggered when sources change
- Configurable delay (default: 5 seconds)
- Runs in background

### Aggregation Settings

Configure aggregation behavior:

```bash
# In backend .env file
AUTO_AGGREGATE_ENABLED=true
AUTO_AGGREGATE_ON_SOURCE_CHANGE=true
AUTO_AGGREGATE_DELAY_MS=5000
```

### Understanding Results

**Statistics Displayed**:
- **Total Sources**: Number of sources processed
- **Total Entries**: Raw entries before deduplication
- **Unique Entries**: Final count after removing duplicates
- **Duplicates Removed**: Number of duplicate entries
- **Processing Time**: Duration in milliseconds
- **Blocked Domains**: Count of blocking rules
- **Allowed Domains**: Count of whitelist rules (@@)

### Aggregation History

View past aggregations:
1. Navigate to "History" section
2. See list of previous runs
3. Click any entry for details:
   - Timestamp
   - Sources used
   - Entry statistics
   - Duration

### Scheduled Aggregation

Set up automatic aggregation:

**Using Cron**:
```bash
# Run aggregation every hour
0 * * * * curl -X POST http://localhost:3010/api/aggregated
```

**Using Application Scheduler**:
Configure in settings (if available)

---

## Serve Endpoint

### Overview

The serve endpoint provides your unified hosts file to DNS filters like Pi-hole, AdGuard, and uBlock Origin.

### Available Endpoints

#### Main Serve Endpoints

| Endpoint | Format | Headers | Use Case |
|----------|--------|---------|----------|
| `/api/serve/hosts` | ABP (default) | Yes | General purpose |
| `/api/serve/hosts?format=standard` | Standard | Yes | Pi-hole, AdGuard Home |
| `/api/serve/hosts/raw` | ABP | No | Direct integration |
| `/api/serve/hosts/raw?format=standard` | Standard | No | Direct DNS filters |

### Pi-hole Integration

#### Setup Steps

1. **Get Your URL**:
   ```
   http://your-server:3010/api/serve/hosts/raw?format=standard
   ```

2. **Add to Pi-hole**:
   - Open Pi-hole admin interface
   - Go to **Settings** → **Blocklists**
   - Add the URL above
   - Click **Save**
   - Run **Update Gravity**

3. **Verify**:
   - Check blocklist count increased
   - Test blocked domains
   - Review query logs

#### Automatic Updates

Create a script for automatic updates:

```bash
#!/bin/bash
# /etc/pihole/update-custom.sh

SERVER="http://your-server:3010"
PIHOLE_DIR="/etc/pihole"

# Download latest hosts
curl -s "${SERVER}/api/serve/hosts/raw?format=standard" > "${PIHOLE_DIR}/custom.list"

# Restart DNS
pihole restartdns

# Log update
echo "$(date): Hosts updated" >> /var/log/pihole-custom.log
```

Add to crontab:
```bash
# Update every 6 hours
0 */6 * * * /etc/pihole/update-custom.sh
```

### AdGuard Integration

#### AdGuard Home Setup

1. **Add Filter List**:
   - Go to **Filters** → **DNS blocklists**
   - Click **Add blocklist**
   - Enter URL: `http://your-server:3010/api/serve/hosts/raw?format=standard`
   - Name: "Hosts Aggregator"
   - Click **Save**

2. **Update Filter**:
   - Click **Check updates**
   - Wait for download
   - Verify entry count

#### AdGuard Browser Extension

1. Open extension settings
2. Go to **Custom filters**
3. Add filter URL: `http://your-server:3010/api/serve/abp/raw`
4. Click **Subscribe**

### uBlock Origin Integration

#### Setup Steps

1. Open uBlock Origin settings
2. Go to **Filter lists** tab
3. Scroll to **Custom** section
4. Check **Import** checkbox
5. Enter URL: `http://your-server:3010/api/serve/abp/raw`
6. Click **Apply changes**
7. Click **Update now**

#### Verify Filter

1. Go to **Dashboard** → **3rd-party filters**
2. Look for "Custom" section
3. Check entry count
4. Click **Purge all caches** → **Update now** if needed

### Output Formats

#### ABP Format (Default)

```
! Title: Unified Hosts File
! Generated: 2026-02-20T12:00:00Z
! Total Domains: 150,000
! Sources: 5

||example.com^
||ads.example.com^
@@||trusted-site.com^
```

**Compatible with**:
- uBlock Origin
- AdGuard (all versions)
- AdBlock Plus
- Brave Browser

#### Standard Format

```
# Unified Hosts File
# Generated: 2026-02-20T12:00:00Z
# Total Domains: 150,000
# Sources: 5

0.0.0.0 example.com
0.0.0.0 ads.example.com
```

**Compatible with**:
- Pi-hole
- AdGuard Home
- DNSMasq
- BIND
- Windows hosts file

### Security Configuration

#### Enable Authentication

```bash
# backend .env
REQUIRE_AUTH_FOR_SERVE=true
SERVE_AUTH_TOKEN=your-secure-token-here
```

#### Using Token

```bash
# Add token to URL
curl "http://your-server:3010/api/serve/hosts/raw?format=standard&token=your-token"

# Or use header
curl -H "Authorization: Bearer your-token" \
  "http://your-server:3010/api/serve/hosts/raw?format=standard"
```

---

## Dashboard Features

### Overview Panel

The dashboard provides at-a-glance information:

**Statistics Cards**:
- Total Sources
- Total Hosts
- Last Aggregation
- System Health

**Quick Actions**:
- Aggregate Now
- Refresh Sources
- View Logs
- Export Hosts

### Sources Widget

Displays source status:
- Total count
- Enabled vs disabled
- Health status summary
- Recent activity

### Aggregation Widget

Shows aggregation status:
- Last run time
- Duration
- Entries processed
- Success/failure status

### System Health

Real-time system status:
- Database connection
- Disk space
- Memory usage
- API response time

### Recent Activity

Log of recent actions:
- Source added/updated/deleted
- Aggregation runs
- Errors and warnings
- User actions

### Charts and Graphs

Visual representations:
- Sources over time
- Hosts count trend
- Aggregation duration
- Health status history

---

## Configuration Backup/Restore

### Backup Types

#### Full Configuration Backup

**Via Dashboard**:
1. Go to **Settings** → **Backup**
2. Click "Create Backup"
3. Download `.backup` file

**Via API**:
```bash
curl -o backup-$(date +%Y%m%d).json \
  http://localhost:3010/api/config/backup
```

#### Database Backup

**SQLite**:
```bash
# Stop application first
cp backend/dev.db backups/dev-$(date +%Y%m%d).db
```

**PostgreSQL**:
```bash
./scripts/backup-postgres.sh
```

### Backup Contents

Full backup includes:
- All source configurations
- Host entries
- Aggregation history
- User settings
- Custom filters

### Restore Configuration

**Via Dashboard**:
1. Go to **Settings** → **Restore**
2. Click "Upload Backup"
3. Select `.backup` file
4. Review changes
5. Click "Confirm Restore"

**Via API**:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d @backup-file.json \
  http://localhost:3010/api/config/restore
```

### Automated Backups

**Docker**:
```bash
# Add to docker-compose.yml
services:
  backup:
    image: alpine
    volumes:
      - ./backups:/backups
      - ./data:/data
    command: >
      sh -c "while true; do
        cp /data/dev.db /backups/dev-$(date +%Y%m%d).db
        find /backups -name '*.db' -mtime +7 -delete
        sleep 86400
      done"
```

**Kubernetes**:
```bash
# CronJob already configured
kubectl apply -f k8s/postgres-backup.yaml
```

### Backup Verification

Test your backups regularly:

```bash
# Test SQLite backup
sqlite3 backup-file.db "SELECT COUNT(*) FROM Source;"

# Test PostgreSQL backup
pg_restore --list backup-file.dump
```

---

## API Documentation

### Authentication

**Bearer Token**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3010/api/sources
```

### Core Endpoints

#### Sources API

**List Sources**:
```bash
GET /api/sources
```

**Create Source**:
```bash
POST /api/sources
Content-Type: application/json

{
  "name": "My Source",
  "url": "https://example.com/hosts",
  "type": "URL"
}
```

**Update Source**:
```bash
PUT /api/sources/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "enabled": false
}
```

**Delete Source**:
```bash
DELETE /api/sources/:id
```

**Toggle Source**:
```bash
PATCH /api/sources/:id/toggle
```

**Refresh Source**:
```bash
POST /api/sources/:id/refresh
```

#### Aggregation API

**Trigger Aggregation**:
```bash
POST /api/aggregated
```

**Get Latest Aggregation**:
```bash
GET /api/aggregated
```

**Get Statistics**:
```bash
GET /api/aggregated/stats
```

**Get History**:
```bash
GET /api/aggregated/history?limit=10&offset=0
```

#### Serve API

**Get Hosts File**:
```bash
GET /api/serve/hosts
GET /api/serve/hosts?format=standard
GET /api/serve/hosts/raw
GET /api/serve/hosts/raw?format=standard
```

**Get File Info**:
```bash
GET /api/serve/hosts/info
```

**Health Check**:
```bash
GET /api/serve/health
```

#### Configuration API

**Get Config**:
```bash
GET /api/config
```

**Update Config**:
```bash
PUT /api/config
Content-Type: application/json

{
  "autoAggregate": true,
  "autoAggregateDelay": 5000
}
```

**Create Backup**:
```bash
POST /api/config/backup
```

**Restore Config**:
```bash
POST /api/config/restore
Content-Type: application/json

{
  "data": { ... }
}
```

### Rate Limiting

Default limits:
- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Headers**: Rate limit info included in responses

### Error Responses

Standard error format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

Common status codes:
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Troubleshooting

### Common Issues

#### Dashboard Won't Load

**Symptoms**: Blank page or connection error

**Solutions**:
1. Check if backend is running:
   ```bash
   curl http://localhost:3010/health
   ```

2. Verify frontend URL:
   ```bash
   curl http://localhost:3011
   ```

3. Check browser console for errors

4. Clear browser cache and reload

#### Sources Not Updating

**Symptoms**: Sources show old data or errors

**Solutions**:
1. Check source URL accessibility:
   ```bash
   curl -I <source-url>
   ```

2. Verify source format setting

3. Check backend logs:
   ```bash
   tail -f backend/logs/app.log
   ```

4. Try manual refresh

5. Check network connectivity

#### Aggregation Failing

**Symptoms**: Aggregation shows errors or doesn't complete

**Solutions**:
1. Check disk space:
   ```bash
   df -h
   ```

2. Verify database connection:
   ```bash
   cd backend && npx prisma migrate status
   ```

3. Check for large sources (may timeout)

4. Review error logs

5. Try aggregating with fewer sources

#### DNS Filter Can't Download

**Symptoms**: Pi-hole/AdGuard shows 404 or connection errors

**Solutions**:
1. Verify serve endpoint is accessible:
   ```bash
   curl http://your-server:3010/api/serve/hosts/raw
   ```

2. Check firewall settings

3. Verify correct URL format

4. Try with/without authentication

5. Check CORS settings

#### High Memory Usage

**Symptoms**: System slow, out of memory errors

**Solutions**:
1. Limit number of sources

2. Increase system RAM

3. Configure swap space

4. Use PostgreSQL instead of SQLite

5. Enable caching

#### Database Errors

**Symptoms**: SQLite errors, migration failures

**Solutions**:
1. Check database file permissions:
   ```bash
   ls -la backend/dev.db
   ```

2. Verify disk space

3. Repair SQLite database:
   ```bash
   sqlite3 backend/dev.db ".dump" | sqlite3 backend/dev-new.db
   mv backend/dev-new.db backend/dev.db
   ```

4. Reset database (last resort):
   ```bash
   cd backend && npx prisma migrate reset
   ```

### Getting Help

1. **Check Documentation**:
   - API.md - API reference
   - ARCHITECTURE.md - System design
   - SERVING.md - DNS integration

2. **Review Logs**:
   - Backend logs: `backend/logs/app.log`
   - Browser console
   - System logs

3. **Health Check**:
   ```bash
   curl http://localhost:3010/health
   ```

4. **Run Diagnostics**:
   ```bash
   ./scripts/benchmark.sh
   ```

5. **Create Issue**:
   - Include error messages
   - Provide logs
   - Describe steps to reproduce
   - Include environment details

---

## Support

For additional support:
- Check the project's issue tracker
- Review the troubleshooting guide
- Consult API documentation
- Contact system administrator

---

*Last updated: February 2026*
