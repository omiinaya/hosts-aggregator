import { rest } from 'msw';

export const handlers = [
  // Sources endpoints
  rest.get('*/api/sources', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
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
      })
    );
  }),

  rest.get('*/api/aggregated/stats', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          totalSources: 5,
          enabledSources: 3,
          totalEntries: 10000,
          lastAggregation: new Date().toISOString(),
        },
      })
    );
  }),

  rest.post('*/api/aggregated', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          totalSources: 3,
          totalEntries: 10000,
          uniqueEntries: 9500,
          duplicatesRemoved: 500,
          processingTime: 1000,
        },
      })
    );
  }),
];
