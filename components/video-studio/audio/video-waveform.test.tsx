'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoWaveform } from './video-waveform';
import type { WaveformData } from './video-waveform';

const mockData: WaveformData = {
  peaks: [0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.2],
  duration: 10,
  sampleRate: 44100,
};

// Mock canvas context with roundRect
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    fill: jest.fn(),
    scale: jest.fn(),
    roundRect: jest.fn(),
    fillStyle: '',
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('VideoWaveform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container', () => {
    const { container } = render(
      <VideoWaveform data={mockData} currentTime={0} duration={10} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    const { container } = render(
      <VideoWaveform data={mockData} currentTime={0} duration={10} />
    );
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });

  it('shows loading text when isLoading', () => {
    render(<VideoWaveform data={null} currentTime={0} duration={10} isLoading />);
    expect(screen.getByText('Loading waveform...')).toBeInTheDocument();
  });

  it('applies loading animation class', () => {
    const { container } = render(
      <VideoWaveform data={null} currentTime={0} duration={10} isLoading />
    );
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(
      <VideoWaveform data={mockData} currentTime={0} duration={10} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies custom height', () => {
    const { container } = render(
      <VideoWaveform data={mockData} currentTime={0} duration={10} height={100} />
    );
    expect(container.firstChild).toHaveStyle({ height: '100px' });
  });

  it('calls onClick with time when clicked', () => {
    const onClick = jest.fn();
    const { container } = render(
      <VideoWaveform data={mockData} currentTime={0} duration={10} onClick={onClick} />
    );
    fireEvent.click(container.firstChild as Element);
    expect(onClick).toHaveBeenCalled();
  });

  it('handles mouse events for selection', () => {
    const onSelectionChange = jest.fn();
    const { container } = render(
      <VideoWaveform
        data={mockData}
        currentTime={0}
        duration={10}
        onSelectionChange={onSelectionChange}
      />
    );
    const element = container.firstChild as Element;
    fireEvent.mouseDown(element);
    fireEvent.mouseMove(element);
    fireEvent.mouseUp(element);
  });

  it('renders without data', () => {
    const { container } = render(<VideoWaveform data={null} currentTime={0} duration={10} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
