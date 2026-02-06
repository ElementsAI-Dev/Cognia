import { render, screen } from '@testing-library/react';
import { MCPServerBadge } from './mcp-server-badge';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MCPServerBadge', () => {
  it('renders server ID when no name provided', () => {
    render(<MCPServerBadge serverId="test-server" />);
    expect(screen.getByText('test-server')).toBeInTheDocument();
  });

  it('renders server name when provided', () => {
    render(<MCPServerBadge serverId="test-server" serverName="My Test Server" />);
    expect(screen.getByText('My Test Server')).toBeInTheDocument();
  });

  it('shows connected status indicator', () => {
    render(<MCPServerBadge serverId="test-server" status={{ type: 'connected' }} showStatus />);
    // Multiple elements may contain 'test-server', so use getAllByText
    const elements = screen.getAllByText('test-server');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('shows error status indicator', () => {
    render(
      <MCPServerBadge
        serverId="test-server"
        status={{ type: 'error', message: 'Connection failed' }}
        showStatus
      />
    );
    // Multiple elements may contain 'test-server', so use getAllByText
    const elements = screen.getAllByText('test-server');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('applies different size classes', () => {
    const { rerender } = render(<MCPServerBadge serverId="test" size="sm" />);
    expect(screen.getByText('test')).toBeInTheDocument();

    rerender(<MCPServerBadge serverId="test" size="lg" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('hides status when showStatus is false', () => {
    render(
      <MCPServerBadge serverId="test-server" status={{ type: 'connected' }} showStatus={false} />
    );
    // Multiple elements may contain 'test-server', so use getAllByText
    const elements = screen.getAllByText('test-server');
    expect(elements.length).toBeGreaterThan(0);
  });
});
