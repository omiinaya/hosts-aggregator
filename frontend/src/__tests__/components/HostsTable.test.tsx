import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostsTable from '../../components/hosts/HostsTable';
import { HostListResponse, HostEntry } from '../../types';

const mockHostsData: HostListResponse = {
  hosts: [
    {
      id: 'host-1',
      domain: 'example.com',
      entryType: 'block',
      enabled: true,
      occurrenceCount: 5,
      firstSeen: '2024-01-01T00:00:00.000Z',
      lastSeen: '2024-01-15T00:00:00.000Z',
      sources: [
        { id: 'source-1', name: 'Test Source', enabled: true },
      ],
    },
    {
      id: 'host-2',
      domain: 'allowed.com',
      entryType: 'allow',
      enabled: false,
      occurrenceCount: 2,
      firstSeen: '2024-01-02T00:00:00.000Z',
      lastSeen: '2024-01-16T00:00:00.000Z',
      sources: [],
    },
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 2,
    totalPages: 1,
  },
};

describe('HostsTable', () => {
  const defaultProps = {
    hostsData: mockHostsData,
    selectedHosts: new Set<string>(),
    isLoading: false,
    isPending: false,
    onSelectHost: vi.fn(),
    onSelectAll: vi.fn(),
    onToggleHost: vi.fn(),
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render hosts data', () => {
    render(<HostsTable {...defaultProps} />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('allowed.com')).toBeInTheDocument();
  });

  it('should render total count', () => {
    render(<HostsTable {...defaultProps} />);
    expect(screen.getByText('2 total')).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading is true', () => {
    render(<HostsTable {...defaultProps} isLoading={true} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display entry type badges', () => {
    render(<HostsTable {...defaultProps} />);
    expect(screen.getByText('block')).toBeInTheDocument();
    expect(screen.getByText('allow')).toBeInTheDocument();
  });

  it('should render pagination info', () => {
    render(<HostsTable {...defaultProps} />);
    expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
  });

  it('should call onSelectAll when select all is clicked', () => {
    render(<HostsTable {...defaultProps} />);
    const selectAllButton = screen.getByRole('button', { name: /select all/i });
    fireEvent.click(selectAllButton);
    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });

  it('should render empty state when no hosts', () => {
    render(<HostsTable {...defaultProps} hostsData={{ hosts: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }} />);
    expect(screen.getByText(/No hosts found/)).toBeInTheDocument();
  });
});
