/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';

jest.mock('@/components/layout/shell/chat-shell', () => ({
  ChatShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-shell">{children}</div>
  ),
}));

jest.mock('@/components/chat', () => ({
  ChatContainer: () => <div data-testid="chat-container">Chat</div>,
}));

describe('Home Page', () => {
  it('renders the chat container', () => {
    render(<Home />);
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });

  it('delegates layout concerns to ChatShell', () => {
    render(<Home />);

    expect(screen.getByTestId('chat-shell')).toBeInTheDocument();
    expect(screen.getByTestId('chat-container')).toBeInTheDocument();
  });
});
