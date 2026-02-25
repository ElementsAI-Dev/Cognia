/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/layout/shell/chat-shell', () => ({
  ChatShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chat-shell">{children}</div>
  ),
}));

import ChatLayout from './layout';

describe('ChatLayout', () => {
  it('renders children inside ChatShell', () => {
    render(
      <ChatLayout>
        <div data-testid="child">chat child</div>
      </ChatLayout>
    );

    expect(screen.getByTestId('chat-shell')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
