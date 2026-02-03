import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import servingConfig from '../config/serving';
import { HostsParser } from '../services/parser.service';

export class ServeController {
  private parser: HostsParser;

  constructor() {
    this.parser = new HostsParser();
  }

  private authenticateRequest(req: Request, res: Response): boolean {
    if (!servingConfig.requireAuthForServe) {
      return true;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    return token === servingConfig.serveAuthToken;
  }

  /**
   * Get all unique hosts from enabled sources
   * Uses DISTINCT to ensure each host appears only once, even if in multiple enabled sources
   */
  private async getHostsFromEnabledSources(): Promise<string[]> {
    const hosts = await prisma.hostEntry.findMany({
      where: {
        enabled: true,
        source: {
          enabled: true
        }
      },
      select: {
        domain: true
      },
      distinct: ['normalized'],
      orderBy: {
        domain: 'asc'
      }
    });

    return hosts.map(h => h.domain);
  }

  /**
   * Get count of unique hosts from enabled sources
   */
  private async getEnabledHostsCount(): Promise<number> {
    return await prisma.hostEntry.count({
      where: {
        enabled: true,
        source: {
          enabled: true
        }
      }
    });
  }

  async serveHostsFile(req: Request, res: Response, next: NextFunction) {
    try {
      // Check authentication if required
      if (!this.authenticateRequest(req, res)) {
        return next(createError('Authentication required', 401));
      }

      // Check format query parameter
      const format = (req.query.format as string)?.toLowerCase();

      // If format is 'standard', serve in standard hosts format
      if (format === 'standard') {
        const hosts = await this.getHostsFromEnabledSources();

        // Get enabled sources count for header
        const enabledSourcesCount = await prisma.source.count({
          where: { enabled: true }
        });

        // Build hosts file content
        let content: string;
        if (hosts.length === 0) {
          content = `# Unified Hosts File
# Generated: ${new Date().toISOString()}
# No sources currently enabled
#
# Add and enable sources to populate this file
#
`;
        } else {
          const header = `# Unified Hosts File
# Generated: ${new Date().toISOString()}
# Total domains: ${hosts.length}
# Sources: ${enabledSourcesCount}

`;
          content = header + hosts.map(domain => `0.0.0.0 ${domain}`).join('\n');
        }

        // Set appropriate headers for Pi-hole/AdGuard Home
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');

        // Set cache control headers based on configuration
        if (servingConfig.cacheControlEnabled) {
          res.setHeader('Cache-Control', `public, max-age=${servingConfig.cacheMaxAgeSeconds}`);
          res.setHeader('Expires', new Date(Date.now() + servingConfig.cacheMaxAgeSeconds * 1000).toUTCString());
        } else {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }

        // Add informational headers
        res.setHeader('X-Hosts-File-Generated', new Date().toISOString());
        res.setHeader('X-Hosts-File-Entries', hosts.length.toString());
        res.setHeader('X-Hosts-File-Sources', enabledSourcesCount.toString());
        res.setHeader('X-Hosts-File-Format', 'standard');

        res.send(content);
        return;
      }

      // Default to ABP format (when no format parameter or format is 'adblock')
      return this.serveABP(req, res, next);
    } catch (error) {
      logger.error('Failed to serve hosts file:', error);
      next(error);
    }
  }

  async serveRawHostsFile(req: Request, res: Response, next: NextFunction) {
    try {
      // Check format query parameter
      const format = (req.query.format as string)?.toLowerCase();

      // If format is 'standard', serve in standard hosts format
      if (format === 'standard') {
        const hosts = await this.getHostsFromEnabledSources();

        let content: string;
        if (hosts.length === 0) {
          content = `# Unified Hosts File
# Generated: ${new Date().toISOString()}
# No sources currently enabled
#
# Add and enable sources to populate this file
#
`;
        } else {
          content = hosts.map(domain => `0.0.0.0 ${domain}`).join('\n');
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-Hosts-File-Generated', new Date().toISOString());
        res.setHeader('X-Hosts-File-Entries', hosts.length.toString());
        res.setHeader('X-Hosts-File-Format', 'standard');

        res.send(content);
        return;
      }

      // Default to ABP format (when no format parameter or format is 'adblock')
      return this.serveABPRaw(req, res, next);
    } catch (error) {
      logger.error('Failed to serve raw hosts file:', error);
      next(error);
    }
  }

  async getHostsFileInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const hostsCount = await this.getEnabledHostsCount();
      const enabledSourcesCount = await prisma.source.count({
        where: { enabled: true }
      });

      // Calculate approximate file size (header + each line)
      const headerSize = 150; // Approximate header size
      const avgLineSize = 25; // "0.0.0.0 " + domain + newline
      const estimatedSize = hostsCount === 0
        ? headerSize + 100 // Empty file with comments
        : headerSize + (hostsCount * avgLineSize);

      res.json({
        status: 'success',
        data: {
          filename: 'unified-hosts.txt',
          size: estimatedSize,
          entries: hostsCount,
          totalSources: enabledSourcesCount,
          generatedAt: new Date().toISOString(),
          downloadUrl: `${req.protocol}://${req.get('host')}/api/serve/hosts`,
          rawDownloadUrl: `${req.protocol}://${req.get('host')}/api/serve/hosts/raw`
        }
      });
    } catch (error) {
      logger.error('Failed to get hosts file info:', error);
      next(error);
    }
  }

  async healthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const hostsCount = await this.getEnabledHostsCount();
      const hasHostsFile = hostsCount > 0;

      res.json({
        status: 'success',
        data: {
          healthy: true,
          hasHostsFile,
          lastGenerated: new Date().toISOString(),
          totalEntries: hostsCount,
          message: hasHostsFile
            ? 'Hosts file is available for serving'
            : 'No hosts available. Add and enable sources first.'
        }
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      next(error);
    }
  }

  /**
   * Get all unique host entries from enabled sources with full details
   * Used for ABP format generation
   */
  private async getHostEntriesFromEnabledSources(): Promise<Array<{ domain: string; entryType: string }>> {
    const hosts = await prisma.hostEntry.findMany({
      where: {
        enabled: true,
        source: {
          enabled: true
        }
      },
      select: {
        domain: true,
        entryType: true
      },
      distinct: ['normalized'],
      orderBy: {
        domain: 'asc'
      }
    });

    return hosts;
  }

  /**
   * Serve aggregated hosts in ABP format
   * GET /api/serve/abp
   * 
   * Returns hosts in AdBlock Plus (ABP) format with ||domain^ patterns.
   * Includes proper headers for adblockers.
   */
  async serveABP(req: Request, res: Response, next: NextFunction) {
    try {
      // Check authentication if required
      if (!this.authenticateRequest(req, res)) {
        return next(createError('Authentication required', 401));
      }

      const hosts = await this.getHostEntriesFromEnabledSources();

      // Get enabled sources count for header
      const enabledSourcesCount = await prisma.source.count({
        where: { enabled: true }
      });

      // Build ABP format content
      let content: string;
      if (hosts.length === 0) {
        content = `! Unified Hosts File - ABP Format
! Generated: ${new Date().toISOString()}
! Total domains: 0
! Sources: 0
!
! Add and enable sources to populate this file
!
`;
      } else {
        const header = `! Unified Hosts File - ABP Format
! Generated: ${new Date().toISOString()}
! Total domains: ${hosts.length}
! Sources: ${enabledSourcesCount}
!
! This file uses AdBlock Plus format (||domain^)
! Compatible with uBlock Origin, AdGuard, and other adblockers
!

`;
        
        // Convert hosts to ABP format
        const abpLines = hosts.map(host => {
          if (host.entryType === 'allow') {
            return `@@||${host.domain}^`;
          } else if (host.entryType === 'element') {
            // Element hiding rules - need to check rawLine for full pattern
            return `${host.domain}##`;
          } else {
            // Default to block type
            return `||${host.domain}^`;
          }
        });
        
        content = header + abpLines.join('\n');
      }

      // Set appropriate headers for adblockers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      // Set cache control headers based on configuration
      if (servingConfig.cacheControlEnabled) {
        res.setHeader('Cache-Control', `public, max-age=${servingConfig.cacheMaxAgeSeconds}`);
        res.setHeader('Expires', new Date(Date.now() + servingConfig.cacheMaxAgeSeconds * 1000).toUTCString());
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      // Add informational headers
      res.setHeader('X-Hosts-File-Generated', new Date().toISOString());
      res.setHeader('X-Hosts-File-Entries', hosts.length.toString());
      res.setHeader('X-Hosts-File-Sources', enabledSourcesCount.toString());
      res.setHeader('X-Hosts-File-Format', 'abp');

      res.send(content);
    } catch (error) {
      logger.error('Failed to serve ABP file:', error);
      next(error);
    }
  }

  /**
   * Serve aggregated hosts in ABP format (raw)
   * GET /api/serve/abp/raw
   * 
   * Returns hosts in AdBlock Plus format without authentication
   * and without cache control headers.
   */
  async serveABPRaw(req: Request, res: Response, next: NextFunction) {
    try {
      const hosts = await this.getHostEntriesFromEnabledSources();

      let content: string;
      if (hosts.length === 0) {
        content = `! Unified Hosts File - ABP Format
! Generated: ${new Date().toISOString()}
! No sources currently enabled
!
! Add and enable sources to populate this file
!
`;
      } else {
        const header = `! Unified Hosts File - ABP Format
! Generated: ${new Date().toISOString()}
! Total domains: ${hosts.length}
!

`;
        
        // Convert hosts to ABP format
        const abpLines = hosts.map(host => {
          if (host.entryType === 'allow') {
            return `@@||${host.domain}^`;
          } else if (host.entryType === 'element') {
            return `${host.domain}##`;
          } else {
            return `||${host.domain}^`;
          }
        });
        
        content = header + abpLines.join('\n');
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Hosts-File-Generated', new Date().toISOString());
      res.setHeader('X-Hosts-File-Entries', hosts.length.toString());
      res.setHeader('X-Hosts-File-Format', 'abp');

      res.send(content);
    } catch (error) {
      logger.error('Failed to serve raw ABP file:', error);
      next(error);
    }
  }
}
