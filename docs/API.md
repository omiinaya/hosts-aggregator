# Hosts Aggregator - API Documentation

## Base URL

All API endpoints are prefixed with `/api`:

```
http://localhost:3001/api
```

## Authentication

Currently, the API does not require authentication for development purposes. In production, consider implementing authentication middleware.

## Error Responses

All error responses follow the same format:

```json
{
  "error": "Error message describing the issue"
}
```

## Sources Management

### List All Sources

**Endpoint:** `GET /api/sources`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "source-id",
      "name": "Source Name",
      "url": "https://example.com/hosts",
      "filePath": null,
      "type": "URL",
      "enabled": true,
      "lastFetched": "2026-01-22T21:49:39.119Z",
      "lastChecked": null,
      "lastFetchStatus": "SUCCESS",
      "entryCount": 68675,
      "metadata": null,
      "createdAt": "2026-01-21T17:43:23.743Z",
      "updatedAt": "2026-01-22T21:49:39.120Z"
    }
  ]
}
```

### Get Specific Source

**Endpoint:** `GET /api/sources/:id`

**Parameters:**
- `id` (path parameter) - Source ID

**Response:** Same as list response but with single object

### Create New Source

**Endpoint:** `POST /api/sources`

**Request Body:**
```json
{
  "name": "Source Name",
  "url": "https://example.com/hosts",
  "type": "URL"
}
```

**Required Fields:**
- `name` - Display name for the source
- `type` - Source type ("URL" or "FILE")

**Optional Fields:**
- `url` - URL for URL-based sources
- `filePath` - File path for file-based sources
- `enabled` - Whether source is active (default: true)
- `metadata` - Additional source metadata

**Response:** Same as get source response

### Update Source

**Endpoint:** `PUT /api/sources/:id`

**Parameters:**
- `id` (path parameter) - Source ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "enabled": false
}
```

**Response:** Updated source object

**Cache Behavior:** When updating the URL field, the existing cache for the source is automatically cleared to ensure fresh content is fetched.

### Delete Source

**Endpoint:** `DELETE /api/sources/:id`

**Parameters:**
- `id` (path parameter) - Source ID

**Response:** Empty response with 200 status code

### Toggle Source Status

**Endpoint:** `PATCH /api/sources/:id/toggle`

**Parameters:**
- `id` (path parameter) - Source ID

**Response:** Updated source object with toggled enabled status

### Refresh Source

**Endpoint:** `POST /api/sources/:id/refresh`

**Parameters:**
- `id` (path parameter) - Source ID

**Response:** Updated source object with refreshed data

### Refresh Source Cache

**Endpoint:** `POST /api/sources/:id/refresh-cache`

**Parameters:**
- `id` (path parameter) - Source ID

**Response:**
```json
{
  "status": "success",
  "message": "Cache refreshed successfully"
}
```

**Description:** Clears the cached content for a specific source and triggers re-fetching from the source URL.

### Refresh All Source Cache

**Endpoint:** `POST /api/sources/refresh-cache`

**Response:**
```json
{
  "status": "success",
  "message": "Cache refreshed for X sources"
}
```

**Description:** Clears cached content for all enabled sources and triggers re-fetching from their respective URLs.

## Aggregation Endpoints

### Trigger Aggregation

**Endpoint:** `POST /api/aggregated`

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalSources": 1,
    "totalEntries": 68675,
    "uniqueEntries": 68566,
    "duplicatesRemoved": 109,
    "processingTime": 283,
    "blockedDomains": ["domain1.com", "domain2.com"],
    "allowedDomains": []
  }
}
```

### Get Latest Aggregation

**Endpoint:** `GET /api/aggregated`

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "aggregation-id",
    "timestamp": "2026-01-21T17:43:43.713Z",
    "totalSources": 1,
    "totalEntries": 68675,
    "uniqueEntries": 68566,
    "duplicatesRemoved": 109,
    "filePath": "/path/to/unified-hosts.txt",
    "sourcesUsed": ["source-id"],
    "createdAt": "2026-01-21T17:43:43.713Z",
    "updatedAt": "2026-01-21T17:43:43.713Z"
  }
}
```

### Download Unified Hosts File

**Endpoint:** `GET /api/aggregated/download/:id`

**Parameters:**
- `id` (path parameter) - Aggregation ID

**Response:** Hosts file content as text/plain

**Headers:**
- `Content-Type: text/plain`
- `Content-Disposition: attachment; filename="unified-hosts-{timestamp}.txt"`

### Get Aggregation Statistics

**Endpoint:** `GET /api/aggregated/stats`

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalAggregations": 5,
    "totalSources": 3,
    "totalEntriesProcessed": 205425,
    "totalDuplicatesRemoved": 327,
    "lastAggregation": "2026-01-22T21:49:39.251Z",
    "averageProcessingTime": 250
  }
}
```

### Get Aggregation History

**Endpoint:** `GET /api/aggregated/history`

**Query Parameters:**
- `limit` - Number of results to return (default: 10)
- `offset` - Number of results to skip (default: 0)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "aggregation-id",
      "timestamp": "2026-01-22T21:49:39.251Z",
      "totalSources": 1,
      "totalEntries": 68675,
      "uniqueEntries": 68566,
      "duplicatesRemoved": 109,
      "filePath": "/path/to/unified-hosts.txt"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

### Clean Up Old Files

**Endpoint:** `POST /api/aggregated/cleanup`

**Query Parameters:**
- `keepLast` - Number of recent files to keep (default: 5)
- `olderThanDays` - Delete files older than X days (default: 30)

**Response:**
```json
{
  "status": "success",
  "data": {
    "filesDeleted": 3,
    "spaceFreed": "15.2 MB",
    "filesKept": 5
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window:** 15 minutes
- **Max Requests:** 100 requests per window
- **Headers:** Rate limit information included in responses

## Validation Rules

### Source Validation
- `name`: Required, min 1 character, max 255 characters
- `url`: Required for URL sources, valid URL format
- `filePath`: Required for FILE sources, valid file path
- `type`: Required, must be "URL" or "FILE"
- `enabled`: Boolean, defaults to true

### Aggregation Validation
- All enabled sources must be accessible
- File size limits enforced (10MB default)
- Processing timeout limits (5 minutes default)

## File Upload Restrictions

- **Max File Size:** 10MB
- **Allowed Types:** Text files only
- **Encoding:** UTF-8 required

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000` (development)
- Configured via `ALLOWED_HOSTS` environment variable

## Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T21:50:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

## Example Usage

### Creating a New Source

```bash
curl -X POST http://localhost:3001/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "StevenBlack Hosts",
    "url": "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
    "type": "URL"
  }'
```

### Triggering Aggregation

```bash
curl -X POST http://localhost:3001/api/aggregated
```

### Downloading Unified Hosts File

```bash
curl -o unified-hosts.txt http://localhost:3001/api/aggregated/download/latest
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side issue |

## Testing the API

Use tools like curl, Postman, or the built-in frontend application to test the API endpoints.