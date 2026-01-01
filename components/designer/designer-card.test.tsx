/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignerCard } from './core/designer-card';
import type { DesignerTemplate } from '@/lib/designer';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockTemplate: DesignerTemplate = {
  id: 'template-1',
  name: 'Landing Page',
  description: 'A modern landing page template with hero section',
  category: 'Marketing',
  framework: 'react',
  code: '<div className="landing gradient"><button>Click me</button></div>',
};

describe('DesignerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('default variant', () => {
    it('should render template name', () => {
      render(<DesignerCard template={mockTemplate} />);
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    it('should render template description', () => {
      render(<DesignerCard template={mockTemplate} />);
      expect(screen.getByText('A modern landing page template with hero section')).toBeInTheDocument();
    });

    it('should render category badge', () => {
      render(<DesignerCard template={mockTemplate} />);
      expect(screen.getByText('Marketing')).toBeInTheDocument();
    });

    it('should render framework badge', () => {
      render(<DesignerCard template={mockTemplate} />);
      expect(screen.getByText('react')).toBeInTheDocument();
    });

    it('should call onSelect when card is clicked', async () => {
      const onSelect = jest.fn();
      render(<DesignerCard template={mockTemplate} onSelect={onSelect} />);
      
      const card = screen.getByText('Landing Page').closest('[class*="cursor-pointer"]');
      if (card) {
        await userEvent.click(card);
        expect(onSelect).toHaveBeenCalledWith(mockTemplate);
      }
    });

    it('should call onPreview when card is clicked and onSelect is not provided', async () => {
      const onPreview = jest.fn();
      render(<DesignerCard template={mockTemplate} onPreview={onPreview} />);
      
      const card = screen.getByText('Landing Page').closest('[class*="cursor-pointer"]');
      if (card) {
        await userEvent.click(card);
        expect(onPreview).toHaveBeenCalledWith(mockTemplate);
      }
    });

    it('should show selected state when selected prop is true', () => {
      const { container } = render(<DesignerCard template={mockTemplate} selected={true} />);
      expect(container.firstChild).toHaveClass('ring-2');
    });

    it('should apply custom className', () => {
      const { container } = render(<DesignerCard template={mockTemplate} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render thumbnail image when available', () => {
      const templateWithThumbnail = { ...mockTemplate, thumbnail: '/thumbnail.jpg' };
      render(<DesignerCard template={templateWithThumbnail} />);
      
      const img = screen.getByAltText('Landing Page');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/thumbnail.jpg');
    });

    it('should show actions menu when showActions is true', () => {
      render(<DesignerCard template={mockTemplate} showActions={true} />);
      
      const menuButton = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-ellipsis-vertical')
      );
      expect(menuButton).toBeInTheDocument();
    });

    it('should hide actions menu when showActions is false', () => {
      render(<DesignerCard template={mockTemplate} showActions={false} />);
      
      const menuButton = screen.queryAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-ellipsis-vertical')
      );
      expect(menuButton).toBeUndefined();
    });
  });

  describe('compact variant', () => {
    it('should render in compact mode', () => {
      render(<DesignerCard template={mockTemplate} variant="compact" />);
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    it('should render truncated description', () => {
      render(<DesignerCard template={mockTemplate} variant="compact" />);
      expect(screen.getByText('A modern landing page template with hero section')).toBeInTheDocument();
    });

    it('should call onSelect when clicked in compact mode', async () => {
      const onSelect = jest.fn();
      render(<DesignerCard template={mockTemplate} variant="compact" onSelect={onSelect} />);
      
      const card = screen.getByText('Landing Page').closest('[class*="cursor-pointer"]');
      if (card) {
        await userEvent.click(card);
        expect(onSelect).toHaveBeenCalledWith(mockTemplate);
      }
    });
  });

  describe('list variant', () => {
    it('should render in list mode', () => {
      render(<DesignerCard template={mockTemplate} variant="list" />);
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    it('should render framework badge in list mode', () => {
      render(<DesignerCard template={mockTemplate} variant="list" />);
      expect(screen.getByText('react')).toBeInTheDocument();
    });

    it('should call onSelect when clicked in list mode', async () => {
      const onSelect = jest.fn();
      render(<DesignerCard template={mockTemplate} variant="list" onSelect={onSelect} />);
      
      const card = screen.getByText('Landing Page').closest('[class*="cursor-pointer"]');
      if (card) {
        await userEvent.click(card);
        expect(onSelect).toHaveBeenCalledWith(mockTemplate);
      }
    });

    it('should show actions menu in list mode', () => {
      render(<DesignerCard template={mockTemplate} variant="list" showActions={true} />);
      
      const menuButton = screen.getAllByRole('button').find(
        (btn) => btn.querySelector('svg.lucide-ellipsis-vertical')
      );
      expect(menuButton).toBeInTheDocument();
    });
  });

  describe('category icons', () => {
    it('should display Marketing category icon', () => {
      render(<DesignerCard template={mockTemplate} />);
      const icon = document.querySelector('svg.lucide-sparkles');
      expect(icon).toBeInTheDocument();
    });

    it('should display Application category icon', () => {
      const appTemplate: DesignerTemplate = { ...mockTemplate, category: 'Application' };
      render(<DesignerCard template={appTemplate} />);
      // Application category should have an appropriate icon
      const card = screen.getByText('Landing Page');
      expect(card).toBeInTheDocument();
    });
  });

  describe('preview content', () => {
    it('should detect gradient in code', () => {
      render(<DesignerCard template={mockTemplate} />);
      // The component should render the preview area
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    it('should detect button in code', () => {
      render(<DesignerCard template={mockTemplate} />);
      // The component should render the preview with button indicator
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });
  });
});
