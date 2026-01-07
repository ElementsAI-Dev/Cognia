/**
 * FFmpeg Status Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FFmpegStatus } from './ffmpeg-status';
import { useScreenRecordingStore } from '@/stores/media';

// Mock the stores
jest.mock('@/stores/media', () => ({
  useScreenRecordingStore: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      available: 'FFmpeg Available',
      notAvailable: 'FFmpeg Not Available',
      install: 'Install',
      ffmpegReady: 'FFmpeg Ready',
      ffmpegRequired: 'FFmpeg Required',
      readyDescription: 'Screen recording is ready to use.',
      requiredDescription: 'FFmpeg is required for screen recording. Please install it to enable this feature.',
      installGuide: 'Installation Guide',
      checkAgain: 'Check Again',
      installFFmpeg: 'Install FFmpeg',
      installDescription: 'Follow the instructions below to install FFmpeg on your system.',
      usingWinget: 'Using Winget (Recommended):',
      orChocolatey: 'Or using Chocolatey:',
      usingHomebrew: 'Using Homebrew:',
      usingPackageManager: 'Using your package manager:',
      manualSteps: 'Manual installation:',
      officialDownload: 'Official FFmpeg Download',
      close: 'Close',
      copy: 'Copy',
    };
    return translations[key] || key;
  },
}));

// Mock Tauri utils - default to true
let mockIsTauriValue = true;
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauriValue,
}));

describe('FFmpegStatus', () => {
  const mockStore = {
    ffmpegAvailable: true,
    isInitialized: true,
    checkFfmpeg: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauriValue = true;
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  describe('when in web environment', () => {
    it('should not render anything', () => {
      mockIsTauriValue = false;
      const { container } = render(<FFmpegStatus />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when not initialized', () => {
    it('should not render anything', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        isInitialized: false,
      });

      const { container } = render(<FFmpegStatus />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when FFmpeg is available', () => {
    it('should not render by default', () => {
      const { container } = render(<FFmpegStatus />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when showWhenAvailable is true', () => {
      render(<FFmpegStatus showWhenAvailable />);
      expect(screen.getByText('FFmpeg Ready')).toBeInTheDocument();
    });

    it('should show success alert when available', () => {
      render(<FFmpegStatus showWhenAvailable />);
      expect(screen.getByText('Screen recording is ready to use.')).toBeInTheDocument();
    });
  });

  describe('when FFmpeg is not available', () => {
    beforeEach(() => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        ffmpegAvailable: false,
      });
    });

    it('should render warning alert', () => {
      render(<FFmpegStatus />);
      expect(screen.getByText('FFmpeg Required')).toBeInTheDocument();
    });

    it('should show installation guide button', () => {
      render(<FFmpegStatus />);
      expect(screen.getByText('Installation Guide')).toBeInTheDocument();
    });

    it('should show check again button', () => {
      render(<FFmpegStatus />);
      expect(screen.getByText('Check Again')).toBeInTheDocument();
    });

    it('should call checkFfmpeg when check again is clicked', async () => {
      render(<FFmpegStatus />);
      
      const checkButton = screen.getByText('Check Again');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockStore.checkFfmpeg).toHaveBeenCalled();
      });
    });

    it('should open installation dialog when install guide is clicked', () => {
      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      expect(screen.getByText('Install FFmpeg')).toBeInTheDocument();
      expect(screen.getByText('Follow the instructions below to install FFmpeg on your system.')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should render compact status when FFmpeg is available', () => {
      render(<FFmpegStatus compact showWhenAvailable />);
      expect(screen.getByText('FFmpeg Available')).toBeInTheDocument();
    });

    it('should render compact status when FFmpeg is not available', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        ffmpegAvailable: false,
      });

      render(<FFmpegStatus compact />);
      expect(screen.getByText('FFmpeg Not Available')).toBeInTheDocument();
      expect(screen.getByText('Install')).toBeInTheDocument();
    });

    it('should open dialog when install button is clicked in compact mode', async () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        ffmpegAvailable: false,
      });

      render(<FFmpegStatus compact />);
      
      const installButton = screen.getByText('Install');
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('installation dialog', () => {
    beforeEach(() => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        ffmpegAvailable: false,
      });
    });

    it('should show Windows instructions by default on Windows', () => {
      // Default platform detection should pick Windows
      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      expect(screen.getByText('Windows')).toBeInTheDocument();
      expect(screen.getByText('Using Winget (Recommended):')).toBeInTheDocument();
    });

    it('should have copy buttons for commands', () => {
      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      const copyButtons = screen.getAllByText('Copy');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should copy command to clipboard when copy is clicked', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it('should have official download link', () => {
      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      const downloadLink = screen.getByText('Official FFmpeg Download');
      expect(downloadLink).toHaveAttribute('href', 'https://ffmpeg.org/download.html');
      expect(downloadLink).toHaveAttribute('target', '_blank');
    });

    it('should close dialog when close button is clicked', async () => {
      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Get the Close button from the dialog footer (the visible one, not sr-only)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      // Find the visible Close button (not the sr-only X button)
      const closeButton = closeButtons.find(btn => btn.textContent === 'Close');
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should call checkFfmpeg when check again is clicked in dialog', async () => {
      render(<FFmpegStatus />);
      
      const installButton = screen.getByText('Installation Guide');
      fireEvent.click(installButton);

      // There are two "Check Again" buttons - one in alert and one in dialog
      const checkButtons = screen.getAllByText('Check Again');
      fireEvent.click(checkButtons[1]); // Click the one in dialog

      await waitFor(() => {
        expect(mockStore.checkFfmpeg).toHaveBeenCalled();
      });
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        ffmpegAvailable: false,
      });

      render(<FFmpegStatus className="custom-class" />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-class');
    });
  });
});
