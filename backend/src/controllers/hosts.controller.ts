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

      // Build where clause for hostEntry
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
          { normalized: { contains: search.toLowerCase() } },
        ];
      }
      // Note: sourceId filter now needs to apply after we join via AggregationHostSource,
      // but for simplicity we'll filter in memory after fetching if sourceId is provided.
      // For performance we could join in the database, but that's more complex.

      // Get total count
      const total = await prisma.hostEntry.count({ where });

      // Get hosts with pagination (without source info initially)
      const hosts = await prisma.hostEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastSeen: 'desc' },
      });

      if (hosts.length === 0) {
        return res.json({
          status: 'success',
          data: {
            hosts: [],
            pagination: { page, limit, total, totalPages: 0 },
          },
        });
      }

      // Get the latest aggregation result ID
      const latestAggregationResult = await prisma.aggregationResult.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { id: true },
      });

      if (!latestAggregationResult) {
        // No aggregation yet, return hosts with empty sources
        const formattedHosts = hosts.map((host) => ({
          id: host.id,
          domain: host.domain,
          entryType: host.entryType,
          enabled: host.enabled,
          occurrenceCount: host.occurrenceCount,
          firstSeen: host.firstSeen.toISOString(),
          lastSeen: host.lastSeen.toISOString(),
          sources: [],
        }));
        return res.json({
          status: 'success',
          data: {
            hosts: formattedHosts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          },
        });
      }

      const hostIds = hosts.map((h) => h.id);

      // Find all aggregationHosts for these hostEntries in the latest aggregation
      const aggregationHosts = await prisma.aggregationHost.findMany({
        where: {
          aggregationResultId: latestAggregationResult.id,
          hostEntryId: { in: hostIds },
        },
      });

      if (aggregationHosts.length === 0) {
        // No aggregation hosts found, return empty sources
        const formattedHosts = hosts.map((host) => ({
          id: host.id,
          domain: host.domain,
          entryType: host.entryType,
          enabled: host.enabled,
          occurrenceCount: host.occurrenceCount,
          firstSeen: host.firstSeen.toISOString(),
          lastSeen: host.lastSeen.toISOString(),
          sources: [],
        }));
        return res.json({
          status: 'success',
          data: {
            hosts: formattedHosts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
          },
        });
      }

      const aggregationHostIds = aggregationHosts.map((h) => h.id);

      // Fetch all AggregationHostSource links with source details
      const hostSources = await prisma.aggregationHostSource.findMany({
        where: {
          aggregationHostId: { in: aggregationHostIds },
        },
        include: {
          source: {
            select: {
              id: true,
              name: true,
              enabled: true,
            },
          },
        },
      });

      // Build map: hostEntryId -> array of source objects
      const hostEntryIdToSources = new Map<
        string,
        Array<{ id: string; name: string; enabled: boolean }>
      >();
      for (const hostSource of hostSources) {
        const hostEntryId = aggregationHosts.find(
          (h) => h.id === hostSource.aggregationHostId
        )?.hostEntryId;
        if (!hostEntryId) continue;
        if (!hostEntryIdToSources.has(hostEntryId)) {
          hostEntryIdToSources.set(hostEntryId, []);
        }
        hostEntryIdToSources.get(hostEntryId)!.push({
          id: hostSource.source.id,
          name: hostSource.source.name,
          enabled: hostSource.source.enabled,
        });
      }

      // Format response
      const formattedHosts = hosts.map((host) => ({
        id: host.id,
        domain: host.domain,
        entryType: host.entryType,
        enabled: host.enabled,
        occurrenceCount: host.occurrenceCount,
        firstSeen: host.firstSeen.toISOString(),
        lastSeen: host.lastSeen.toISOString(),
        sources: hostEntryIdToSources.get(host.id) || [],
      }));

      // If sourceId filter is applied, filter hosts to only those that have that source
      let filteredHosts = formattedHosts;
      if (sourceId) {
        filteredHosts = formattedHosts.filter((host) =>
          host.sources.some((s) => s.id === sourceId)
        );
      }

      const totalPages = Math.ceil(total / limit);

      res.json({
        status: 'success',
        data: {
          hosts: filteredHosts,
          pagination: {
            page,
            limit,
            total: sourceId ? filteredHosts.length : total, // Adjust total if filtered
            totalPages: sourceId ? 1 : totalPages,
          },
        },
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
      });

      if (!host) {
        return next(createError('Host not found', 404));
      }

      // Get the latest aggregation result
      const latestAggregationResult = await prisma.aggregationResult.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { id: true },
      });

      let sources: Array<{ id: string; name: string; enabled: boolean }> = [];

      if (latestAggregationResult) {
        // Find the aggregationHost for this hostEntry in the latest aggregation
        const aggregationHost = await prisma.aggregationHost.findFirst({
          where: {
            aggregationResultId: latestAggregationResult.id,
            hostEntryId: host.id,
          },
        });

        if (aggregationHost) {
          // Fetch the sources for this aggregationHost
          const hostSources = await prisma.aggregationHostSource.findMany({
            where: {
              aggregationHostId: aggregationHost.id,
            },
            include: {
              source: {
                select: {
                  id: true,
                  name: true,
                  enabled: true,
                },
              },
            },
          });

          sources = hostSources.map((hs) => ({
            id: hs.source.id,
            name: hs.source.name,
            enabled: hs.source.enabled,
          }));
        }
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
        sources,
      };

      res.json({
        status: 'success',
        data: formattedHost,
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
        where: { id },
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
        data: updateData,
      });

      res.json({
        status: 'success',
        data: {
          id: host.id,
          enabled: host.enabled,
        },
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
            in: hostIds,
          },
        },
        data: {
          enabled,
        },
      });

      res.json({
        status: 'success',
        data: {
          updated: result.count,
          failed: hostIds.length - result.count,
        },
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
            in: hostIds,
          },
        },
        select: {
          id: true,
          enabled: true,
        },
      });

      // Toggle each host
      let toggled = 0;
      for (const host of hosts) {
        await prisma.hostEntry.update({
          where: { id: host.id },
          data: {
            enabled: !host.enabled,
          },
        });
        toggled++;
      }

      res.json({
        status: 'success',
        data: {
          toggled,
        },
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
      // Get total counts from hostEntry table
      const total = await prisma.hostEntry.count();
      const enabled = await prisma.hostEntry.count({
        where: { enabled: true },
      });
      const disabled = total - enabled;

      // Get counts by entry type
      const blockCount = await prisma.hostEntry.count({
        where: { entryType: 'block' },
      });
      const allowCount = await prisma.hostEntry.count({
        where: { entryType: 'allow' },
      });
      const elementCount = await prisma.hostEntry.count({
        where: { entryType: 'element' },
      });

      // Get counts by source from the latest aggregation
      const latestAggregationResult = await prisma.aggregationResult.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { id: true },
      });

      let bySource: Array<{ sourceId: string; sourceName: string; hostCount: number }> = [];

      if (latestAggregationResult) {
        // Get all aggregationHosts for this aggregation result
        const aggregationHosts = await prisma.aggregationHost.findMany({
          where: {
            aggregationResultId: latestAggregationResult.id,
          },
          include: {
            sources: {
              include: {
                source: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Build a map: sourceId -> count of hostEntries (domains)
        const sourceCountMap = new Map<string, number>();

        for (const host of aggregationHosts) {
          for (const hostSource of host.sources) {
            const sourceId = hostSource.sourceId;
            const current = sourceCountMap.get(sourceId) || 0;
            sourceCountMap.set(sourceId, current + 1);
          }
        }

        bySource = Array.from(sourceCountMap.entries())
          .map(([sourceId, count]) => {
            // Find source name from any hostSource (we could also query sources table)
            let sourceName = 'Unknown';
            for (const host of aggregationHosts) {
              const src = host.sources.find((s) => s.sourceId === sourceId);
              if (src) {
                sourceName = src.source.name;
                break;
              }
            }
            return { sourceId, sourceName, hostCount: count };
          })
          .sort((a, b) => b.hostCount - a.hostCount);
      }

      res.json({
        status: 'success',
        data: {
          total,
          enabled,
          disabled,
          byEntryType: {
            block: blockCount,
            allow: allowCount,
            element: elementCount,
          },
          bySource,
        },
      });
    } catch (error) {
      logger.error('Failed to get host stats:', error);
      next(error);
    }
  }

  /**
   * Toggle host enabled status
   * PATCH /api/hosts/:hostId/toggle
   *
   * Request body: { enabled: boolean }
   */
  async toggleHost(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostId } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return next(createError('enabled must be a boolean', 400));
      }

      // Verify the host exists
      const host = await prisma.hostEntry.findUnique({
        where: { id: hostId },
      });

      if (!host) {
        return next(createError('Host not found', 404));
      }

      // Update the host
      const updatedHost = await prisma.hostEntry.update({
        where: { id: hostId },
        data: {
          enabled,
        },
      });

      res.json({
        status: 'success',
        data: {
          hostId,
          enabled: updatedHost.enabled,
        },
      });
    } catch (error) {
      logger.error(`Failed to toggle host ${req.params.hostId}:`, error);
      next(error);
    }
  }
}
