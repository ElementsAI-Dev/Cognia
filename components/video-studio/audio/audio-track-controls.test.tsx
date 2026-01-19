import { render, screen, fireEvent } from '@testing-library/react';
import { AudioTrackControls, DEFAULT_AUDIO_TRACK_SETTINGS } from './audio-track-controls';

describe('AudioTrackControls', () => {
  const defaultProps = {
    trackId: 'track-1',
    trackName: 'Audio Track 1',
    settings: DEFAULT_AUDIO_TRACK_SETTINGS,
    duration: 60,
    onSettingsChange: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders audio track controls with track name', () => {
    render(<AudioTrackControls {...defaultProps} />);
    
    expect(screen.getByText('Audio Track 1')).toBeInTheDocument();
  });

  it('renders control buttons', () => {
    render(<AudioTrackControls {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders sliders for controls', () => {
    render(<AudioTrackControls {...defaultProps} />);
    
    const sliders = document.querySelectorAll('[role="slider"]');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('renders switches for toggles', () => {
    render(<AudioTrackControls {...defaultProps} />);
    
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
  });

  it('renders with noise reduction enabled', () => {
    const settings = {
      ...DEFAULT_AUDIO_TRACK_SETTINGS,
      noiseReduction: true,
    };
    
    render(<AudioTrackControls {...defaultProps} settings={settings} />);
    expect(screen.getByText('Audio Track 1')).toBeInTheDocument();
  });

  it('renders with compressor enabled', () => {
    const settings = {
      ...DEFAULT_AUDIO_TRACK_SETTINGS,
      compressor: true,
    };
    
    render(<AudioTrackControls {...defaultProps} settings={settings} />);
    expect(screen.getByText('Audio Track 1')).toBeInTheDocument();
  });
});
