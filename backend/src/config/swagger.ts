/**
 * Swagger/OpenAPI Configuration
 * Defines OpenAPI 3.0 spec with server configuration, authentication schemes,
 * and component schemas for the Hosts Aggregator API.
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Hosts Aggregator API',
    version: '1.0.0',
    description:
      'API for aggregating and managing adblocker hosts files from multiple sources. Provides endpoints for managing sources, hosts, aggregations, and serving unified hosts files for Pi-hole and AdGuard Home.',
    contact: {
      name: 'Hosts Aggregator Team',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Local development server',
    },
    {
      url: '/api',
      description: 'Relative API path',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'Sources',
      description: 'Manage hosts file sources (URLs and local files)',
    },
    {
      name: 'Hosts',
      description: 'Manage aggregated host entries',
    },
    {
      name: 'Aggregate',
      description: 'Aggregation operations and statistics',
    },
    {
      name: 'Serve',
      description: 'Serve unified hosts files for Pi-hole and AdGuard Home',
    },
    {
      name: 'Metrics',
      description: 'Prometheus metrics endpoint',
    },
    {
      name: 'Config',
      description: 'Configuration import/export and management',
    },
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service authentication',
      },
    },
    schemas: {
      // Source schemas
      Source: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier for the source',
          },
          name: {
            type: 'string',
            description: 'Human-readable name for the source',
          },
          url: {
            type: 'string',
            nullable: true,
            description: 'URL to fetch hosts from (for URL type sources)',
          },
          filePath: {
            type: 'string',
            nullable: true,
            description: 'Local file path (for FILE type sources)',
          },
          type: {
            type: 'string',
            enum: ['URL', 'FILE'],
            description: 'Source type',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether the source is enabled for aggregation',
          },
          format: {
            type: 'string',
            enum: ['standard', 'adblock', 'auto'],
            nullable: true,
            description: 'Format of the source content',
          },
          metadata: {
            type: 'object',
            nullable: true,
            description: 'Additional metadata for the source',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
        required: ['id', 'name', 'type', 'enabled', 'createdAt', 'updatedAt'],
      },
      SourceWithDetails: {
        allOf: [
          { $ref: '#/components/schemas/Source' },
          {
            type: 'object',
            properties: {
              hostCount: {
                type: 'integer',
                description: 'Number of hosts from this source',
              },
              lastFetched: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: 'Last successful fetch timestamp',
              },
              lastFetchStatus: {
                type: 'string',
                enum: ['SUCCESS', 'ERROR', 'TIMEOUT', 'NOT_MODIFIED'],
                nullable: true,
                description: 'Status of last fetch operation',
              },
              entryCount: {
                type: 'integer',
                description: 'Number of entries in last fetch',
              },
            },
          },
        ],
      },
      CreateSourceRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Name for the source',
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to fetch hosts from',
          },
          enabled: {
            type: 'boolean',
            default: true,
            description: 'Whether to enable the source immediately',
          },
          format: {
            type: 'string',
            enum: ['standard', 'adblock', 'auto'],
            default: 'auto',
            description: 'Expected format of the source',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata',
          },
        },
        required: ['name', 'url'],
      },
      UpdateSourceRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'New name for the source',
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'New URL for the source',
          },
          enabled: {
            type: 'boolean',
            description: 'Enable or disable the source',
          },
          format: {
            type: 'string',
            enum: ['standard', 'adblock', 'auto'],
            description: 'Format of the source',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata',
          },
        },
      },
      // Host entry schemas
      HostEntry: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique identifier for the host entry',
          },
          domain: {
            type: 'string',
            description: 'Domain name',
          },
          entryType: {
            type: 'string',
            enum: ['block', 'allow', 'element'],
            description: 'Type of entry',
          },
          enabled: {
            type: 'boolean',
            description: 'Whether this host is enabled',
          },
          occurrenceCount: {
            type: 'integer',
            description: 'Number of times this domain appears across sources',
          },
          firstSeen: {
            type: 'string',
            format: 'date-time',
            description: 'First time this host was seen',
          },
          lastSeen: {
            type: 'string',
            format: 'date-time',
            description: 'Last time this host was updated',
          },
        },
        required: [
          'id',
          'domain',
          'entryType',
          'enabled',
          'occurrenceCount',
          'firstSeen',
          'lastSeen',
        ],
      },
      HostWithSources: {
        allOf: [
          { $ref: '#/components/schemas/HostEntry' },
          {
            type: 'object',
            properties: {
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    enabled: { type: 'boolean' },
                  },
                },
              },
            },
          },
        ],
      },
      HostStats: {
        type: 'object',
        properties: {
          total: { type: 'integer', description: 'Total number of hosts' },
          enabled: { type: 'integer', description: 'Number of enabled hosts' },
          disabled: { type: 'integer', description: 'Number of disabled hosts' },
          byEntryType: {
            type: 'object',
            properties: {
              block: { type: 'integer' },
              allow: { type: 'integer' },
              element: { type: 'integer' },
            },
          },
          bySource: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sourceId: { type: 'string' },
                sourceName: { type: 'string' },
                hostCount: { type: 'integer' },
              },
            },
          },
        },
      },
      // Auth schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          name: {
            type: 'string',
          },
          role: {
            type: 'string',
            enum: ['admin', 'operator', 'viewer'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'email', 'name', 'role', 'createdAt'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'User password (min 8 characters)',
          },
          name: {
            type: 'string',
            description: 'User display name',
          },
        },
        required: ['email', 'password', 'name'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            description: 'User password',
          },
        },
        required: ['email', 'password'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT token for authentication',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
        required: ['token', 'user'],
      },
      ApiKeyResponse: {
        type: 'object',
        properties: {
          apiKey: {
            type: 'string',
            description: 'Generated API key',
          },
        },
        required: ['apiKey'],
      },
      // Aggregation schemas
      AggregationResult: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'When the aggregation was run',
          },
          totalSources: {
            type: 'integer',
            description: 'Total number of sources processed',
          },
          successfulSources: {
            type: 'integer',
            description: 'Number of sources successfully fetched',
          },
          failedSources: {
            type: 'integer',
            description: 'Number of sources that failed',
          },
          totalEntries: {
            type: 'integer',
            description: 'Total entries across all sources',
          },
          uniqueEntries: {
            type: 'integer',
            description: 'Unique entries after deduplication',
          },
          duplicatesRemoved: {
            type: 'integer',
            description: 'Number of duplicate entries removed',
          },
          allowEntries: {
            type: 'integer',
            description: 'Number of allow-list entries',
          },
          blockEntries: {
            type: 'integer',
            description: 'Number of block-list entries',
          },
          processingTimeMs: {
            type: 'integer',
            description: 'Time taken to process in milliseconds',
          },
          triggeredBy: {
            type: 'string',
            enum: ['manual', 'scheduled', 'auto', 'webhook'],
          },
        },
        required: [
          'id',
          'timestamp',
          'totalSources',
          'totalEntries',
          'uniqueEntries',
          'processingTimeMs',
        ],
      },
      AggregationStats: {
        type: 'object',
        properties: {
          totalSources: { type: 'integer' },
          totalEntries: { type: 'integer' },
          uniqueEntries: { type: 'integer' },
          duplicatesRemoved: { type: 'integer' },
          processingTime: { type: 'integer' },
        },
      },
      AggregationStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['idle', 'running', 'completed', 'error'],
          },
          progress: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Progress percentage',
          },
          totalSources: { type: 'integer' },
          processedSources: { type: 'integer' },
        },
      },
      // Serve schemas
      HostsFileInfo: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
          size: { type: 'integer', description: 'Estimated file size in bytes' },
          entries: { type: 'integer', description: 'Number of host entries' },
          totalSources: { type: 'integer', description: 'Number of enabled sources' },
          generatedAt: {
            type: 'string',
            format: 'date-time',
          },
          downloadUrl: { type: 'string', format: 'uri' },
          rawDownloadUrl: { type: 'string', format: 'uri' },
        },
        required: [
          'filename',
          'size',
          'entries',
          'totalSources',
          'generatedAt',
          'downloadUrl',
          'rawDownloadUrl',
        ],
      },
      // Config schemas
      ConfigExport: {
        type: 'object',
        properties: {
          version: { type: 'string' },
          exportedAt: { type: 'string', format: 'date-time' },
          sources: {
            type: 'array',
            items: { $ref: '#/components/schemas/Source' },
          },
          settings: {
            type: 'object',
          },
        },
      },
      ConfigImportRequest: {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            description: 'Configuration object to import',
          },
          options: {
            type: 'object',
            properties: {
              overwriteExisting: { type: 'boolean', default: false },
              skipInvalid: { type: 'boolean', default: true },
            },
          },
        },
        required: ['config'],
      },
      // Common schemas
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Current page number',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 500,
            description: 'Items per page',
          },
          total: {
            type: 'integer',
            description: 'Total number of items',
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages',
          },
        },
        required: ['page', 'limit', 'total', 'totalPages'],
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          details: {
            type: 'string',
            description: 'Additional error details',
          },
        },
        required: ['error'],
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['success'],
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
        },
        required: ['status', 'data'],
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['OK', 'ERROR'],
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['status', 'timestamp'],
      },
    },
  },
};

export default swaggerDefinition;
