import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

export class FileService {
  private readonly cacheDir = path.join(process.cwd(), 'data', 'cache');
  private readonly generatedDir = path.join(process.cwd(), 'data', 'generated');

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.mkdir(this.generatedDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories:', error);
    }
  }

  async cacheSourceContent(sourceId: string, content: string): Promise<string> {
    const filePath = path.join(this.cacheDir, `${sourceId}.txt`);
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      logger.error(`Failed to cache content for source ${sourceId}:`, error);
      throw error;
    }
  }

  async getCachedContent(sourceId: string): Promise<string | null> {
    const filePath = path.join(this.cacheDir, `${sourceId}.txt`);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to read cached content for source ${sourceId}:`, error);
      throw error;
    }
  }

  async generateUnifiedHostsFile(
    domains: string[],
    sourceCount: number,
    sourceNames?: string[]
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(this.generatedDir, `unified-hosts-${timestamp}.txt`);
    
    const header = `# Unified Hosts File
# Generated: ${new Date().toISOString()}
# Total domains: ${domains.length}
# Sources: ${sourceCount}
${sourceNames ? `# Source list: ${sourceNames.join(', ')}` : ''}

`;

    const content = header + domains.map(domain => `0.0.0.0 ${domain}`).join('\n');
    
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      logger.error('Failed to generate unified hosts file:', error);
      throw error;
    }
  }

  async readGeneratedFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.error(`Failed to read generated file ${filePath}:`, error);
      throw error;
    }
  }

  async deleteGeneratedFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to delete file ${filePath}:`, error);
        throw error;
      }
    }
  }

  async deleteCachedContent(sourceId: string): Promise<void> {
    const filePath = path.join(this.cacheDir, `${sourceId}.txt`);
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted cached content for source ${sourceId}`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to delete cached content for source ${sourceId}:`, error);
        throw error;
      }
      // File doesn't exist, which is fine
    }
  }

  async cleanupOldFiles(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    // Clean up files older than maxAge (default: 7 days)
    try {
      const files = await fs.readdir(this.generatedDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(this.generatedDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteGeneratedFile(filePath);
          logger.info(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }
  }

  async cleanupOrphanedCacheFiles(validSourceIds: string[]): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const validIds = new Set(validSourceIds);

      for (const file of files) {
        if (!file.endsWith('.txt')) continue;

        const sourceId = file.replace('.txt', '');
        if (!validIds.has(sourceId)) {
          const filePath = path.join(this.cacheDir, file);
          await fs.unlink(filePath);
          logger.info(`Cleaned up orphaned cache file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup orphaned cache files:', error);
    }
  }
}