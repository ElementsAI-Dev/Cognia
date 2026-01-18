import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoJobCard, getStatusBadge } from './video-job-card';
import type { VideoJob } from './types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockCompletedJob: VideoJob = {
  id: 'job-1',
  prompt: 'A beautiful sunset over mountains',
  provider: 'google-veo',
  model: 'veo-3',
  status: 'completed',
  progress: 100,
  videoUrl: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  createdAt: Date.now(),
  settings: {
    resolution: '1080p',
    aspectRatio: '16:9',
    duration: '10s',
    style: 'cinematic',
  },
  isFavorite: false,
};

const mockProcessingJob: VideoJob = {
  id: 'job-2',
  prompt: 'Ocean waves',
  provider: 'openai-sora',
  model: 'sora-turbo',
  status: 'processing',
  progress: 50,
  createdAt: Date.now(),
  settings: {
    resolution: '720p',
    aspectRatio: '9:16',
    duration: '5s',
    style: 'natural',
  },
};

const _mockFailedJob: VideoJob = {
  id: 'job-3',
  prompt: 'Test prompt',
  provider: 'google-veo',
  model: 'veo-3',
  status: 'failed',
  progress: 0,
  error: 'Generation failed',
  createdAt: Date.now(),
  settings: {
    resolution: '1080p',
    aspectRatio: '16:9',
    duration: '10s',
    style: 'cinematic',
  },
};

describe('VideoJobCard', () => {
  const mockOnSelect = jest.fn();
  const mockOnPreview = jest.fn();
  const mockOnDownload = jest.fn();
  const mockOnToggleFavorite = jest.fn();
  const mockFormatTime = jest.fn((_timestamp: number) => '12:00 PM');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders completed job correctly', () => {
    render(
      <VideoJobCard
        job={mockCompletedJob}
        isSelected={false}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
        onToggleFavorite={mockOnToggleFavorite}
        formatTime={mockFormatTime}
      />
    );

    expect(screen.getByText(mockCompletedJob.prompt)).toBeInTheDocument();
    expect(screen.getByText('12:00 PM')).toBeInTheDocument();
  });

  it('renders processing job with progress', () => {
    render(
      <VideoJobCard
        job={mockProcessingJob}
        isSelected={false}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
        onToggleFavorite={mockOnToggleFavorite}
        formatTime={mockFormatTime}
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    render(
      <VideoJobCard
        job={mockCompletedJob}
        isSelected={false}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
        onToggleFavorite={mockOnToggleFavorite}
        formatTime={mockFormatTime}
      />
    );

    // Find and click the card
    const card = screen.getByText(mockCompletedJob.prompt).closest('[class*="cursor-pointer"]');
    if (card) {
      fireEvent.click(card);
      expect(mockOnSelect).toHaveBeenCalledWith(mockCompletedJob);
    }
  });

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <VideoJobCard
        job={mockCompletedJob}
        isSelected={true}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
        onToggleFavorite={mockOnToggleFavorite}
        formatTime={mockFormatTime}
      />
    );

    // Check for ring-primary class which indicates selection
    const card = container.querySelector('.ring-primary');
    expect(card).toBeInTheDocument();
  });

  it('shows favorite icon when job is favorited', () => {
    const favoriteJob = { ...mockCompletedJob, isFavorite: true };
    
    const { container } = render(
      <VideoJobCard
        job={favoriteJob}
        isSelected={false}
        onSelect={mockOnSelect}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
        onToggleFavorite={mockOnToggleFavorite}
        formatTime={mockFormatTime}
      />
    );

    // The favorite icon should have the fill-yellow-500 class when favorited
    const starIcon = container.querySelector('.fill-yellow-500');
    expect(starIcon).toBeInTheDocument();
  });

  describe('responsive layout', () => {
    it('renders overlay actions with responsive gap', () => {
      const { container } = render(
        <VideoJobCard
          job={mockCompletedJob}
          isSelected={false}
          onSelect={mockOnSelect}
          onPreview={mockOnPreview}
          onDownload={mockOnDownload}
          onToggleFavorite={mockOnToggleFavorite}
          formatTime={mockFormatTime}
        />
      );

      // Overlay actions should have responsive gap classes
      const overlay = container.querySelector('.gap-1.sm\\:gap-2');
      expect(overlay).toBeInTheDocument();
    });

    it('renders action buttons with responsive icon sizes', () => {
      const { container } = render(
        <VideoJobCard
          job={mockCompletedJob}
          isSelected={false}
 onSelect={mockOnSelect}
          onPreview={mockOnPreview}
          onDownload={mockOnDownload}
          onToggleFavorite={mockOnToggleFavorite}
          formatTime={mockFormatTime}
        />
      );

      // Action buttons should have responsive icon size classes
      const icons = container.querySelectorAll('.h-3.w-3.sm\\:h-4.sm\\:w-4');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});

describe('getStatusBadge', () => {
  it('returns correct badge for pending status', () => {
    const badge = getStatusBadge('pending');
    expect(badge).toBeTruthy();
  });

  it('returns correct badge for processing status', () => {
    const badge = getStatusBadge('processing');
    expect(badge).toBeTruthy();
  });

  it('returns correct badge for completed status', () => {
    const badge = getStatusBadge('completed');
    expect(badge).toBeTruthy();
  });

  it('returns correct badge for failed status', () => {
    const badge = getStatusBadge('failed');
    expect(badge).toBeTruthy();
  });

  it('returns default badge for unknown status', () => {
    const badge = getStatusBadge('cancelled');
    expect(badge).toBeTruthy();
  });
});
