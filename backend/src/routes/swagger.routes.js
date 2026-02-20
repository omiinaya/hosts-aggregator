/**
 * Swagger/OpenAPI Documentation Routes
 * 
 * This file contains JSDoc comments that document all API endpoints
 * for automatic Swagger/OpenAPI generation.
 * 
 * @module swagger.routes
 */

const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDefinition = require('../config/swagger');

const router = Router();

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hosts Aggregator API Documentation',
};

// Generate OpenAPI spec from JSDoc comments
const options = {
  swaggerDefinition,
  apis: [
    './src/routes/swagger.routes.js',
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/controllers/*.ts',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// Serve swagger.json
router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account with email, password, and name
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or registration failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user and return JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Returns the currently authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /auth/api-key:
 *   post:
 *     summary: Generate API key
 *     description: Generates a new API key for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: API key generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/ApiKeyResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to generate API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ============================================================================
// SOURCES ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /sources:
 *   get:
 *     summary: List all sources
 *     description: Returns a list of all hosts file sources with their details
 *     tags: [Sources]
 *     responses:
 *       200:
 *         description: List of sources retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SourceWithDetails'
 *   post:
 *     summary: Create new source
 *     description: Creates a new hosts file source from a URL
 *     tags: [Sources]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSourceRequest'
 *     responses:
 *       201:
 *         description: Source created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Source'
 *                 aggregation:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     entriesProcessed:
 *                       type: integer
 *                     error:
 *                       type: string
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Source with this name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /sources/{id}:
 *   get:
 *     summary: Get specific source
 *     description: Returns detailed information about a specific source
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     responses:
 *       200:
 *         description: Source details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/SourceWithDetails'
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update source
 *     description: Updates an existing source's properties
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSourceRequest'
 *     responses:
 *       200:
 *         description: Source updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Source'
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Source with this name already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete source
 *     description: Deletes a source and all its associated data
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     responses:
 *       204:
 *         description: Source deleted successfully
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /sources/{id}/toggle:
 *   patch:
 *     summary: Toggle source enabled status
 *     description: Toggles the enabled status of a source
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     responses:
 *       200:
 *         description: Source toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Source'
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /sources/{id}/refresh:
 *   post:
 *     summary: Refresh source
 *     description: Forces a refresh of the source's content from its URL
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     responses:
 *       200:
 *         description: Source refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     entriesProcessed:
 *                       type: integer
 *                     contentChanged:
 *                       type: boolean
 *                     format:
 *                       type: string
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to refresh source
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /sources/{id}/refresh-cache:
 *   post:
 *     summary: Refresh cache for specific source
 *     description: Clears and re-fetches the content cache for a source
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     responses:
 *       200:
 *         description: Cache refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cache refreshed successfully
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /sources/refresh-cache:
 *   post:
 *     summary: Refresh cache for all sources
 *     description: Clears and re-fetches content cache for all enabled sources
 *     tags: [Sources]
 *     responses:
 *       200:
 *         description: Cache refreshed for all sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cache refreshed for 5 sources
 */

/**
 * @openapi
 * /sources/{id}/detect-format:
 *   get:
 *     summary: Detect format of source content
 *     description: Analyzes the source's cached content to detect its format with confidence score
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Source ID
 *     responses:
 *       200:
 *         description: Format detected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     sourceId:
 *                       type: string
 *                     sourceName:
 *                       type: string
 *                     detectedFormat:
 *                       type: string
 *                       enum: ['standard', 'adblock', 'auto']
 *                     confidence:
 *                       type: number
 *                     manualFormat:
 *                       type: string
 *                     metadata:
 *                       type: object
 *                     recommendation:
 *                       type: string
 *       400:
 *         description: Source has no cached content
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Source not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ============================================================================
// HOSTS ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /hosts:
 *   get:
 *     summary: List all hosts
 *     description: Returns paginated list of host entries with filtering options
 *     tags: [Hosts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 500
 *         description: Items per page
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *       - in: query
 *         name: entryType
 *         schema:
 *           type: string
 *           enum: ['block', 'allow', 'element']
 *         description: Filter by entry type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in domain names
 *       - in: query
 *         name: sourceId
 *         schema:
 *           type: string
 *         description: Filter by source ID
 *     responses:
 *       200:
 *         description: Hosts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     hosts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HostWithSources'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @openapi
 * /hosts/stats:
 *   get:
 *     summary: Get host statistics
 *     description: Returns statistics about hosts including counts by type and source
 *     tags: [Hosts]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/HostStats'
 */

/**
 * @openapi
 * /hosts/{id}:
 *   get:
 *     summary: Get specific host
 *     description: Returns detailed information about a specific host entry
 *     tags: [Hosts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Host ID
 *     responses:
 *       200:
 *         description: Host details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/HostWithSources'
 *       404:
 *         description: Host not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /hosts/{id}:
 *   patch:
 *     summary: Update host
 *     description: Updates a host's enabled status
 *     tags: [Hosts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Host ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable the host
 *             required:
 *               - enabled
 *     responses:
 *       200:
 *         description: Host updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     enabled:
 *                       type: boolean
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Host not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /hosts/{hostId}/toggle:
 *   patch:
 *     summary: Toggle host enabled status
 *     description: Toggles the enabled status of a specific host
 *     tags: [Hosts]
 *     parameters:
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *         description: Host ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *                 description: Set enabled status
 *             required:
 *               - enabled
 *     responses:
 *       200:
 *         description: Host toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     hostId:
 *                       type: string
 *                     enabled:
 *                       type: boolean
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Host not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /hosts/bulk:
 *   patch:
 *     summary: Bulk update hosts
 *     description: Updates the enabled status of multiple hosts at once
 *     tags: [Hosts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hostIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of host IDs to update
 *               enabled:
 *                 type: boolean
 *                 description: Enable or disable all specified hosts
 *             required:
 *               - hostIds
 *               - enabled
 *     responses:
 *       200:
 *         description: Hosts updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated:
 *                       type: integer
 *                       description: Number of hosts updated
 *                     failed:
 *                       type: integer
 *                       description: Number of hosts that failed to update
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /hosts/bulk-toggle:
 *   post:
 *     summary: Toggle multiple hosts
 *     description: Toggles the enabled status of multiple hosts
 *     tags: [Hosts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hostIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of host IDs to toggle
 *             required:
 *               - hostIds
 *     responses:
 *       200:
 *         description: Hosts toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     toggled:
 *                       type: integer
 *                       description: Number of hosts toggled
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ============================================================================
// AGGREGATE ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /aggregate:
 *   post:
 *     summary: Trigger aggregation
 *     description: Manually triggers aggregation of all enabled sources
 *     tags: [Aggregate]
 *     responses:
 *       200:
 *         description: Aggregation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSources:
 *                       type: integer
 *                     totalEntries:
 *                       type: integer
 *                     uniqueEntries:
 *                       type: integer
 *                     processingTimeMs:
 *                       type: integer
 *       500:
 *         description: Aggregation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Get latest aggregation result
 *     description: Returns the most recent aggregation result
 *     tags: [Aggregate]
 *     responses:
 *       200:
 *         description: Latest aggregation result retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/AggregationResult'
 *       404:
 *         description: No aggregation results found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /aggregate/stats:
 *   get:
 *     summary: Get aggregation statistics
 *     description: Returns statistics about aggregations
 *     tags: [Aggregate]
 *     responses:
 *       200:
 *         description: Aggregation statistics retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/AggregationStats'
 */

/**
 * @openapi
 * /aggregate/history:
 *   get:
 *     summary: Get aggregation history
 *     description: Returns the history of aggregation runs
 *     tags: [Aggregate]
 *     responses:
 *       200:
 *         description: Aggregation history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AggregationResult'
 */

/**
 * @openapi
 * /aggregate/status:
 *   get:
 *     summary: Get aggregation status
 *     description: Returns the current aggregation status and progress
 *     tags: [Aggregate]
 *     responses:
 *       200:
 *         description: Aggregation status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/AggregationStatus'
 */

// ============================================================================
// SERVE ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /serve/hosts:
 *   get:
 *     summary: Serve unified hosts file
 *     description: Returns the unified hosts file in standard or ABP format. Supports authentication if configured.
 *     tags: [Serve]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: ['standard', 'adblock']
 *           default: 'adblock'
 *         description: Output format
 *     responses:
 *       200:
 *         description: Hosts file content
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Hosts file content in requested format
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/HostsFileInfo'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /serve/hosts/raw:
 *   get:
 *     summary: Serve raw hosts file
 *     description: Returns the unified hosts file without headers (for Pi-hole/AdGuard Home)
 *     tags: [Serve]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: ['standard', 'adblock']
 *           default: 'adblock'
 *         description: Output format
 *     responses:
 *       200:
 *         description: Raw hosts file content
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Raw hosts file content without headers
 */

/**
 * @openapi
 * /serve/hosts/info:
 *   get:
 *     summary: Get hosts file information
 *     description: Returns metadata about the generated hosts file
 *     tags: [Serve]
 *     responses:
 *       200:
 *         description: Hosts file information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/HostsFileInfo'
 */

/**
 * @openapi
 * /serve/abp:
 *   get:
 *     summary: Serve unified hosts in ABP format
 *     description: Returns the unified hosts file in AdBlock Plus format with proper headers
 *     tags: [Serve]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ABP format hosts file
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Hosts file in ABP format (||domain^)
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /serve/abp/raw:
 *   get:
 *     summary: Serve raw ABP format
 *     description: Returns hosts file in ABP format without authentication and minimal headers
 *     tags: [Serve]
 *     responses:
 *       200:
 *         description: Raw ABP format hosts file
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Raw ABP format hosts file
 */

/**
 * @openapi
 * /serve/health:
 *   get:
 *     summary: Health check for serving endpoint
 *     description: Checks if the serving endpoint is healthy and has data available
 *     tags: [Serve]
 *     responses:
 *       200:
 *         description: Serving endpoint is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     healthy:
 *                       type: boolean
 *                     hasHostsFile:
 *                       type: boolean
 *                     lastGenerated:
 *                       type: string
 *                       format: date-time
 *                     totalEntries:
 *                       type: integer
 *                     message:
 *                       type: string
 */

// ============================================================================
// CONFIG ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /config/export:
 *   get:
 *     summary: Export configuration
 *     description: Returns the current system configuration as JSON
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfigExport'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @openapi
 * /config/export/download:
 *   get:
 *     summary: Download configuration file
 *     description: Downloads the configuration as a JSON file
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration file downloaded
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /config/export/partial:
 *   post:
 *     summary: Export selected sources
 *     description: Exports only the selected sources from the configuration
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of source IDs to export
 *             required:
 *               - sourceIds
 *     responses:
 *       200:
 *         description: Partial configuration exported
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfigExport'
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /config/import:
 *   post:
 *     summary: Import configuration
 *     description: Imports configuration from JSON body
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigImportRequest'
 *     responses:
 *       200:
 *         description: Configuration imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sourcesImported:
 *                       type: integer
 *                     sourcesSkipped:
 *                       type: integer
 *       400:
 *         description: Invalid configuration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /config/import/upload:
 *   post:
 *     summary: Upload configuration file
 *     description: Imports configuration from an uploaded JSON file
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               configFile:
 *                 type: string
 *                 format: binary
 *                 description: JSON configuration file to upload
 *     responses:
 *       200:
 *         description: Configuration file imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid file or configuration
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 */

/**
 * @openapi
 * /config/validate:
 *   post:
 *     summary: Validate configuration
 *     description: Validates configuration without importing it
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               config:
 *                 type: object
 *                 description: Configuration to validate
 *     responses:
 *       200:
 *         description: Configuration is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Configuration is invalid
 */

/**
 * @openapi
 * /config/preview:
 *   post:
 *     summary: Preview import
 *     description: Preview configuration import without applying changes (dry run)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigImportRequest'
 *     responses:
 *       200:
 *         description: Preview generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sourcesToImport:
 *                       type: integer
 *                     sourcesToUpdate:
 *                       type: integer
 *                     sourcesToSkip:
 *                       type: integer
 *                     conflicts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /config/status:
 *   get:
 *     summary: Get import/export status
 *     description: Returns the status of recent import/export operations
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     lastImport:
 *                       type: string
 *                       format: date-time
 *                     lastExport:
 *                       type: string
 *                       format: date-time
 *                     totalSources:
 *                       type: integer
 *       401:
 *         description: Authentication required
 */

/**
 * @openapi
 * /config/reset:
 *   post:
 *     summary: Reset configuration
 *     description: Resets all configuration to defaults (admin only)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin privileges required
 */

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: Returns Prometheus-compatible metrics for monitoring
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Prometheus metrics in plain text format
 */

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Basic health check endpoint to verify the API is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

module.exports = router;
