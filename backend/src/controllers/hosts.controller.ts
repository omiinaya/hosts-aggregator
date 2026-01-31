import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

export class HostsController {
  /**
   * Get all hosts with pagination and filtering
   * GET /api/hosts
   * 
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 50, max: 500)
   * - enabled: boolean (optional filter)
   * - entryType: 'block' | 'allow' | 'element' (optional filter)
   * - search: string (search in domain)
   * - sourceId: string (filter by source)
   */
  async getAllHosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));
      const enabled = req.query.enabled !== undefined ? req.query.enabled === 'true' : undefined;
      const entryType = req.query.entryType as 'block' | 'allow' | 'element' | undefined;
      const search = req.query.search as string | undefined;
      const sourceId = req.query.sourceId as string | undefined;

      // Build where clause
      const where: any = {};
      if (enabled !== undefined) {
        where.enabled = enabled;
      }
      if (entryType) {
        where.entryType = entryType;
      }
      if (search) {
        where.OR = [
          { domain: { contains: search } },
          { normalized: { contains: search.toLowerCase() } }
        ];
      }
      if (sourceId) {
        where.sourceMappings = {
          some: {
            sourceId
          }
        };
      }

      // Get total count
      const total = await prisma.hostEntry.count({ where });

      // Get hosts with pagination
      const hosts = await prisma.hostEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastSeen: 'desc' },
        include: {
          sourceMappings: {
            include: {
              source: {
                select: {
                  id: true,
                  name: true,
                  enabled: true
                }
              }
            }
          }
        }
      });

      // Format response
      const formattedHosts = hosts.map(host => ({
        id: host.id,
        domain: host.domain,
        entryType: host.entryType,
        enabled: host.enabled,
        occurrenceCount: host.occurrenceCount,
        firstSeen: host.firstSeen.toISOString(),
        lastSeen: host.lastSeen.toISOString(),
        sources: host.sourceMappings.map(mapping => ({
          id: mapping.source.id,
          name: mapping.source.name,
          enabled: mapping.source.enabled
        }))
      }));

      const totalPages = Math.ceil(total / limit);

      res.json({
        status: 'success',
        data: {
          hosts: formattedHosts,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get hosts:', error);
      next(error);
    }
  }

  /**
   * Get specific host details by ID
   * GET /api/hosts/:id
   */
  async getHostById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const host = await prisma.hostEntry.findUnique({
        where: { id },
        include: {
          sourceMappings: {
            include: {
              source: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  enabled: true
                }
              }
            }
          }
        }
      });

      if (!host) {
        return next(createError('Host not found', 404));
      }

      // Format response
      const formattedHost = {
        id: host.id,
        domain: host.domain,
        normalized: host.normalized,
        entryType: host.entryType,
        enabled: host.enabled,
        occurrenceCount: host.occurrenceCount,
        firstSeen: host.firstSeen.toISOString(),
        lastSeen: host.lastSeen.toISOString(),
        sources: host.sourceMappings.map(mapping => ({
          id: mapping.source.id,
          name: mapping.source.name,
          type: mapping.source.type,
          enabled: mapping.source.enabled,
          lineNumber: mapping.lineNumber,
          rawLine: mapping.rawLine,
          comment: mapping.comment
        }))
      };

      res.json({
        status: 'success',
        data: formattedHost
      });
    } catch (error) {
      logger.error(`Failed to get host ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Update host (enable/disable)
   * PATCH /api/hosts/:id
   * 
   * Request body: { enabled?: boolean }
   */
  async updateHost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const existingHost = await prisma.hostEntry.findUnique({
        where: { id }
      });

      if (!existingHost) {
        return next(createError('Host not found', 404));
      }

      // Only update enabled field
      const updateData: any = {};
      if (enabled !== undefined) {
        updateData.enabled = enabled;
      }

      const host = await prisma.hostEntry.update({
        where: { id },
        data: updateData
      });

      res.json({
        status: 'success',
        data: {
          id: host.id,
          enabled: host.enabled
        }
      });
    } catch (error) {
      logger.error(`Failed to update host ${req.params.id}:`, error);
      next(error);
    }
  }

  /**
   * Bulk update hosts
   * PATCH /api/hosts/bulk
   * 
   * Request body: { hostIds: string[], enabled: boolean }
   */
  async bulkUpdateHosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostIds, enabled } = req.body;

      if (!Array.isArray(hostIds) || hostIds.length === 0) {
        return next(createError('hostIds must be a non-empty array', 400));
      }

      if (typeof enabled !== 'boolean') {
        return next(createError('enabled must be a boolean', 400));
      }

      // Update all hosts in a single transaction
      const result = await prisma.hostEntry.updateMany({
        where: {
          id: {
            in: hostIds
          }
        },
        data: {
          enabled
        }
      });

      res.json({
        status: 'success',
        data: {
          updated: result.count,
          failed: hostIds.length - result.count
        }
      });
    } catch (error) {
      logger.error('Failed to bulk update hosts:', error);
      next(error);
    }
  }

  /**
   * Toggle multiple hosts
   * POST /api/hosts/bulk-toggle
   * 
   * Request body: { hostIds: string[] }
   */
  async bulkToggleHosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostIds } = req.body;

      if (!Array.isArray(hostIds) || hostIds.length === 0) {
        return next(createError('hostIds must be a non-empty array', 400));
      }

      // Get current state of all hosts
      const hosts = await prisma.hostEntry.findMany({
        where: {
          id: {
            in: hostIds
          }
        },
        select: {
          id: true,
          enabled: true
        }
      });

      // Toggle each host
      let toggled = 0;
      for (const host of hosts) {
        await prisma.hostEntry.update({
          where: { id: host.id },
          data: {
            enabled: !host.enabled
          }
        });
        toggled++;
      }

      res.json({
        status: 'success',
        data: {
          toggled
        }
      });
    } catch (error) {
      logger.error('Failed to bulk toggle hosts:', error);
      next(error);
    }
  }

  /**
   * Get host statistics
   * GET /api/hosts/stats
   */
  async getHostStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Get total counts
      const total = await prisma.hostEntry.count();
      const enabled = await prisma.hostEntry.count({
        where: { enabled: true }
      });
      const disabled = await prisma.hostEntry.count({
        where: { enabled: false }
      });

      // Get counts by entry type
      const blockCount = await prisma.hostEntry.count({
        where: { entryType: 'block' }
      });
      const allowCount = await prisma.hostEntry.count({
        where: { entryType: 'allow' }
      });
      const elementCount = await prisma.hostEntry.count({
        where: { entryType: 'element' }
      });

      // Get counts by source
      const sourceCounts = await prisma.sourceHostMapping.groupBy({
        by: ['sourceId'],
        _count: {
          hostEntryId: true
        }
      });

      // Fetch source names
      const sourceIds = sourceCounts.map(sc => sc.sourceId);
      const sources = await prisma.source.findMany({
        where: {
          id: {
            in: sourceIds
          }
        },
        select: {
          id: true,
          name: true
        }
      });

      // Create source map for quick lookup
      const sourceMap = new Map(sources.map(s => [s.id, s.name]));

      // Format by source data
      const bySource = sourceCounts.map(sc => ({
        sourceId: sc.sourceId,
        sourceName: sourceMap.get(sc.sourceId) || 'Unknown',
        hostCount: sc._count.hostEntryId
      })).sort((a, b) => b.hostCount - a.hostCount);

      res.json({
        status: 'success',
        data: {
          total,
          enabled,
          disabled,
          byEntryType: {
            block: blockCount,
            allow: allowCount,
            element: elementCount
          },
          bySource
        }
      });
    } catch (error) {
      logger.error('Failed to get host stats:', error);
      next(error);
    }
  }
}
