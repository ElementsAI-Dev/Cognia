import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CameraMotionControls, cameraMotionToPrompt } from './camera-motion-controls';
import type { CameraMotion } from '@/types/video-studio/types';
import { DEFAULT_CAMERA_MOTION } from '@/types/video-studio/types';

jest.mock('../constants', () => ({
  CAMERA_PRESETS: [
    { id: 'static', label: 'Static', icon: '📌', motion: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, zoom: 0, roll: 0 } },
    { id: 'dolly-in', label: 'Dolly In', icon: '🔍', motion: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, zoom: 50, roll: 0 } },
    { id: 'pan-right', label: 'Pan Right', icon: '➡️', motion: { horizontal: 0, vertical: 0, pan: 60, tilt: 0, zoom: 0, roll: 0 } },
  ],
}));

const messages = {
  videoGeneration: {
    cameraMotion: 'Camera Motion',
  },
};

const renderWithProviders = (
  motion: CameraMotion = DEFAULT_CAMERA_MOTION,
  onMotionChange = jest.fn()
) => {
  return {
    onMotionChange,
    ...render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CameraMotionControls motion={motion} onMotionChange={onMotionChange} />
      </NextIntlClientProvider>
    ),
  };
};

describe('CameraMotionControls', () => {
  it('renders camera motion label', () => {
    renderWithProviders();
    expect(screen.getByText('Camera Motion')).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    renderWithProviders();
    expect(screen.getByRole('button', { name: /static/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dolly in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pan right/i })).toBeInTheDocument();
  });

  it('calls onMotionChange when a preset is clicked', () => {
    const onMotionChange = jest.fn();
    renderWithProviders(DEFAULT_CAMERA_MOTION, onMotionChange);

    fireEvent.click(screen.getByRole('button', { name: /dolly in/i }));

    expect(onMotionChange).toHaveBeenCalledWith({
      horizontal: 0, vertical: 0, pan: 0, tilt: 0, zoom: 50, roll: 0,
    });
  });

  it('does not show reset button when motion is default', () => {
    renderWithProviders(DEFAULT_CAMERA_MOTION);
    expect(screen.queryByText('Reset')).not.toBeInTheDocument();
  });

  it('shows reset button when motion is non-default', () => {
    const nonDefault: CameraMotion = { ...DEFAULT_CAMERA_MOTION, pan: 50 };
    renderWithProviders(nonDefault);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onMotionChange with default when reset is clicked', () => {
    const nonDefault: CameraMotion = { ...DEFAULT_CAMERA_MOTION, zoom: 30 };
    const onMotionChange = jest.fn();
    renderWithProviders(nonDefault, onMotionChange);

    fireEvent.click(screen.getByText('Reset'));
    expect(onMotionChange).toHaveBeenCalledWith(DEFAULT_CAMERA_MOTION);
  });

  it('renders axis sliders', () => {
    renderWithProviders();
    expect(screen.getByText('Horizontal')).toBeInTheDocument();
    expect(screen.getByText('Vertical')).toBeInTheDocument();
    expect(screen.getByText('Pan')).toBeInTheDocument();
    expect(screen.getByText('Tilt')).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('Roll')).toBeInTheDocument();
  });
});

describe('cameraMotionToPrompt', () => {
  it('returns empty string for default motion', () => {
    expect(cameraMotionToPrompt(DEFAULT_CAMERA_MOTION)).toBe('');
  });

  it('returns empty string for negligible motion (<=10)', () => {
    const motion: CameraMotion = { horizontal: 5, vertical: -3, pan: 10, tilt: 0, zoom: 0, roll: 0 };
    expect(cameraMotionToPrompt(motion)).toBe('');
  });

  it('describes pan direction', () => {
    const panRight: CameraMotion = { ...DEFAULT_CAMERA_MOTION, pan: 40 };
    const result = cameraMotionToPrompt(panRight);
    expect(result).toContain('pans');
    expect(result).toContain('right');
  });

  it('describes pan left', () => {
    const panLeft: CameraMotion = { ...DEFAULT_CAMERA_MOTION, pan: -40 };
    const result = cameraMotionToPrompt(panLeft);
    expect(result).toContain('pans');
    expect(result).toContain('left');
  });

  it('describes zoom in', () => {
    const zoomIn: CameraMotion = { ...DEFAULT_CAMERA_MOTION, zoom: 70 };
    const result = cameraMotionToPrompt(zoomIn);
    expect(result).toContain('zooms');
    expect(result).toContain('in');
    expect(result).toContain('dramatically');
  });

  it('describes zoom out smoothly', () => {
    const zoomOut: CameraMotion = { ...DEFAULT_CAMERA_MOTION, zoom: -40 };
    const result = cameraMotionToPrompt(zoomOut);
    expect(result).toContain('zooms');
    expect(result).toContain('out');
    expect(result).toContain('smoothly');
  });

  it('describes tilt up', () => {
    const tiltUp: CameraMotion = { ...DEFAULT_CAMERA_MOTION, tilt: 50 };
    const result = cameraMotionToPrompt(tiltUp);
    expect(result).toContain('tilts');
    expect(result).toContain('up');
  });

  it('describes dolly direction', () => {
    const dollyRight: CameraMotion = { ...DEFAULT_CAMERA_MOTION, horizontal: 30 };
    const result = cameraMotionToPrompt(dollyRight);
    expect(result).toContain('dollies');
    expect(result).toContain('right');
  });

  it('describes crane motion', () => {
    const craneUp: CameraMotion = { ...DEFAULT_CAMERA_MOTION, vertical: 20 };
    const result = cameraMotionToPrompt(craneUp);
    expect(result).toContain('cranes');
    expect(result).toContain('up');
  });

  it('describes roll', () => {
    const rollCW: CameraMotion = { ...DEFAULT_CAMERA_MOTION, roll: 30 };
    const result = cameraMotionToPrompt(rollCW);
    expect(result).toContain('rolls');
    expect(result).toContain('clockwise');
  });

  it('combines multiple motions', () => {
    const complex: CameraMotion = { horizontal: 30, vertical: 0, pan: 40, tilt: 0, zoom: 50, roll: 0 };
    const result = cameraMotionToPrompt(complex);
    expect(result).toContain('Camera motion:');
    expect(result).toContain('pans');
    expect(result).toContain('zooms');
    expect(result).toContain('dollies');
  });

  it('prefixes with ". Camera motion:"', () => {
    const motion: CameraMotion = { ...DEFAULT_CAMERA_MOTION, pan: 50 };
    const result = cameraMotionToPrompt(motion);
    expect(result.startsWith('. Camera motion:')).toBe(true);
  });
});
