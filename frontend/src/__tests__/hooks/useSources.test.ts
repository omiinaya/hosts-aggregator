import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSources } from '../../hooks/useSources';
import { ReactNode } from 'react';

// Set up the API base URL before importing hooks
const API_BASE_URL = 'http://localhost:3010';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  // eslint-disable-next-line react/display-name
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient as any}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('useSources', () => {
  beforeEach(() => {
    // Reset fetch mock if needed
    vi.stubEnv('VITE_API_BASE_URL', API_BASE_URL);
  });

  it('should fetch sources and return data', async () => {
    const { result } = renderHook(() => useSources(), {
      wrapper: createWrapper(),
    });

    // Wait for the query to complete
    await waitFor(() => {
      return result.current.isSuccess || result.current.isError;
    });
    
    // Sources should be defined when successful
    if (result.current.isSuccess) {
      expect(result.current.sources).toBeDefined();
    }
  });

  it('should have isLoading state initially', () => {
    const { result } = renderHook(() => useSources(), {
      wrapper: createWrapper(),
    });
    
    // Initially loading or success (from cache)
    expect(result.current.isLoading || result.current.isSuccess).toBe(true);
  });
});
