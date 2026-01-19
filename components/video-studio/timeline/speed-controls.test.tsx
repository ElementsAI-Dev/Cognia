import { render, screen } from '@testing-library/react';
import { SpeedControls, DEFAULT_SPEED_SETTINGS } from './speed-controls';

describe('SpeedControls', () => {
  const defaultProps = {
    settings: DEFAULT_SPEED_SETTINGS,
    onSettingsChange: jest.fn(),
    duration: 60,
    onReset: jest.fn(),
  };

  it('renders speed controls', () => {
    render(<SpeedControls {...defaultProps} />);
    expect(screen.getByText('Speed Controls')).toBeInTheDocument();
  });

  it('displays playback speed label', () => {
    render(<SpeedControls {...defaultProps} />);
    expect(screen.getByText('Playback Speed')).toBeInTheDocument();
  });

  it('displays speed presets', () => {
    render(<SpeedControls {...defaultProps} />);
    // Multiple preset buttons exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays duration info', () => {
    render(<SpeedControls {...defaultProps} />);
    expect(screen.getByText('Original Duration')).toBeInTheDocument();
    expect(screen.getByText('New Duration')).toBeInTheDocument();
  });
});
