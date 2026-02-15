import { http, HttpResponse } from 'msw';

export const handlers = [
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
];
