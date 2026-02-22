import { ConfigService } from '../config.service';
import { prisma } from '../../config/database';

jest.mock('../../config/database', () => ({
  prisma: {
    config: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe('ConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to get mocked prisma
  const mockedPrisma = (prisma as any);

  describe('getConfig', () => {
    it('should return default config when no config exists', async () => {
      mockPrisma.config.findUnique.mockResolvedValue(null);
      const result = await configService.getConfig();
      expect(result).toBeDefined();
      expect(mockPrisma.config.findUnique).toHaveBeenCalledWith({ where: { id: 'default' } });
    });

    it('should return existing config', async () => {
      const mockConfig = { id: 'default', autoAggregate: true, port: 3000 };
      mockPrisma.config.findUnique.mockResolvedValue(mockConfig);
      const result = await configService.getConfig();
      expect(result).toEqual(mockConfig);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.config.findUnique.mockRejectedValue(new Error('DB error'));
      await expect(configService.getConfig()).rejects.toThrow('DB error');
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const updatedConfig = { id: 'default', autoAggregate: false, port: 3001 };
      mockPrisma.config.upsert.mockResolvedValue(updatedConfig);
      const result = await configService.updateConfig({ autoAggregate: false, port: 3001 });
      expect(result).toEqual(updatedConfig);
      expect(mockPrisma.config.upsert).toHaveBeenCalled();
    });

    it('should merge partial updates', async () => {
      const existingConfig = { id: 'default', autoAggregate: true, port: 3000 };
      mockPrisma.config.findUnique.mockResolvedValue(existingConfig);
      const updatedConfig = { ...existingConfig, port: 3002 };
      mockPrisma.config.upsert.mockResolvedValue(updatedConfig);
      const result = await configService.updateConfig({ port: 3002 });
      expect(result.port).toBe(3002);
      expect(result.autoAggregate).toBe(true);
    });

    it('should handle validation errors', async () => {
      await expect(configService.updateConfig({ port: -1 })).rejects.toThrow();
    });
  });

  describe('resetConfig', () => {
    it('should reset to default values', async () => {
      const defaultConfig = { id: 'default', autoAggregate: true, port: 3000 };
      mockPrisma.config.upsert.mockResolvedValue(defaultConfig);
      const result = await configService.resetConfig();
      expect(result).toEqual(defaultConfig);
    });
  });
});
