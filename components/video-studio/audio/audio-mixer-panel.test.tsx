import { render, screen } from '@testing-library/react';
import { AudioMixerPanel, type AudioTrack } from './audio-mixer-panel';

const mockTracks: AudioTrack[] = [
  {
    id: 'track-1',
    name: 'Main Audio',
    type: 'audio',
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    level: 0.7,
  },
  {
    id: 'track-2',
    name: 'Background Music',
    type: 'music',
    volume: 0.5,
    pan: -0.3,
    muted: false,
    solo: false,
    level: 0.5,
  },
];

describe('AudioMixerPanel', () => {
  const defaultProps = {
    tracks: mockTracks,
    masterVolume: 1,
    masterMuted: false,
    onTrackVolumeChange: jest.fn(),
    onTrackPanChange: jest.fn(),
    onTrackMuteToggle: jest.fn(),
    onTrackSoloToggle: jest.fn(),
    onMasterVolumeChange: jest.fn(),
    onMasterMuteToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders audio mixer panel with tracks', () => {
    render(<AudioMixerPanel {...defaultProps} />);
    
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('Main Audio')).toBeInTheDocument();
    expect(screen.getByText('Background Music')).toBeInTheDocument();
  });

  it('renders master volume control', () => {
    render(<AudioMixerPanel {...defaultProps} />);
    
    expect(screen.getByText('master')).toBeInTheDocument();
  });

  it('displays empty state when no tracks', () => {
    render(<AudioMixerPanel {...defaultProps} tracks={[]} />);
    
    expect(screen.getByText('noTracks')).toBeInTheDocument();
  });

  it('renders track control buttons', () => {
    render(<AudioMixerPanel {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with muted track', () => {
    const mutedTracks: AudioTrack[] = [
      { ...mockTracks[0], muted: true },
      mockTracks[1],
    ];
    
    render(<AudioMixerPanel {...defaultProps} tracks={mutedTracks} />);
    expect(screen.getByText('Main Audio')).toBeInTheDocument();
  });

  it('renders with solo track', () => {
    const soloTracks: AudioTrack[] = [
      { ...mockTracks[0], solo: true },
      mockTracks[1],
    ];
    
    render(<AudioMixerPanel {...defaultProps} tracks={soloTracks} />);
    expect(screen.getByText('Main Audio')).toBeInTheDocument();
  });
});
