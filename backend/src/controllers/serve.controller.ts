import { Request, Response, NextFunction } from 'express';
import { AggregationService } from '../services/aggregation.service';
import { FileService } from '../services/file.service';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import servingConfig from '../config/serving';

export class ServeController {
  private aggregationService: AggregationService;
  private fileService: FileService;

  constructor() {
    this.aggregationService = new AggregationService();
    this.fileService = new FileService();
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

  async serveHostsFile(req: Request, res: Response, next: NextFunction) {
    try {
      // Check authentication if required
      if (!this.authenticateRequest(req, res)) {
        return next(createError('Authentication required', 401));
      }

      const latestAggregation = await this.aggregationService.getLatestAggregation();

      if (!latestAggregation) {
        return next(createError('No hosts file available. Please run aggregation first.', 404));
      }

      const fileContent = await this.fileService.readGeneratedFile(latestAggregation.filePath);

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
      res.setHeader('X-Hosts-File-Generated', latestAggregation.timestamp.toISOString());
      res.setHeader('X-Hosts-File-Entries', latestAggregation.uniqueEntries.toString());
      res.setHeader('X-Hosts-File-Sources', latestAggregation.totalSources.toString());

      res.send(fileContent);
    } catch (error) {
      logger.error('Failed to serve hosts file:', error);
      next(error);
    }
  }

  async serveRawHostsFile(req: Request, res: Response, next: NextFunction) {
    try {
      const latestAggregation = await this.aggregationService.getLatestAggregation();

      if (!latestAggregation) {
        return next(createError('No hosts file available. Please run aggregation first.', 404));
      }

      const fileContent = await this.fileService.readGeneratedFile(latestAggregation.filePath);

      // Remove comments and empty lines for raw format
      const lines = fileContent.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('#');
      });

      const rawContent = filteredLines.join('\n');

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Hosts-File-Generated', latestAggregation.timestamp.toISOString());
      res.setHeader('X-Hosts-File-Entries', latestAggregation.uniqueEntries.toString());

      res.send(rawContent);
    } catch (error) {
      logger.error('Failed to serve raw hosts file:', error);
      next(error);
    }
  }

  async getHostsFileInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const latestAggregation = await this.aggregationService.getLatestAggregation();

      if (!latestAggregation) {
        return next(createError('No hosts file available. Please run aggregation first.', 404));
      }

      // Try to get file size
      let fileSize = 0;
      try {
        const fileContent = await this.fileService.readGeneratedFile(latestAggregation.filePath);
        fileSize = Buffer.byteLength(fileContent, 'utf8');
      } catch (error) {
        logger.warn('Could not read file size:', error);
      }

      res.json({
        status: 'success',
        data: {
          id: latestAggregation.id,
          filename: latestAggregation.filePath.split('/').pop() || 'unified-hosts.txt',
          filePath: latestAggregation.filePath,
          size: fileSize,
          entries: latestAggregation.uniqueEntries,
          totalSources: latestAggregation.totalSources,
          generatedAt: latestAggregation.timestamp.toISOString(),
          sourcesUsed: latestAggregation.sourcesUsed ? JSON.parse(latestAggregation.sourcesUsed) : [],
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
      const latestAggregation = await this.aggregationService.getLatestAggregation();
      const hasHostsFile = !!latestAggregation;

      res.json({
        status: 'success',
        data: {
          healthy: true,
          hasHostsFile,
          lastGenerated: latestAggregation?.timestamp.toISOString() || null,
          totalEntries: latestAggregation?.uniqueEntries || 0,
          message: hasHostsFile 
            ? 'Hosts file is available for serving' 
            : 'No hosts file available. Run aggregation first.'
        }
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      next(error);
    }
  }
}