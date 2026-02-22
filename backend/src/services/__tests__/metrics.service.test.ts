import { register, httpRequestDuration, aggregationDuration, sourceFetchCounter, activeSourcesGauge } from '../metrics.service';

describe('MetricsService', () => {
  // Note: These tests primarily ensure that metrics are invoked without errors.
  // They use the global register which persists across tests, but that's okay for coverage.

  it('httpRequestDuration should start and observe a timer', () => {
    const timer = httpRequestDuration.startTimer();
    timer({ method: 'GET', route: '/test', status_code: 200 } as any);
  });

  it('aggregationDuration should start and observe a timer', () => {
    const timer = aggregationDuration.startTimer();
    timer();
  });

  it('sourceFetchCounter should increment', () => {
    sourceFetchCounter.inc({ status: '200' });
  });

  it('activeSourcesGauge should set value', () => {
    activeSourcesGauge.set(5);
  });

  it('register should return metrics as string', async () => {
    const metrics = await register.metrics();
    expect(metrics).toContain('http_request_duration_seconds');
  });
});
// Additional test coverage entry
