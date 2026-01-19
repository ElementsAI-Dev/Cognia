import { render, screen } from '@testing-library/react';
import { ColorCorrectionPanel, DEFAULT_COLOR_CORRECTION_SETTINGS } from './color-correction-panel';

describe('ColorCorrectionPanel', () => {
  const defaultProps = {
    settings: DEFAULT_COLOR_CORRECTION_SETTINGS,
    onSettingsChange: jest.fn(),
    onReset: jest.fn(),
  };

  it('renders color correction panel', () => {
    render(<ColorCorrectionPanel {...defaultProps} />);
    expect(screen.getByText('Color Correction')).toBeInTheDocument();
  });

  it('displays presets section', () => {
    render(<ColorCorrectionPanel {...defaultProps} />);
    expect(screen.getByText('Presets')).toBeInTheDocument();
  });

  it('has tabs for different settings', () => {
    render(<ColorCorrectionPanel {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('displays brightness control', () => {
    render(<ColorCorrectionPanel {...defaultProps} />);
    expect(screen.getByText('Brightness')).toBeInTheDocument();
  });
});
