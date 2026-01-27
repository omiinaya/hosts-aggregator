import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

export class FileService {
  private readonly generatedDir = path.join(process.cwd(), 'data', 'generated');

  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.generatedDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directories:', error);
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

  async getFileStats(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to get file stats for ${filePath}:`, error);
      throw error;
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

  async getLatestGeneratedFile(): Promise<string | null> {
    try {
      const files = await fs.readdir(this.generatedDir);
      const txtFiles = files.filter(f => f.endsWith('.txt') && f.startsWith('unified-hosts-'));

      if (txtFiles.length === 0) {
        return null;
      }

      // Sort by filename (which includes timestamp) in descending order
      txtFiles.sort().reverse();
      return path.join(this.generatedDir, txtFiles[0]);
    } catch (error) {
      logger.error('Failed to get latest generated file:', error);
      return null;
    }
  }
}
