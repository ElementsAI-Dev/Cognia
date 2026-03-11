/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ToolCallResult } from '@/types/mcp';
import {
  MCPAppHost,
  extractPolicy,
  hasMcpAppResource,
  injectCsp,
  isExternalLinkAllowed,
  isMcpAppsHostEnabled,
  isMessageOriginAllowed,
  normalizeOrigins,
} from './mcp-app-host';

const mockCallToolFromUi = jest.fn();
const mockFrameWindow = {
  postMessage: jest.fn(),
};

jest.mock('@/stores/mcp', () => ({
  useMcpStore: {
    getState: () => ({
      callToolFromUi: mockCallToolFromUi,
    }),
  },
}));

const appResult: ToolCallResult = {
  content: [
    {
      type: 'resource',
      resource: {
        uri: 'ui://widget/tool.html',
        mimeType: 'text/html;profile=mcp-app',
        text: '<html><head></head><body><h1>Widget</h1></body></html>',
      },
    },
  ],
  structuredContent: { status: 'ok' },
  _meta: {
    'openai/widgetSessionId': 'session-1',
    ui: {
      csp: {
        connectDomains: ['https://api.example.com'],
        resourceDomains: ['https://cdn.example.com'],
        frameDomains: ['https://widget.example.com'],
      },
      domain: 'https://widget.example.com',
    },
    'openai/widgetCSP': {
      redirect_domains: ['https://safe.example.com'],
    },
  },
  isError: false,
};

describe('mcp-app-host helpers', () => {
  const originalFlag = process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST = 'true';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST = originalFlag;
  });

  it('detects feature flag state', () => {
    expect(isMcpAppsHostEnabled()).toBe(true);
    process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST = 'false';
    expect(isMcpAppsHostEnabled()).toBe(false);
  });

  it('detects MCP app resource from tool result', () => {
    expect(hasMcpAppResource(appResult)).toBe(true);
    expect(
      hasMcpAppResource({
        content: [{ type: 'text', text: 'plain text' }],
        isError: false,
      })
    ).toBe(false);
  });

  it('normalizes origin lists with wildcard passthrough and malformed filtering', () => {
    expect(
      normalizeOrigins([
        'https://api.example.com/v1/path',
        'https://*.example.com',
        'not-a-url',
      ])
    ).toEqual(['https://api.example.com', 'https://*.example.com']);
  });

  it('extracts policy from _meta ui/openai fields', () => {
    const policy = extractPolicy(appResult);
    expect(policy.connectDomains).toContain('https://api.example.com');
    expect(policy.resourceDomains).toContain('https://cdn.example.com');
    expect(policy.frameDomains).toContain('https://widget.example.com');
    expect(policy.redirectDomains).toContain('https://safe.example.com');
    expect(policy.widgetDomain).toBe('https://widget.example.com');
  });

  it('injects CSP meta into html head', () => {
    const html = '<html><head><title>x</title></head><body>ok</body></html>';
    const withCsp = injectCsp(html, extractPolicy(appResult));
    expect(withCsp).toContain('Content-Security-Policy');
    expect(withCsp).toContain('connect-src https://api.example.com');
  });

  it('validates bridge message origin and external links against allowlists', () => {
    const policy = extractPolicy(appResult);
    expect(isMessageOriginAllowed('null', policy)).toBe(true);
    expect(isMessageOriginAllowed('https://widget.example.com', policy)).toBe(true);
    expect(isMessageOriginAllowed('https://evil.example.com', policy)).toBe(false);

    expect(isExternalLinkAllowed('https://safe.example.com/path', policy)).toBe(true);
    expect(isExternalLinkAllowed('https://evil.example.com/path', policy)).toBe(false);
    expect(isExternalLinkAllowed('javascript:alert(1)', policy)).toBe(false);
  });
});

describe('MCPAppHost runtime', () => {
  const originalFlag = process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST;
  const originalOpen = window.open;

  beforeAll(() => {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      configurable: true,
      get: () => mockFrameWindow as unknown as Window,
    });
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST = 'true';
    mockCallToolFromUi.mockReset();
    mockFrameWindow.postMessage.mockReset();
    window.open = jest.fn();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_ENABLE_MCP_APPS_HOST = originalFlag;
    window.open = originalOpen;
  });

  it('renders iframe host for valid app resource and sends init notifications', () => {
    render(<MCPAppHost serverId="server-a" toolName="tool-a" result={appResult} />);
    const iframe = screen.getByTitle('mcp-app-server-a-tool-a') as HTMLIFrameElement;

    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toBe(
      'allow-scripts allow-forms allow-popups allow-modals allow-downloads'
    );

    fireEvent.load(iframe);
    expect(mockFrameWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'ui/initialize',
      }),
      '*'
    );
  });

  it('routes allowed tools/call bridge requests through backend command', async () => {
    mockCallToolFromUi.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'done' }],
      isError: false,
    });

    render(<MCPAppHost serverId="server-a" toolName="tool-a" result={appResult} />);
    const iframe = screen.getByTitle('mcp-app-server-a-tool-a');
    fireEvent.load(iframe);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://widget.example.com',
        source: mockFrameWindow as unknown as MessageEventSource,
        data: {
          jsonrpc: '2.0',
          id: 'req-1',
          method: 'tools/call',
          params: {
            sessionId: 'session-1',
            name: 'read_file',
            arguments: { path: '/tmp/a.txt' },
          },
        },
      })
    );

    await waitFor(() => {
      expect(mockCallToolFromUi).toHaveBeenCalledWith(
        'server-a',
        'session-1',
        'https://widget.example.com',
        'read_file',
        { path: '/tmp/a.txt' },
        'req-1'
      );
    });
  });

  it('rejects disallowed bridge origin with a visible error', async () => {
    render(<MCPAppHost serverId="server-a" toolName="tool-a" result={appResult} />);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example.com',
        source: mockFrameWindow as unknown as MessageEventSource,
        data: {
          jsonrpc: '2.0',
          id: 'req-2',
          method: 'ui/message',
          params: { sessionId: 'session-1' },
        },
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Blocked bridge message from disallowed origin/i)
      ).toBeInTheDocument();
    });
  });
});

