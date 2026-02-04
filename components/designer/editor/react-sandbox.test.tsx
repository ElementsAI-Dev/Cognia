/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactSandbox } from './react-sandbox';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock designer store
const mockSetCode = jest.fn();
jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: unknown) => unknown) => {
    const state = {
      code: 'export default function App() { return <div>Test</div>; }',
      setCode: mockSetCode,
    };
    return selector(state);
  },
}));

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      theme: 'light',
    };
    return selector(state);
  },
}));

describe('ReactSandbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render SandpackProvider', () => {
    render(<ReactSandbox />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should render SandpackLayout', () => {
    render(<ReactSandbox />);
    expect(screen.getByTestId('sandpack-layout')).toBeInTheDocument();
  });

  it('should render SandpackCodeEditor when showEditor is true', () => {
    render(<ReactSandbox showEditor={true} />);
    expect(screen.getByTestId('sandpack-code-editor')).toBeInTheDocument();
  });

  it('should render SandpackPreview when showPreview is true', () => {
    render(<ReactSandbox showPreview={true} />);
    expect(screen.getByTestId('sandpack-preview')).toBeInTheDocument();
  });

  it('should not render SandpackCodeEditor when showEditor is false', () => {
    render(<ReactSandbox showEditor={false} />);
    expect(screen.queryByTestId('sandpack-code-editor')).not.toBeInTheDocument();
  });

  it('should not render SandpackPreview when showPreview is false', () => {
    render(<ReactSandbox showPreview={false} />);
    expect(screen.queryByTestId('sandpack-preview')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ReactSandbox className="custom-sandbox" />);
    expect(container.firstChild).toHaveClass('custom-sandbox');
  });

  it('should render with default props', () => {
    render(<ReactSandbox />);
    // Both editor and preview should be visible by default
    expect(screen.getByTestId('sandpack-code-editor')).toBeInTheDocument();
    expect(screen.getByTestId('sandpack-preview')).toBeInTheDocument();
  });

  it('should use prop code when provided', () => {
    const customCode = 'export default function App() { return <div>Custom</div>; }';
    render(<ReactSandbox code={customCode} />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should use store code when prop code is not provided', () => {
    render(<ReactSandbox />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should accept onCodeChange callback', () => {
    const onCodeChange = jest.fn();
    render(<ReactSandbox onCodeChange={onCodeChange} />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should accept showFileExplorer prop', () => {
    render(<ReactSandbox showFileExplorer={true} />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should accept showConsole prop', () => {
    render(<ReactSandbox showConsole={true} />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should accept framework prop', () => {
    render(<ReactSandbox framework="react" />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  it('should accept onAIEdit callback', () => {
    const onAIEdit = jest.fn();
    render(<ReactSandbox onAIEdit={onAIEdit} />);
    expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
  });

  describe('with all props', () => {
    it('should handle all props together', () => {
      const onCodeChange = jest.fn();
      const onAIEdit = jest.fn();
      
      render(
        <ReactSandbox
          className="test-class"
          showEditor={true}
          showPreview={true}
          code="export default function App() { return <div>Test</div>; }"
          onCodeChange={onCodeChange}
          showFileExplorer={true}
          showConsole={true}
          framework="react"
          onAIEdit={onAIEdit}
        />
      );
      
      expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
    });
  });

  describe('theme handling', () => {
    it('should render with light theme', () => {
      render(<ReactSandbox />);
      expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
    });
  });

  describe('editor and preview visibility combinations', () => {
    it('should show only editor', () => {
      render(<ReactSandbox showEditor={true} showPreview={false} />);
      expect(screen.getByTestId('sandpack-code-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('sandpack-preview')).not.toBeInTheDocument();
    });

    it('should show only preview', () => {
      render(<ReactSandbox showEditor={false} showPreview={true} />);
      expect(screen.queryByTestId('sandpack-code-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('sandpack-preview')).toBeInTheDocument();
    });

    it('should show neither when both are false', () => {
      render(<ReactSandbox showEditor={false} showPreview={false} />);
      expect(screen.queryByTestId('sandpack-code-editor')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sandpack-preview')).not.toBeInTheDocument();
    });
  });

  describe('code handling', () => {
    it('should use empty code when store code is empty', () => {
      render(<ReactSandbox code="" />);
      expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
    });

    it('should handle undefined code prop', () => {
      render(<ReactSandbox code={undefined} />);
      expect(screen.getByTestId('sandpack-provider')).toBeInTheDocument();
    });
  });

  describe('container structure', () => {
    it('should have h-full class on container', () => {
      const { container } = render(<ReactSandbox />);
      expect(container.firstChild).toHaveClass('h-full');
    });

    it('should contain SandpackLayout inside SandpackProvider', () => {
      render(<ReactSandbox />);
      const provider = screen.getByTestId('sandpack-provider');
      const layout = screen.getByTestId('sandpack-layout');
      expect(provider).toContainElement(layout);
    });
  });
});
