/**
 * Unit tests for LeafletMap component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeafletMap } from './leaflet-map';
import { useMapLocation } from '@/hooks/map/use-map-location';
import type { MapMarker, MapPosition } from '@/types/map';

// Mock useMapLocation hook
jest.mock('@/hooks/map/use-map-location', () => ({
  useMapLocation: jest.fn(),
}));

const mockUseMapLocation = useMapLocation as jest.MockedFunction<typeof useMapLocation>;

describe('LeafletMap', () => {
  const defaultProps = {
    center: { latitude: 39.9042, longitude: 116.4074 } as MapPosition,
    zoom: 13,
    minZoom: 1,
    maxZoom: 18,
  };

  const defaultLocationReturn = {
    position: null,
    accuracy: null,
    loading: false,
    error: null,
    locate: jest.fn().mockResolvedValue(null),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMapLocation.mockReturnValue(defaultLocationReturn);
  });

  describe('Rendering', () => {
    it('should render MapContainer with correct props', () => {
      render(<LeafletMap {...defaultProps} />);

      const mapContainer = screen.getByTestId('leaflet-map-container');
      expect(mapContainer).toBeInTheDocument();
      expect(mapContainer).toHaveAttribute(
        'data-center',
        JSON.stringify([39.9042, 116.4074])
      );
      expect(mapContainer).toHaveAttribute('data-zoom', '13');
      expect(mapContainer).toHaveAttribute('data-min-zoom', '1');
      expect(mapContainer).toHaveAttribute('data-max-zoom', '18');
    });

    it('should render TileLayer with OSM URL', () => {
      render(<LeafletMap {...defaultProps} />);

      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toBeInTheDocument();
      expect(tileLayer).toHaveAttribute(
        'data-url',
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      );
    });

    it('should use default center when center prop is undefined', () => {
      render(
        <LeafletMap
          zoom={13}
          minZoom={1}
          maxZoom={18}
        />
      );

      const mapContainer = screen.getByTestId('leaflet-map-container');
      // Default center: Beijing [39.9042, 116.4074]
      expect(mapContainer).toHaveAttribute(
        'data-center',
        JSON.stringify([39.9042, 116.4074])
      );
    });

    it('should render with zoomControl based on showControls', () => {
      render(<LeafletMap {...defaultProps} showControls={false} />);

      const mapContainer = screen.getByTestId('leaflet-map-container');
      expect(mapContainer).toHaveAttribute('data-zoom-control', 'false');
    });

    it('should render with attribution control enabled', () => {
      render(<LeafletMap {...defaultProps} />);

      const mapContainer = screen.getByTestId('leaflet-map-container');
      expect(mapContainer).toHaveAttribute('data-attribution-control', 'true');
    });
  });

  describe('Markers', () => {
    it('should render markers from props', () => {
      const markers: MapMarker[] = [
        { id: '1', position: { latitude: 39.9, longitude: 116.4 }, title: 'Place A' },
        { id: '2', position: { latitude: 40.0, longitude: 116.5 }, title: 'Place B' },
      ];

      render(<LeafletMap {...defaultProps} markers={markers} />);

      const markerElements = screen.getAllByTestId('marker');
      expect(markerElements).toHaveLength(2);
    });

    it('should render marker with correct position', () => {
      const markers: MapMarker[] = [
        { id: '1', position: { latitude: 39.9, longitude: 116.4 }, title: 'Place A' },
      ];

      render(<LeafletMap {...defaultProps} markers={markers} />);

      const marker = screen.getByTestId('marker');
      expect(marker).toHaveAttribute(
        'data-position',
        JSON.stringify([39.9, 116.4])
      );
    });

    it('should render popup with title and description', () => {
      const markers: MapMarker[] = [
        {
          id: '1',
          position: { latitude: 39.9, longitude: 116.4 },
          title: 'Beijing',
          description: 'Capital of China',
        },
      ];

      render(<LeafletMap {...defaultProps} markers={markers} />);

      expect(screen.getByText('Beijing')).toBeInTheDocument();
      expect(screen.getByText('Capital of China')).toBeInTheDocument();
    });

    it('should not render popup when no title or description', () => {
      const markers: MapMarker[] = [
        { id: '1', position: { latitude: 39.9, longitude: 116.4 } },
      ];

      render(<LeafletMap {...defaultProps} markers={markers} />);

      expect(screen.queryByTestId('popup')).not.toBeInTheDocument();
    });

    it('should call onMarkerClick when marker is clicked', async () => {
      const onMarkerClick = jest.fn();
      const markers: MapMarker[] = [
        { id: '1', position: { latitude: 39.9, longitude: 116.4 }, title: 'Place A' },
      ];

      const user = userEvent.setup();
      render(
        <LeafletMap {...defaultProps} markers={markers} onMarkerClick={onMarkerClick} />
      );

      const marker = screen.getByTestId('marker');
      await user.click(marker);

      expect(onMarkerClick).toHaveBeenCalledWith(markers[0]);
    });

    it('should render draggable marker', () => {
      const markers: MapMarker[] = [
        { id: '1', position: { latitude: 39.9, longitude: 116.4 }, draggable: true },
      ];

      render(<LeafletMap {...defaultProps} markers={markers} />);

      const marker = screen.getByTestId('marker');
      expect(marker).toHaveAttribute('data-draggable', 'true');
    });

    it('should render empty markers by default', () => {
      render(<LeafletMap {...defaultProps} />);

      expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
    });
  });

  describe('LocateControl', () => {
    it('should call locate when showCurrentLocation is true', () => {
      const mockLocate = jest.fn().mockResolvedValue(null);
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        locate: mockLocate,
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={true} />);

      expect(mockLocate).toHaveBeenCalled();
    });

    it('should not call locate when showCurrentLocation is false', () => {
      const mockLocate = jest.fn().mockResolvedValue(null);
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        locate: mockLocate,
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={false} />);

      expect(mockLocate).not.toHaveBeenCalled();
    });

    it('should render current location marker when position is available', () => {
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        position: { latitude: 39.9, longitude: 116.4 },
        accuracy: 30,
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={true} />);

      // Current location marker + popup text
      expect(screen.getByText('Current Location')).toBeInTheDocument();
    });

    it('should show accuracy info in popup', () => {
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        position: { latitude: 39.9, longitude: 116.4 },
        accuracy: 42,
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={true} />);

      expect(screen.getByText(/Accuracy/)).toBeInTheDocument();
      expect(screen.getByText(/42/)).toBeInTheDocument();
    });

    it('should render accuracy circle when accuracy > 50', () => {
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        position: { latitude: 39.9, longitude: 116.4 },
        accuracy: 100,
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={true} />);

      const circle = screen.getByTestId('circle');
      expect(circle).toBeInTheDocument();
      expect(circle).toHaveAttribute('data-radius', '100');
    });

    it('should not render accuracy circle when accuracy <= 50', () => {
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        position: { latitude: 39.9, longitude: 116.4 },
        accuracy: 30,
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={true} />);

      expect(screen.queryByTestId('circle')).not.toBeInTheDocument();
    });

    it('should not render location marker when showCurrentLocation is false', () => {
      mockUseMapLocation.mockReturnValue({
        ...defaultLocationReturn,
        position: { latitude: 39.9, longitude: 116.4 },
      });

      render(<LeafletMap {...defaultProps} showCurrentLocation={false} />);

      expect(screen.queryByText('Current Location')).not.toBeInTheDocument();
    });
  });
});
