/**
 * Tests for BatchExportDialog component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchExportDialog } from './batch-export-dialog';

describe('BatchExportDialog', () => {
  const mockImages = [
    {
      id: 'img-1',
      url: 'https://example.com/image1.png',
      prompt: 'Test image 1',
      timestamp: Date.now(),
    },
    {
      id: 'img-2',
      url: 'https://example.com/image2.png',
      prompt: 'Test image 2',
      timestamp: Date.now() - 1000,
    },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    images: mockImages,
  };

  describe('Rendering', () => {
    it('should render the dialog when open', () => {
      render(<BatchExportDialog {...defaultProps} />);
      expect(screen.getByText('Export Images')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<BatchExportDialog {...defaultProps} open={false} />);
      expect(screen.queryByText('Export Images')).not.toBeInTheDocument();
    });

    it('should render export and cancel buttons', () => {
      render(<BatchExportDialog {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Image Selection', () => {
    it('should select all images when select all is clicked', async () => {
      const user = userEvent.setup();
      render(<BatchExportDialog {...defaultProps} />);

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      expect(screen.getByText(/2 of 2/)).toBeInTheDocument();
    });

    it('should deselect all images when deselect all is clicked', async () => {
      const user = userEvent.setup();
      render(<BatchExportDialog {...defaultProps} />);

      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);

      const deselectAllButton = screen.getByText('Deselect All');
      await user.click(deselectAllButton);

      expect(screen.getByText(/0 of 2/)).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should handle empty images array', () => {
      render(<BatchExportDialog {...defaultProps} images={[]} />);
      expect(screen.getByText(/0 of 0/)).toBeInTheDocument();
    });

    it('should accept onExport callback', () => {
      const onExport = jest.fn();
      const { container } = render(<BatchExportDialog {...defaultProps} onExport={onExport} />);
      expect(container).toBeInTheDocument();
    });
  });
});
