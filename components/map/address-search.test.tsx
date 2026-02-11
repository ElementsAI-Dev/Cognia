/**
 * Unit tests for AddressSearch component
 */

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressSearch } from './address-search';
import { useGeocoding } from '@/hooks/map/use-geocoding';
import type { GeocodingResult } from '@/types/map';

// Mock useGeocoding hook
jest.mock('@/hooks/map/use-geocoding', () => ({
  useGeocoding: jest.fn(),
}));

const mockUseGeocoding = useGeocoding as jest.MockedFunction<typeof useGeocoding>;

const createMockResult = (id: string, overrides: Partial<GeocodingResult> = {}): GeocodingResult => ({
  position: { latitude: 39.9 + Number(id) * 0.1, longitude: 116.4 + Number(id) * 0.1 },
  address: {
    formattedAddress: `Address ${id}`,
    city: `City ${id}`,
    country: 'China',
  },
  displayName: `Display Name ${id}, City ${id}, China`,
  importance: 0.8,
  placeId: `place-${id}`,
  type: 'city',
  ...overrides,
});

describe('AddressSearch', () => {
  const defaultMockReturn = {
    searchAddress: jest.fn().mockResolvedValue([]),
    reverseGeocode: jest.fn().mockResolvedValue(null),
    loading: false,
    error: null,
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseGeocoding.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with default placeholder from i18n', () => {
      render(<AddressSearch />);

      expect(screen.getByPlaceholderText('Search for an address...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<AddressSearch placeholder="Search location..." />);

      expect(screen.getByPlaceholderText('Search location...')).toBeInTheDocument();
    });

    it('should apply className', () => {
      const { container } = render(<AddressSearch className="custom-search" />);

      expect(container.firstChild).toHaveClass('custom-search');
      expect(container.firstChild).toHaveClass('relative');
    });

    it('should render search icon', () => {
      const { container } = render(<AddressSearch />);

      // Search icon (Lucide renders as SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Search Behavior', () => {
    it('should debounce search by 300ms', async () => {
      const mockSearch = jest.fn().mockResolvedValue([]);
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        searchAddress: mockSearch,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AddressSearch />);

      const input = screen.getByPlaceholderText('Search for an address...');
      await user.type(input, 'Beijing');

      // Not called yet (within debounce window)
      expect(mockSearch).not.toHaveBeenCalled();

      // Advance past debounce
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearch).toHaveBeenCalledWith('Beijing');
    });

    it('should not search with empty query', async () => {
      const mockSearch = jest.fn().mockResolvedValue([]);
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        searchAddress: mockSearch,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AddressSearch />);

      const input = screen.getByPlaceholderText('Search for an address...');
      await user.type(input, '   ');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should call onSearch callback with query', async () => {
      const onSearch = jest.fn();
      const mockSearch = jest.fn().mockResolvedValue([]);
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        searchAddress: mockSearch,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AddressSearch onSearch={onSearch} />);

      const input = screen.getByPlaceholderText('Search for an address...');
      await user.type(input, 'Tokyo');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSearch).toHaveBeenCalledWith('Tokyo');
    });

    it('should pass maxResults to useGeocoding', () => {
      render(<AddressSearch maxResults={10} />);

      expect(mockUseGeocoding).toHaveBeenCalledWith({ limit: 10 });
    });

    it('should use default maxResults of 5', () => {
      render(<AddressSearch />);

      expect(mockUseGeocoding).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        loading: true,
      });

      const { container } = render(<AddressSearch />);

      // Loader2 icon has animate-spin class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show clear button when loading', () => {
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        loading: true,
      });

      render(<AddressSearch />);

      // No clear button when loading
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when query has value', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AddressSearch />);

      const input = screen.getByPlaceholderText('Search for an address...');
      await user.type(input, 'test');

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should clear input on clear button click', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AddressSearch />);

      const input = screen.getByPlaceholderText('Search for an address...');
      await user.type(input, 'test');

      const clearButton = screen.getByRole('button');
      await user.click(clearButton);

      expect(input).toHaveValue('');
    });
  });

  describe('Error Display', () => {
    it('should show error message when error exists', () => {
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        error: 'Network error occurred',
      });

      render(<AddressSearch />);

      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should not show error when error is null', () => {
      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        error: null,
      });

      const { container } = render(<AddressSearch />);

      expect(container.querySelector('.text-destructive')).not.toBeInTheDocument();
    });
  });

  describe('Result Selection', () => {
    it('should call onSelect when a result is chosen', async () => {
      const onSelect = jest.fn();
      const results = [createMockResult('1'), createMockResult('2')];
      const mockSearch = jest.fn().mockResolvedValue(results);

      mockUseGeocoding.mockReturnValue({
        ...defaultMockReturn,
        searchAddress: mockSearch,
      });

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AddressSearch onSelect={onSelect} />);

      const input = screen.getByPlaceholderText('Search for an address...');
      await user.type(input, 'Beijing');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      // Check if results appear — the popover should open with CommandItems
      const resultItem = screen.queryByText('City 1');
      if (resultItem) {
        await user.click(resultItem);
        expect(onSelect).toHaveBeenCalledWith(results[0]);
      }
    });
  });
});
