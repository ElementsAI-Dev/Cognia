import { render, screen } from '@testing-library/react';
import { MarkersPanel, type Marker } from './markers-panel';

const mockMarkers: Marker[] = [
  {
    id: 'marker-1',
    time: 5,
    name: 'Intro Start',
    type: 'chapter',
    color: 'blue',
  },
];

describe('MarkersPanel', () => {
  const defaultProps = {
    markers: mockMarkers,
    currentTime: 10,
    duration: 60,
    onAddMarker: jest.fn(),
    onUpdateMarker: jest.fn(),
    onDeleteMarker: jest.fn(),
    onJumpToMarker: jest.fn(),
  };

  it('renders markers panel', () => {
    render(<MarkersPanel {...defaultProps} />);
    expect(screen.getByText('Markers')).toBeInTheDocument();
  });

  it('displays marker names', () => {
    render(<MarkersPanel {...defaultProps} />);
    expect(screen.getByText('Intro Start')).toBeInTheDocument();
  });

  it('shows empty state when no markers', () => {
    render(<MarkersPanel {...defaultProps} markers={[]} />);
    expect(screen.getByText('No markers yet')).toBeInTheDocument();
  });

  it('shows add button', () => {
    render(<MarkersPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });
});
