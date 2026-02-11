/**
 * Unit tests for MapContainer component
 */

import { render, screen } from '@testing-library/react';
import { MapContainer } from './map-container';
import type { MapPosition, MapMarker } from '@/types/map';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from '@/types/map';

// Mock next/dynamic to render LeafletMap synchronously
jest.mock('next/dynamic', () => {
  return jest.fn((_loader: () => Promise<{ LeafletMap: React.ComponentType }>) => {
    // Return a component that renders with the props passed to it
    const DynamicComponent = (props: Record<string, unknown>) => {
      return (
        <div
          data-testid="leaflet-map-mock"
          data-center={JSON.stringify(props.center)}
          data-zoom={props.zoom}
          data-min-zoom={props.minZoom}
          data-max-zoom={props.maxZoom}
          data-markers={JSON.stringify(props.markers)}
          data-show-current-location={String(props.showCurrentLocation)}
          data-show-controls={String(props.showControls)}
          data-show-scale={String(props.showScale)}
          onClick={() => {
            const onMapClick = props.onMapClick as ((pos: MapPosition) => void) | undefined;
            onMapClick?.({ latitude: 40, longitude: 116 });
          }}
        />
      );
    };
    DynamicComponent.displayName = 'DynamicLeafletMap';
    return DynamicComponent;
  });
});

// Mock LoadingOverlay
jest.mock('@/components/ui/loading-states', () => ({
  LoadingOverlay: () => <div data-testid="loading-overlay" />,
}));

describe('MapContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<MapContainer />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toBeInTheDocument();
      expect(map).toHaveAttribute('data-center', JSON.stringify(DEFAULT_MAP_CENTER));
      expect(map).toHaveAttribute('data-zoom', String(DEFAULT_ZOOM));
    });

    it('should render with custom center', () => {
      const center: MapPosition = { latitude: 51.505, longitude: -0.09 };
      render(<MapContainer center={center} />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-center', JSON.stringify(center));
    });

    it('should render with custom zoom', () => {
      render(<MapContainer zoom={10} />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-zoom', '10');
    });

    it('should pass MIN_ZOOM and MAX_ZOOM to LeafletMap', () => {
      render(<MapContainer />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-min-zoom', String(MIN_ZOOM));
      expect(map).toHaveAttribute('data-max-zoom', String(MAX_ZOOM));
    });

    it('should apply className', () => {
      const { container } = render(<MapContainer className="custom-map" />);

      expect(container.firstChild).toHaveClass('custom-map');
      expect(container.firstChild).toHaveClass('relative');
    });

    it('should apply style', () => {
      const style = { height: '500px' };
      const { container } = render(<MapContainer style={style} />);

      expect(container.firstChild).toHaveStyle({ height: '500px' });
    });
  });

  describe('Props Forwarding', () => {
    it('should forward markers', () => {
      const markers: MapMarker[] = [
        { id: '1', position: { latitude: 39.9, longitude: 116.4 }, title: 'Marker 1' },
        { id: '2', position: { latitude: 40.0, longitude: 116.5 }, title: 'Marker 2' },
      ];
      render(<MapContainer markers={markers} />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-markers', JSON.stringify(markers));
    });

    it('should forward showCurrentLocation', () => {
      render(<MapContainer showCurrentLocation={true} />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-show-current-location', 'true');
    });

    it('should forward showControls', () => {
      render(<MapContainer showControls={false} />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-show-controls', 'false');
    });

    it('should forward showScale', () => {
      render(<MapContainer showScale={false} />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(map).toHaveAttribute('data-show-scale', 'false');
    });
  });

  describe('Callbacks', () => {
    it('should call onMapClick with position', () => {
      const onMapClick = jest.fn();
      render(<MapContainer onMapClick={onMapClick} />);

      const map = screen.getByTestId('leaflet-map-mock');
      map.click();

      expect(onMapClick).toHaveBeenCalledWith({ latitude: 40, longitude: 116 });
    });

    it('should not throw when onMapClick is undefined', () => {
      render(<MapContainer />);

      const map = screen.getByTestId('leaflet-map-mock');
      expect(() => map.click()).not.toThrow();
    });
  });
});
