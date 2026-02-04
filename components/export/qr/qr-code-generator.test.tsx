/**
 * Tests for QRCodeGenerator Component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRCodeGenerator } from './qr-code-generator';
import { downloadQR, copyQRToClipboard } from '@/lib/export/qr';
import { toast } from 'sonner';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      qrCodeFailed: 'Failed to generate QR code',
      qrDownloadPNG: 'PNG downloaded',
      qrDownloadSVG: 'SVG downloaded',
      exportFailed: 'Export failed',
      qrCopySuccess: 'QR code copied',
      copyFailed: 'Copy failed',
      copied: 'Copied',
      copyImageBtn: 'Copy Image',
      qrPreset: 'Style',
      qrSize: 'Size',
      qrLogo: 'Logo',
      qrAddLogo: 'Add Logo',
      qrChangeLogo: 'Change',
    };
    return translations[key] || key;
  },
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock QR code generation functions
jest.mock('@/lib/export/qr', () => ({
  createQRInstance: jest.fn(() => ({
    append: jest.fn(),
    getRawData: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  })),
  downloadQR: jest.fn().mockResolvedValue(undefined),
  copyQRToClipboard: jest.fn().mockResolvedValue(true),
  QR_PRESETS: [
    {
      id: 'default',
      name: 'Default',
      nameZh: '默认',
      dotsType: 'square',
      cornersSquareType: 'square',
      cornersDotType: 'square',
      colors: {
        dots: '#000000',
        cornersSquare: '#000000',
        cornersDot: '#000000',
        background: '#ffffff',
      },
    },
    {
      id: 'wechat',
      name: 'WeChat',
      nameZh: '微信',
      dotsType: 'rounded',
      cornersSquareType: 'extra-rounded',
      cornersDotType: 'dot',
      colors: {
        dots: '#07c160',
        cornersSquare: '#07c160',
        cornersDot: '#07c160',
        background: '#ffffff',
      },
    },
    {
      id: 'cognia',
      name: 'Cognia',
      nameZh: 'Cognia',
      dotsType: 'classy-rounded',
      cornersSquareType: 'extra-rounded',
      cornersDotType: 'dot',
      colors: {
        dots: '#6366f1',
        cornersSquare: '#4f46e5',
        cornersDot: '#4338ca',
        background: '#ffffff',
      },
    },
  ],
}));

describe('QRCodeGenerator', () => {
  const defaultProps = {
    data: 'https://example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<QRCodeGenerator {...defaultProps} />);
      expect(screen.getByRole('button', { name: /png/i })).toBeInTheDocument();
    });

    it('should render download buttons by default', () => {
      render(<QRCodeGenerator {...defaultProps} />);
      expect(screen.getByRole('button', { name: /png/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /svg/i })).toBeInTheDocument();
    });

    it('should render copy button by default', () => {
      render(<QRCodeGenerator {...defaultProps} />);
      expect(screen.getByRole('button', { name: /copy image/i })).toBeInTheDocument();
    });

    it('should render preset selector by default', () => {
      render(<QRCodeGenerator {...defaultProps} />);
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    it('should hide download buttons when showDownload is false', () => {
      render(<QRCodeGenerator {...defaultProps} showDownload={false} />);
      expect(screen.queryByRole('button', { name: /png/i })).not.toBeInTheDocument();
    });

    it('should hide copy button when showCopy is false', () => {
      render(<QRCodeGenerator {...defaultProps} showCopy={false} />);
      expect(screen.queryByRole('button', { name: /copy image/i })).not.toBeInTheDocument();
    });

    it('should hide preset selector when showPresetSelector is false', () => {
      render(<QRCodeGenerator {...defaultProps} showPresetSelector={false} />);
      expect(screen.queryByText('Style')).not.toBeInTheDocument();
    });
  });

  describe('Download functionality', () => {
    it('should call downloadQR when PNG button is clicked', async () => {
      render(<QRCodeGenerator {...defaultProps} />);

      const pngButton = screen.getByRole('button', { name: /png/i });
      fireEvent.click(pngButton);

      await waitFor(() => {
        expect(downloadQR).toHaveBeenCalled();
      });
    });

    it('should call downloadQR when SVG button is clicked', async () => {
      render(<QRCodeGenerator {...defaultProps} />);

      const svgButton = screen.getByRole('button', { name: /svg/i });
      fireEvent.click(svgButton);

      await waitFor(() => {
        expect(downloadQR).toHaveBeenCalled();
      });
    });
  });

  describe('Copy functionality', () => {
    it('should call copyQRToClipboard when copy button is clicked', async () => {
      render(<QRCodeGenerator {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy image/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(copyQRToClipboard).toHaveBeenCalled();
      });
    });

    it('should show success message after copying', async () => {
      render(<QRCodeGenerator {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy image/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('QR code copied');
      });
    });
  });

  describe('Props handling', () => {
    it('should use default preset', () => {
      render(<QRCodeGenerator {...defaultProps} defaultPreset="default" />);
      // Component should render without errors
      expect(screen.getByRole('button', { name: /png/i })).toBeInTheDocument();
    });

    it('should use custom preset', () => {
      render(<QRCodeGenerator {...defaultProps} defaultPreset="wechat" />);
      expect(screen.getByRole('button', { name: /png/i })).toBeInTheDocument();
    });

    it('should use custom width', () => {
      render(<QRCodeGenerator {...defaultProps} defaultWidth={512} />);
      expect(screen.getByRole('button', { name: /png/i })).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <QRCodeGenerator {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should call onGenerated callback', async () => {
      const onGenerated = jest.fn();
      render(<QRCodeGenerator {...defaultProps} onGenerated={onGenerated} />);

      await waitFor(() => {
        expect(onGenerated).toHaveBeenCalled();
      });
    });
  });

  describe('Size selector', () => {
    it('should show size selector when showSizeSelector is true', () => {
      render(<QRCodeGenerator {...defaultProps} showSizeSelector />);
      expect(screen.getByText(/size/i)).toBeInTheDocument();
    });

    it('should hide size selector by default', () => {
      render(<QRCodeGenerator {...defaultProps} />);
      expect(screen.queryByText(/256px/i)).not.toBeInTheDocument();
    });
  });

  describe('Logo upload', () => {
    it('should show logo upload when showLogoUpload is true', () => {
      render(<QRCodeGenerator {...defaultProps} showLogoUpload />);
      expect(screen.getByText('Logo')).toBeInTheDocument();
    });

    it('should hide logo upload by default', () => {
      render(<QRCodeGenerator {...defaultProps} />);
      expect(screen.queryByText('Add Logo')).not.toBeInTheDocument();
    });

    it('should show Add Logo button initially', () => {
      render(<QRCodeGenerator {...defaultProps} showLogoUpload />);
      expect(screen.getByRole('button', { name: /add logo/i })).toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('should disable buttons when data is empty', () => {
      render(<QRCodeGenerator data="" />);
      const pngButton = screen.getByRole('button', { name: /png/i });
      expect(pngButton).toBeDisabled();
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator during generation', async () => {
      render(<QRCodeGenerator {...defaultProps} />);
      // The component should handle loading state internally
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /png/i })).not.toBeDisabled();
      });
    });
  });
});
