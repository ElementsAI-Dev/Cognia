import { render, screen } from '@testing-library/react';
import { MediaLibraryPanel, type MediaAsset } from './media-library-panel';

const mockAssets: MediaAsset[] = [
  {
    id: 'asset-1',
    name: 'intro.mp4',
    type: 'video',
    path: '/videos/intro.mp4',
    duration: 30,
    width: 1920,
    height: 1080,
    size: 50000000,
    createdAt: Date.now(),
  },
];

describe('MediaLibraryPanel', () => {
  const defaultProps = {
    assets: mockAssets,
    selectedAssetIds: [],
    onAssetSelect: jest.fn(),
    onAssetDoubleClick: jest.fn(),
    onAssetDragStart: jest.fn(),
    onImport: jest.fn(),
    onDelete: jest.fn(),
    onShowInfo: jest.fn(),
  };

  it('renders media library panel', () => {
    render(<MediaLibraryPanel {...defaultProps} />);
    expect(screen.getByText('Media Library')).toBeInTheDocument();
  });

  it('displays asset names', () => {
    render(<MediaLibraryPanel {...defaultProps} />);
    expect(screen.getByText('intro.mp4')).toBeInTheDocument();
  });

  it('shows empty state when no assets', () => {
    render(<MediaLibraryPanel {...defaultProps} assets={[]} />);
    expect(screen.getByText('No media files')).toBeInTheDocument();
  });

  it('shows import button', () => {
    render(<MediaLibraryPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });
});
