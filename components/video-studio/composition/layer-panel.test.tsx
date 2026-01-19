import { render, screen } from '@testing-library/react';
import { LayerPanel, type VideoLayer } from './layer-panel';

const mockLayers: VideoLayer[] = [
  {
    id: 'layer-1',
    name: 'Video Track',
    type: 'video',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    startTime: 0,
    duration: 10,
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
  },
];

describe('LayerPanel', () => {
  const defaultProps = {
    layers: mockLayers,
    selectedLayerIds: [],
    onLayerSelect: jest.fn(),
    onLayerVisibilityToggle: jest.fn(),
    onLayerLockToggle: jest.fn(),
    onLayerOpacityChange: jest.fn(),
    onLayerBlendModeChange: jest.fn(),
    onLayerRename: jest.fn(),
    onLayerReorder: jest.fn(),
    onLayerDelete: jest.fn(),
    onLayerDuplicate: jest.fn(),
    onAddLayer: jest.fn(),
  };

  it('renders layer panel', () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.getByText('Layers')).toBeInTheDocument();
  });

  it('displays layer names', () => {
    render(<LayerPanel {...defaultProps} />);
    expect(screen.getByText('Video Track')).toBeInTheDocument();
  });

  it('shows empty state when no layers', () => {
    render(<LayerPanel {...defaultProps} layers={[]} />);
    expect(screen.getByText('No layers')).toBeInTheDocument();
  });
});
