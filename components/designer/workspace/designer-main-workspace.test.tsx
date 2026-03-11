/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DesignerMainWorkspace } from './designer-main-workspace';

const mockReactSandbox = jest.fn((_props?: Record<string, unknown>) => <div data-testid="react-sandbox" />);
const mockMonacoEditor = jest.fn((props?: Record<string, unknown>) => {
  const onSave =
    typeof props?.onSave === 'function'
      ? (props.onSave as (code: string) => void)
      : undefined;

  return (
    <button data-testid="monaco-editor" onClick={() => onSave?.('saved-code')}>
      Monaco
    </button>
  );
});

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('../editor/monaco-sandpack-editor', () => ({
  MonacoSandpackEditor: (props: Record<string, unknown>) => mockMonacoEditor(props),
}));

jest.mock('../editor/react-sandbox', () => ({
  ReactSandbox: (props: Record<string, unknown>) => mockReactSandbox(props),
}));

jest.mock('../preview/designer-preview', () => ({
  DesignerPreview: () => <div data-testid="designer-preview" />,
}));

describe('DesignerMainWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders code mode with Monaco and runtime sandbox', () => {
    const onCodeChange = jest.fn();
    render(<DesignerMainWorkspace mode="code" framework="react" onCodeChange={onCodeChange} />);

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.getByTestId('react-sandbox')).toBeInTheDocument();

    const lastSandboxCall = mockReactSandbox.mock.calls[mockReactSandbox.mock.calls.length - 1]?.[0] as
      | Record<string, unknown>
      | undefined;

    expect(lastSandboxCall?.enableRuntimeBridge).toBe(true);
    expect(lastSandboxCall?.framework).toBe('react');

    fireEvent.click(screen.getByTestId('monaco-editor'));
    expect(onCodeChange).toHaveBeenCalledWith('saved-code');
  });

  it('renders preview mode with runtime sandbox', () => {
    render(<DesignerMainWorkspace mode="preview" framework="vue" />);

    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('react-sandbox')).toBeInTheDocument();

    const lastSandboxCall = mockReactSandbox.mock.calls[mockReactSandbox.mock.calls.length - 1]?.[0] as
      | Record<string, unknown>
      | undefined;

    expect(lastSandboxCall?.framework).toBe('vue');
    expect(lastSandboxCall?.showPreview).toBe(true);
    expect(lastSandboxCall?.enableRuntimeBridge).toBe(true);
  });

  it('renders design mode preview component', () => {
    render(<DesignerMainWorkspace mode="design" framework="html" />);

    expect(screen.getByTestId('designer-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('react-sandbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
  });
});
