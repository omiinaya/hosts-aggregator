import { http, HttpResponse } from 'msw';

export const handlers = [
  // Health endpoints
  http.get('*/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  http.get('*/api/serve/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Sources endpoints
  http.get('*/api/sources', () => {
    return HttpResponse.json({
      status: 'success',
      data: [
        {
          id: '1',
          name: 'Test Source',
          url: 'http://example.com/hosts',
          type: 'URL',
          enabled: true,
          lastFetched: new Date().toISOString(),
          entryCount: 100,
        },
      ],
    });
  }),

  http.get('*/sources', () => {
    return HttpResponse.json({
      status: 'success',
      data: [
        {
          id: '1',
          name: 'Test Source',
          url: 'http://example.com/hosts',
          type: 'URL',
          enabled: true,
          lastFetched: new Date().toISOString(),
          entryCount: 100,
        },
      ],
    });
  }),

  // Aggregated endpoints
  http.get('*/api/aggregated/stats', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        totalSources: 5,
        enabledSources: 3,
        totalEntries: 10000,
        lastAggregation: new Date().toISOString(),
      },
    });
  }),

  http.post('*/api/aggregated', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        totalSources: 3,
        totalEntries: 10000,
        uniqueEntries: 9500,
        duplicatesRemoved: 500,
        processingTime: 1000,
      },
    });
  }),

  // Hosts endpoints
  http.get('*/api/hosts', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        entries: [
          { domain: 'ad.example.com', source: 'test', type: 'block' },
          { domain: 'tracker.example.com', source: 'test', type: 'block' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      },
    });
  }),
];
