import { AggregationService } from './aggregation.service';
import { logger } from '../utils/logger';
import servingConfig from '../config/serving';

export class AutoAggregationService {
  private aggregationService: AggregationService;
  private isAggregating: boolean = false;
  private aggregationQueue: Array<() => Promise<void>> = [];
  private autoAggregateEnabled: boolean;

  constructor() {
    this.aggregationService = new AggregationService();
    this.autoAggregateEnabled = servingConfig.autoAggregateEnabled;
  }

  /**
   * Enable or disable automatic aggregation
   */
  setAutoAggregateEnabled(enabled: boolean): void {
    this.autoAggregateEnabled = enabled;
    logger.info(`Auto-aggregation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Trigger automatic aggregation when sources change
   * This runs aggregation in the background to avoid blocking API responses
   */
  async triggerAggregation(): Promise<void> {
    if (!this.autoAggregateEnabled) {
      logger.debug('Auto-aggregation is disabled, skipping');
      return;
    }

    // If already aggregating, queue the request
    if (this.isAggregating) {
      logger.debug('Aggregation already in progress, queuing request');
      this.aggregationQueue.push(async () => {
        await this.performAggregation();
      });
      return;
    }

    // Perform aggregation in background
    this.performAggregation().catch(error => {
      logger.error('Background aggregation failed:', error);
    });
  }

  /**
   * Perform the actual aggregation
   */
  private async performAggregation(): Promise<void> {
    this.isAggregating = true;
    
    try {
      logger.info('Starting automatic aggregation due to source changes');
      
      const startTime = Date.now();
      const stats = await this.aggregationService.aggregateSources();
      const duration = Date.now() - startTime;
      
      logger.info(`Automatic aggregation completed in ${duration}ms`, {
        totalSources: stats.totalSources,
        totalEntries: stats.totalEntries,
        uniqueEntries: stats.uniqueEntries,
        duplicatesRemoved: stats.duplicatesRemoved
      });
    } catch (error) {
      logger.error('Automatic aggregation failed:', error);
    } finally {
      this.isAggregating = false;
      
      // Process any queued aggregation requests
      if (this.aggregationQueue.length > 0) {
        const nextAggregation = this.aggregationQueue.shift();
        if (nextAggregation) {
          setTimeout(() => {
            nextAggregation().catch(error => {
              logger.error('Queued aggregation failed:', error);
            });
          }, 1000); // Wait 1 second before next aggregation
        }
      }
    }
  }

  /**
   * Get aggregation status
   */
  getStatus(): {
    isAggregating: boolean;
    queueLength: number;
    autoAggregateEnabled: boolean;
  } {
    return {
      isAggregating: this.isAggregating,
      queueLength: this.aggregationQueue.length,
      autoAggregateEnabled: this.autoAggregateEnabled
    };
  }
}