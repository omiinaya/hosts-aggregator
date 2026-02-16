import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HostsFilters from '../../components/hosts/HostsFilters';

describe('HostsFilters', () => {
  const defaultProps = {
    searchValue: '',
    entryTypeValue: 'all',
    enabledValue: 'all',
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    render(<HostsFilters {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search domain names...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render entry type select', () => {
    render(<HostsFilters {...defaultProps} />);
    const selectTrigger = screen.getByText('Entry Type');
    expect(selectTrigger).toBeInTheDocument();
  });

  it('should render status select', () => {
    render(<HostsFilters {...defaultProps} />);
    const selectTrigger = screen.getByText('Status');
    expect(selectTrigger).toBeInTheDocument();
  });

  it('should call onSearchChange when search input changes', () => {
    render(<HostsFilters {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search domain names...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('should display search value', () => {
    render(<HostsFilters {...defaultProps} searchValue="example.com" />);
    const searchInput = screen.getByPlaceholderText('Search domain names...') as HTMLInputElement;
    expect(searchInput.value).toBe('example.com');
  });

  it('should render within a Card component', () => {
    render(<HostsFilters {...defaultProps} />);
    const card = document.querySelector('.mb-6');
    expect(card).toBeInTheDocument();
  });
});
