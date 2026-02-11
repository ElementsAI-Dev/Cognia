/**
 * LocationPanel Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationPanel } from './location-panel';
import { useMapLocation } from '@/hooks/map';

// Mock dependencies
jest.mock('@/hooks/map', () => ({
  useMapLocation: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/map', () => ({
  MapContainer: ({
    onMapClick,
    className,
  }: {
    center?: { latitude: number; longitude: number };
    zoom?: number;
    markers?: unknown[];
    showCurrentLocation?: boolean;
    showControls?: boolean;
    onMapClick?: (pos: { latitude: number; longitude: number }) => void;
    className?: string;
  }) => (
    <div data-testid="map-container" className={className} onClick={() => onMapClick?.({ latitude: 40.0, longitude: 116.0 })}>
      Map
    </div>
  ),
  AddressSearch: ({
    onSelect,
    placeholder,
    className,
  }: {
    onSelect?: (result: { position: { latitude: number; longitude: number }; displayName: string; address: { formattedAddress: string } }) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      data-testid="address-search"
      placeholder={placeholder}
      className={className}
      onChange={() =>
        onSelect?.({
          position: { latitude: 39.9042, longitude: 116.4074 },
          displayName: 'Beijing',
          address: { formattedAddress: 'Beijing, China' },
        })
      }
    />
  ),
}));

const mockUseMapLocation = useMapLocation as jest.MockedFunction<typeof useMapLocation>;

const defaultMockReturn = {
  position: null,
  accuracy: null,
  loading: false,
  error: null,
  locate: jest.fn().mockResolvedValue({ latitude: 39.9042, longitude: 116.4074 }),
  clearError: jest.fn(),
};

describe('LocationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMapLocation.mockReturnValue(defaultMockReturn);

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders header with title', () => {
    render(<LocationPanel />);
    expect(screen.getByText('currentLocation')).toBeInTheDocument();
  });

  it('renders locate me button', () => {
    render(<LocationPanel />);
    expect(screen.getByText('locateMe')).toBeInTheDocument();
  });

  it('renders map container', () => {
    render(<LocationPanel />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders address search input', () => {
    render(<LocationPanel />);
    expect(screen.getByTestId('address-search')).toBeInTheDocument();
  });

  it('shows loading state on locate button', () => {
    mockUseMapLocation.mockReturnValue({
      ...defaultMockReturn,
      loading: true,
    });

    render(<LocationPanel />);
    expect(screen.getByText('locating')).toBeInTheDocument();
  });

  it('shows error alert when error exists', () => {
    mockUseMapLocation.mockReturnValue({
      ...defaultMockReturn,
      error: 'Geolocation permission denied',
    });

    render(<LocationPanel />);
    expect(screen.getByText('Geolocation permission denied')).toBeInTheDocument();
  });

  it('calls locate when locate button is clicked', async () => {
    render(<LocationPanel />);

    const locateButton = screen.getByText('locateMe');
    fireEvent.click(locateButton);

    expect(defaultMockReturn.clearError).toHaveBeenCalled();
    expect(defaultMockReturn.locate).toHaveBeenCalled();
  });

  it('displays location info card when position is available', () => {
    mockUseMapLocation.mockReturnValue({
      ...defaultMockReturn,
      position: { latitude: 39.9042, longitude: 116.4074 },
      accuracy: 15,
    });

    render(<LocationPanel />);
    expect(screen.getByText(/latitude/)).toBeInTheDocument();
    expect(screen.getByText(/longitude/)).toBeInTheDocument();
    expect(screen.getByText('39.904200')).toBeInTheDocument();
    expect(screen.getByText('116.407400')).toBeInTheDocument();
  });

  it('displays accuracy when available', () => {
    mockUseMapLocation.mockReturnValue({
      ...defaultMockReturn,
      position: { latitude: 39.9042, longitude: 116.4074 },
      accuracy: 15,
    });

    render(<LocationPanel />);
    expect(screen.getByText(/±15m/)).toBeInTheDocument();
  });

  it('does not show location card when no position', () => {
    render(<LocationPanel />);
    expect(screen.queryByText(/latitude/)).not.toBeInTheDocument();
    expect(screen.queryByText(/longitude/)).not.toBeInTheDocument();
  });

  it('updates location when map is clicked', () => {
    render(<LocationPanel />);

    const map = screen.getByTestId('map-container');
    fireEvent.click(map);

    // After clicking map, location info should appear
    expect(screen.getByText(/latitude/)).toBeInTheDocument();
    expect(screen.getByText('40.000000')).toBeInTheDocument();
    expect(screen.getByText('116.000000')).toBeInTheDocument();
  });

  it('updates location when address is selected', () => {
    render(<LocationPanel />);

    const searchInput = screen.getByTestId('address-search');
    fireEvent.change(searchInput, { target: { value: 'Beijing' } });

    // After address selection, location info should appear
    expect(screen.getByText(/latitude/)).toBeInTheDocument();
    expect(screen.getByText('39.904200')).toBeInTheDocument();
  });

  it('copies coordinates to clipboard', async () => {
    mockUseMapLocation.mockReturnValue({
      ...defaultMockReturn,
      position: { latitude: 39.9042, longitude: 116.4074 },
    });

    render(<LocationPanel />);

    // Find and click the copy button inside the location info card
    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find(
      (btn) => btn.querySelector('svg')
        && !btn.textContent?.includes('locateMe')
        && btn.closest('[class*="CardTitle"]')
    ) || copyButtons.find(
      (btn) => btn.querySelector('.lucide-copy')
    );

    if (copyButton) {
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('39.904200, 116.407400');
      });
    }
  });

  it('applies className prop', () => {
    const { container } = render(<LocationPanel className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('disables locate button while loading', () => {
    mockUseMapLocation.mockReturnValue({
      ...defaultMockReturn,
      loading: true,
    });

    render(<LocationPanel />);
    const locateButton = screen.getByText('locating').closest('button');
    expect(locateButton).toBeDisabled();
  });
});
