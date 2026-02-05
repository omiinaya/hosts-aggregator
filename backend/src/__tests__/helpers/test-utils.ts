import { prisma } from '../../config/database';

/**
 * Test utilities for backend tests
 */

export interface TestSource {
  id?: string;
  name: string;
  url?: string;
  filePath?: string;
  type: 'URL' | 'FILE';
  enabled?: boolean;
}

export interface TestHostEntry {
  domain: string;
  sourceId: string;
  entryType?: 'block' | 'allow';
}

/**
 * Create a test source in the database
 */
export async function createTestSource(data: TestSource) {
  return prisma.source.create({
    data: {
      name: data.name,
      url: data.url || null,
      filePath: data.filePath || null,
      type: data.type,
      enabled: data.enabled ?? true,
    },
  });
}

/**
 * Create multiple test sources
 */
export async function createTestSources(sources: TestSource[]) {
  return Promise.all(sources.map(createTestSource));
}

/**
 * Create a test host entry
 */
export async function createTestHostEntry(data: TestHostEntry) {
  return prisma.hostEntry.create({
    data: {
      domain: data.domain,
      normalized: data.domain.toLowerCase(),
      entryType: data.entryType || 'block',
      sourceId: data.sourceId,
      firstSeen: new Date(),
      lastSeen: new Date(),
      occurrenceCount: 1,
    },
  });
}

/**
 * Generate a test hosts file content
 */
export function generateStandardHostsContent(domains: string[]): string {
  return domains.map(d => `0.0.0.0 ${d}`).join('\n');
}

/**
 * Generate a test ABP format content
 */
export function generateABPContent(domains: string[], type: 'block' | 'allow' = 'block'): string {
  const prefix = type === 'allow' ? '@@' : '';
  return domains.map(d => `${prefix}||${d}^`).join('\n');
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
