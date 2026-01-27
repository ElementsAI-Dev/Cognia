/**
 * Tests for A2UI Message Renderer
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  A2UIMessageRenderer,
  hasA2UIContent,
  useA2UIMessageIntegration,
} from './a2ui-message-renderer';

// Mock useA2UI hook
const mockExtractAndProcess = jest.fn();
const mockGetSurface = jest.fn();
const mockProcessMessage = jest.fn();

jest.mock('@/hooks/a2ui', () => ({
  useA2UI: jest.fn(() => ({
    extractAndProcess: mockExtractAndProcess,
    getSurface: mockGetSurface,
    processMessage: mockProcessMessage,
    processMessages: jest.fn(),
    createSurface: jest.fn(),
    deleteSurface: jest.fn(),
  })),
}));

// Mock parser functions
jest.mock('@/lib/a2ui/parser', () => ({
  detectA2UIContent: jest.fn((content: string) => {
    return content.includes('"a2ui"') || content.includes('createSurface');
  }),
  extractA2UIFromResponse: jest.fn((content: string) => {
    if (content.includes('"a2ui"') || content.includes('createSurface')) {
      return { surfaceId: 'extracted-surface', messages: [] };
    }
    return null;
  }),
}));

// Mock A2UIInlineSurface
jest.mock('./a2ui-surface', () => ({
  A2UIInlineSurface: ({ surfaceId }: { surfaceId: string }) => (
    <div data-testid="inline-surface">{surfaceId}</div>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

describe('A2UIMessageRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSurface.mockReturnValue({ id: 'extracted-surface', ready: true });
  });

  it('should render A2UI content when detected', () => {
    const content = '{"a2ui": true, "type": "createSurface"}';
    mockExtractAndProcess.mockReturnValue('extracted-surface');

    render(
      <A2UIMessageRenderer content={content} messageId="msg1" />
    );

    expect(screen.getByTestId('inline-surface')).toBeInTheDocument();
    expect(screen.getByTestId('inline-surface')).toHaveTextContent('extracted-surface');
  });

  it('should render text content when no A2UI content detected', () => {
    const content = 'This is a regular message without A2UI';
    mockGetSurface.mockReturnValue(null);

    render(
      <A2UIMessageRenderer content={content} messageId="msg2" />
    );

    // Merged component now renders text content even without A2UI
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.queryByTestId('inline-surface')).toBeNull();
  });

  it('should call extractAndProcess when A2UI content found', () => {
    const content = '{"a2ui": true, "createSurface": {}}';

    render(
      <A2UIMessageRenderer content={content} messageId="msg3" />
    );

    expect(mockExtractAndProcess).toHaveBeenCalledWith(content);
  });

  it('should apply custom className', () => {
    const content = '{"a2ui": true}';
    mockExtractAndProcess.mockReturnValue('test-surface');

    render(
      <A2UIMessageRenderer
        content={content}
        messageId="msg4"
        className="custom-class"
      />
    );

    expect(screen.getByTestId('inline-surface').parentElement).toHaveClass('custom-class');
  });

  it('should pass callbacks to surface', () => {
    const content = '{"a2ui": true}';
    const onAction = jest.fn();
    const onDataChange = jest.fn();

    render(
      <A2UIMessageRenderer
        content={content}
        messageId="msg5"
        onAction={onAction}
        onDataChange={onDataChange}
      />
    );

    expect(screen.getByTestId('inline-surface')).toBeInTheDocument();
  });
});

describe('hasA2UIContent', () => {
  it('should return true for content with A2UI markers', () => {
    expect(hasA2UIContent('{"a2ui": true}')).toBe(true);
    expect(hasA2UIContent('{"type": "createSurface"}')).toBe(true);
  });

  it('should return false for regular content', () => {
    expect(hasA2UIContent('Hello world')).toBe(false);
    expect(hasA2UIContent('Just a normal message')).toBe(false);
  });
});

describe('A2UIMessageRenderer text rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSurface.mockReturnValue({ id: 'test-surface', ready: true });
  });

  it('should render text content only when no A2UI', () => {
    const content = 'This is plain text without A2UI';

    render(
      <A2UIMessageRenderer content={content} messageId="msg1" />
    );

    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.queryByTestId('inline-surface')).toBeNull();
  });

  it('should render both text and A2UI content', () => {
    const content = 'Here is some text\n```json\n{"a2ui": true}\n```';
    mockExtractAndProcess.mockReturnValue('test-surface');

    render(
      <A2UIMessageRenderer content={content} messageId="msg2" />
    );

    expect(screen.getByTestId('inline-surface')).toBeInTheDocument();
  });

  it('should use custom text renderer', () => {
    const content = 'Custom rendered text';
    const textRenderer = (text: string) => <strong data-testid="custom">{text}</strong>;

    render(
      <A2UIMessageRenderer
        content={content}
        messageId="msg3"
        textRenderer={textRenderer}
      />
    );

    expect(screen.getByTestId('custom')).toBeInTheDocument();
    expect(screen.getByTestId('custom')).toHaveTextContent(content);
  });

  it('should apply custom className for text-only content', () => {
    const content = 'Test message';

    const { container } = render(
      <A2UIMessageRenderer
        content={content}
        messageId="msg4"
        className="my-class"
      />
    );

    expect(container.firstChild).toHaveClass('my-class');
  });

  it('should strip A2UI JSON blocks from text content', () => {
    const content = 'Before text ```json\n{"a2ui": true}\n``` After text';

    render(
      <A2UIMessageRenderer content={content} messageId="msg5" />
    );

    // The JSON block should be removed from text
    const textContent = screen.getByText(/Before text/);
    expect(textContent).toBeInTheDocument();
  });
});

describe('useA2UIMessageIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractAndProcess.mockReturnValue('surface-id');
    mockGetSurface.mockReturnValue({ id: 'surface-id', ready: true });
  });

  it('should return integration functions', () => {
    const { result } = renderHook(() => useA2UIMessageIntegration());

    expect(result.current.processMessage).toBeDefined();
    expect(result.current.renderA2UIContent).toBeDefined();
    expect(result.current.hasA2UIContent).toBeDefined();
  });

  it('should process message with A2UI content', () => {
    const { result } = renderHook(() => useA2UIMessageIntegration());

    const surfaceId = result.current.processMessage('{"a2ui": true}', 'msg1');

    expect(surfaceId).toBe('surface-id');
  });

  it('should return null for non-A2UI message', () => {
    const { result } = renderHook(() => useA2UIMessageIntegration());

    const surfaceId = result.current.processMessage('Regular message', 'msg2');

    expect(surfaceId).toBeNull();
  });

  it('should render A2UI content for valid surface', () => {
    const { result } = renderHook(() => useA2UIMessageIntegration());

    const content = result.current.renderA2UIContent('surface-id');

    expect(content).not.toBeNull();
  });

  it('should return null when surface not found', () => {
    mockGetSurface.mockReturnValue(null);

    const { result } = renderHook(() => useA2UIMessageIntegration());

    const content = result.current.renderA2UIContent('non-existent');

    expect(content).toBeNull();
  });

  it('should pass callbacks to useA2UI', () => {
    const onAction = jest.fn();
    const onDataChange = jest.fn();

    renderHook(() =>
      useA2UIMessageIntegration({ onAction, onDataChange })
    );

    const { useA2UI } = jest.requireMock('@/hooks/a2ui');
    expect(useA2UI).toHaveBeenCalledWith({ onAction, onDataChange });
  });
});
