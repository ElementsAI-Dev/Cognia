import { render, screen } from '@testing-library/react';
import { AlertBlock, parseAlertFromBlockquote } from './alert-block';
import type { AlertType } from './alert-block';

describe('AlertBlock', () => {
  describe('Rendering', () => {
    const alertTypes: AlertType[] = ['note', 'tip', 'important', 'warning', 'caution'];

    it.each(alertTypes)('renders %s alert type correctly', (type) => {
      render(
        <AlertBlock type={type}>
          Test content for {type}
        </AlertBlock>
      );
      
      expect(screen.getByText(`Test content for ${type}`)).toBeInTheDocument();
    });

    it('renders with default title based on type', () => {
      render(<AlertBlock type="note">Content</AlertBlock>);
      expect(screen.getByText('Note')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(
        <AlertBlock type="note" title="Custom Title">
          Content
        </AlertBlock>
      );
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <AlertBlock type="tip">
          <span>Child content</span>
        </AlertBlock>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <AlertBlock type="note" className="custom-class">
          Content
        </AlertBlock>
      );
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Alert type styling', () => {
    it('renders note with blue styling', () => {
      const { container } = render(
        <AlertBlock type="note">Content</AlertBlock>
      );
      expect(container.querySelector('.border-blue-500\\/50')).toBeInTheDocument();
    });

    it('renders tip with green styling', () => {
      const { container } = render(
        <AlertBlock type="tip">Content</AlertBlock>
      );
      expect(container.querySelector('.border-green-500\\/50')).toBeInTheDocument();
    });

    it('renders important with purple styling', () => {
      const { container } = render(
        <AlertBlock type="important">Content</AlertBlock>
      );
      expect(container.querySelector('.border-purple-500\\/50')).toBeInTheDocument();
    });

    it('renders warning with yellow styling', () => {
      const { container } = render(
        <AlertBlock type="warning">Content</AlertBlock>
      );
      expect(container.querySelector('.border-yellow-500\\/50')).toBeInTheDocument();
    });

    it('renders caution with red styling', () => {
      const { container } = render(
        <AlertBlock type="caution">Content</AlertBlock>
      );
      expect(container.querySelector('.border-red-500\\/50')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('renders icon for each alert type', () => {
      const { container } = render(
        <AlertBlock type="note">Content</AlertBlock>
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});

describe('parseAlertFromBlockquote', () => {
  describe('Valid alert syntax', () => {
    it('parses [!NOTE] syntax', () => {
      const result = parseAlertFromBlockquote('[!NOTE]\nThis is a note');
      expect(result).toEqual({
        type: 'note',
        content: 'This is a note',
      });
    });

    it('parses [!TIP] syntax', () => {
      const result = parseAlertFromBlockquote('[!TIP]\nThis is a tip');
      expect(result).toEqual({
        type: 'tip',
        content: 'This is a tip',
      });
    });

    it('parses [!IMPORTANT] syntax', () => {
      const result = parseAlertFromBlockquote('[!IMPORTANT]\nImportant info');
      expect(result).toEqual({
        type: 'important',
        content: 'Important info',
      });
    });

    it('parses [!WARNING] syntax', () => {
      const result = parseAlertFromBlockquote('[!WARNING]\nWarning message');
      expect(result).toEqual({
        type: 'warning',
        content: 'Warning message',
      });
    });

    it('parses [!CAUTION] syntax', () => {
      const result = parseAlertFromBlockquote('[!CAUTION]\nCaution message');
      expect(result).toEqual({
        type: 'caution',
        content: 'Caution message',
      });
    });

    it('is case insensitive', () => {
      const result = parseAlertFromBlockquote('[!note]\nLowercase note');
      expect(result).toEqual({
        type: 'note',
        content: 'Lowercase note',
      });
    });

    it('handles multiline content', () => {
      const result = parseAlertFromBlockquote('[!NOTE]\nLine 1\nLine 2\nLine 3');
      expect(result).toEqual({
        type: 'note',
        content: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('handles whitespace before alert marker', () => {
      const result = parseAlertFromBlockquote('  [!NOTE]\nContent');
      expect(result).toEqual({
        type: 'note',
        content: 'Content',
      });
    });
  });

  describe('Invalid alert syntax', () => {
    it('returns null for regular text', () => {
      const result = parseAlertFromBlockquote('Just regular text');
      expect(result).toBeNull();
    });

    it('returns null for invalid alert type', () => {
      const result = parseAlertFromBlockquote('[!INVALID]\nContent');
      expect(result).toBeNull();
    });

    it('returns null for incomplete syntax', () => {
      const result = parseAlertFromBlockquote('[!NOTE');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseAlertFromBlockquote('');
      expect(result).toBeNull();
    });
  });
});
