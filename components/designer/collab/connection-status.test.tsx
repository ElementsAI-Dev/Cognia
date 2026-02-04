/**
 * Tests for CollabConnectionStatus component
 */

import { render, screen } from '@testing-library/react';
import { CollabConnectionStatus } from './connection-status';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      connected: 'Connected',
      connecting: 'Connecting',
      reconnecting: 'Reconnecting',
      disconnected: 'Disconnected',
      connectionError: 'Connection Error',
      connectionErrorHint: 'Check your network connection',
      participantsOnline: `${params?.count} participants online`,
    };
    return translations[key] || key;
  },
}));

describe('CollabConnectionStatus', () => {
  it('should render connected state', () => {
    render(<CollabConnectionStatus state="connected" />);

    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
  });

  it('should render connecting state', () => {
    render(<CollabConnectionStatus state="connecting" />);

    expect(screen.getAllByText('Connecting').length).toBeGreaterThan(0);
  });

  it('should render reconnecting state', () => {
    render(<CollabConnectionStatus state="reconnecting" />);

    expect(screen.getAllByText('Reconnecting').length).toBeGreaterThan(0);
  });

  it('should render disconnected state', () => {
    render(<CollabConnectionStatus state="disconnected" />);

    expect(screen.getAllByText('Disconnected').length).toBeGreaterThan(0);
  });

  it('should render error state', () => {
    render(<CollabConnectionStatus state="error" />);

    expect(screen.getAllByText('Connection Error').length).toBeGreaterThan(0);
  });

  it('should show participant count when connected', () => {
    render(<CollabConnectionStatus state="connected" participantCount={5} />);

    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('should not show participant count when disconnected', () => {
    render(<CollabConnectionStatus state="disconnected" participantCount={5} />);

    expect(screen.queryByText('(5)')).not.toBeInTheDocument();
  });

  it('should hide label when showLabel is false', () => {
    const { container } = render(<CollabConnectionStatus state="connected" showLabel={false} />);

    // Badge should not contain the label text directly (only in tooltip)
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.textContent).not.toContain('Connected');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CollabConnectionStatus state="connected" className="custom-class" />
    );

    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).toHaveClass('custom-class');
  });

  it('should use different sizes', () => {
    const { rerender, container } = render(
      <CollabConnectionStatus state="connected" size="sm" />
    );
    expect(container.querySelector('.h-3')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="connected" size="md" />);
    expect(container.querySelector('.h-4')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="connected" size="lg" />);
    expect(container.querySelector('.h-5')).toBeInTheDocument();
  });

  it('should show spinning animation for connecting states', () => {
    const { container, rerender } = render(
      <CollabConnectionStatus state="connecting" />
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="reconnecting" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should not show animation for stable states', () => {
    const { container, rerender } = render(
      <CollabConnectionStatus state="connected" />
    );

    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();

    rerender(<CollabConnectionStatus state="disconnected" />);
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  it('should apply correct color classes for each state', () => {
    const { container, rerender } = render(
      <CollabConnectionStatus state="connected" />
    );
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="connecting" />);
    expect(container.querySelector('.text-yellow-600')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="reconnecting" />);
    expect(container.querySelector('.text-orange-600')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="error" />);
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();

    rerender(<CollabConnectionStatus state="disconnected" />);
    expect(container.querySelector('.text-muted-foreground')).toBeInTheDocument();
  });
});
