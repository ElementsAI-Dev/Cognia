import { render, screen } from '@testing-library/react';
import { TextOverlayEditor, type TextOverlay } from './text-overlay-editor';

const mockOverlay: TextOverlay = {
  id: 'overlay-1',
  text: 'Sample Text',
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0,
  outlineColor: '#000000',
  outlineWidth: 0,
  alignment: 'center',
  position: { x: 100, y: 100 },
  rotation: 0,
  opacity: 1,
  animation: 'none',
  animationDuration: 0.5,
  startTime: 0,
  duration: 5,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
};

describe('TextOverlayEditor', () => {
  const defaultProps = {
    overlay: mockOverlay,
    onOverlayChange: jest.fn(),
    onClose: jest.fn(),
  };

  it('renders text overlay editor', () => {
    render(<TextOverlayEditor {...defaultProps} />);
    expect(screen.getByText('Text Overlay')).toBeInTheDocument();
  });

  it('displays text content', () => {
    render(<TextOverlayEditor {...defaultProps} />);
    expect(screen.getByDisplayValue('Sample Text')).toBeInTheDocument();
  });

  it('has tabs for different settings', () => {
    render(<TextOverlayEditor {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });
});
