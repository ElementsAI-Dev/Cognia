/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ToolCallResult } from '@/types/mcp';

const mockHasMcpAppResource = jest.fn();
const mockIsMcpAppsHostEnabled = jest.fn();
const mockMcpAppHostRender = jest.fn();

jest.mock('@/components/mcp/mcp-app-host', () => ({
  MCPAppHost: (props: Record<string, unknown>) => {
    mockMcpAppHostRender(props);
    return <div data-testid="mcp-app-host">MCP App Host</div>;
  },
  hasMcpAppResource: (result: ToolCallResult) => mockHasMcpAppResource(result),
  isMcpAppsHostEnabled: () => mockIsMcpAppsHostEnabled(),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/a2ui', () => ({
  A2UIToolOutput: () => <div data-testid="a2ui-tool-output">A2UI Tool Output</div>,
  A2UIStructuredOutput: ({ messages }: { messages: unknown[] }) => (
    <div data-testid="a2ui-structured-output">{messages.length} A2UI messages</div>
  ),
  hasA2UIToolOutput: jest.fn(() => false),
}));

jest.mock('@/lib/a2ui/parser', () => ({
  parseA2UIInput: jest.fn(() => ({ surfaceId: null, messages: [], errors: [] })),
}));

import { ToolResultDisplay } from './tool-result-display';

describe('ToolResultDisplay MCP Apps integration', () => {
  const appResourceResult: ToolCallResult = {
    content: [
      {
        type: 'resource',
        resource: {
          uri: 'ui://widget/test.html',
          mimeType: 'text/html;profile=mcp-app',
          text: '<html><body>app</body></html>',
        },
      },
    ],
    isError: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MCPAppHost when feature is enabled and app resource is present', () => {
    mockIsMcpAppsHostEnabled.mockReturnValue(true);
    mockHasMcpAppResource.mockReturnValue(true);

    render(
      <ToolResultDisplay
        serverId="server-1"
        toolName="tool-1"
        result={appResourceResult}
        toolInput={{ q: 'query' }}
      />
    );

    expect(screen.getByTestId('mcp-app-host')).toBeInTheDocument();
    expect(mockMcpAppHostRender).toHaveBeenCalled();
    expect(mockMcpAppHostRender.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        serverId: 'server-1',
        toolName: 'tool-1',
        toolInput: { q: 'query' },
      })
    );
  });

  it('falls back to legacy resource rendering when feature flag is disabled', () => {
    mockIsMcpAppsHostEnabled.mockReturnValue(false);
    mockHasMcpAppResource.mockReturnValue(true);

    render(
      <ToolResultDisplay
        serverId="server-1"
        toolName="tool-1"
        result={appResourceResult}
      />
    );

    expect(screen.queryByTestId('mcp-app-host')).not.toBeInTheDocument();
    expect(screen.getByText('Resource: ui://widget/test.html')).toBeInTheDocument();
  });
});

