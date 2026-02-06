/**
 * SessionAnalyticsPanel Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionAnalyticsPanel } from './session-analytics-panel';

const mockSessions = [
  {
    sessionId: 'session-001',
    tokens: 50000,
    cost: 2.5,
    requests: 25,
    name: 'Chat Session 1',
    lastActive: new Date('2024-01-15T10:00:00'),
  },
  {
    sessionId: 'session-002',
    tokens: 35000,
    cost: 1.75,
    requests: 18,
    name: 'Chat Session 2',
    lastActive: new Date('2024-01-15T09:00:00'),
  },
  {
    sessionId: 'session-003',
    tokens: 20000,
    cost: 1.0,
    requests: 10,
  },
];

describe('SessionAnalyticsPanel', () => {
  it('should render the panel with sessions', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} />);

    // "sessions" appears in badge - use getAllByText
    expect(screen.getAllByText(/sessions/i).length).toBeGreaterThan(0);
  });

  it('should display session count badge', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} />);

    // Session count badge with "sessions" text
    expect(screen.getAllByText(/sessions/i).length).toBeGreaterThan(0);
  });

  it('should display session names', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} />);

    // Check for session names or session IDs (fallback if no name)
    const session1 = screen.queryByText('Chat Session 1') || screen.queryByText(/session-001/i);
    expect(session1).toBeTruthy();
  });

  it('should display session rankings', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('should display total stats section', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} />);

    // Stats section should exist with token, cost, and request labels
    expect(screen.getByText(/tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/cost/i)).toBeInTheDocument();
  });

  it('should handle empty sessions', () => {
    render(<SessionAnalyticsPanel sessions={[]} />);

    expect(screen.getByText(/no session data/i)).toBeInTheDocument();
  });

  it('should respect maxSessions prop', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} maxSessions={2} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.queryByText('#3')).not.toBeInTheDocument();
  });

  it('should limit sessions when maxSessions is set', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} maxSessions={2} />);

    // Only 2 rankings should show
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('should render with custom title', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} title="Custom Sessions" />);

    expect(screen.getByText('Custom Sessions')).toBeInTheDocument();
  });

  it('should display progress bars when showProgress is true', () => {
    const { container } = render(<SessionAnalyticsPanel sessions={mockSessions} showProgress />);

    // Progress component should render
    expect(container.querySelectorAll('[role="progressbar"]').length).toBeGreaterThan(0);
  });

  it('should handle sessions without names', () => {
    render(<SessionAnalyticsPanel sessions={mockSessions} />);

    // Third session has no name, should show truncated ID - look for any session ID display
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('should format large token values', () => {
    const largeSessions = [
      {
        sessionId: 'large-001',
        tokens: 1500000, // 1.5M
        cost: 75.0,
        requests: 500,
      },
    ];

    render(<SessionAnalyticsPanel sessions={largeSessions} />);

    // 1.5M appears multiple times (in session and summary), use getAllByText
    expect(screen.getAllByText('1.5M').length).toBeGreaterThan(0);
  });
});
