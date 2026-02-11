/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArtifactDesignerWrapper } from './panel-designer-wrapper';

const mockUpdateArtifact = jest.fn();

jest.mock('@/stores', () => ({
  useArtifactStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      updateArtifact: mockUpdateArtifact,
    };
    return selector(state);
  },
}));

let capturedOnCodeChange: ((code: string) => void) | undefined;

jest.mock('@/components/designer', () => ({
  V0Designer: ({
    open,
    initialCode,
    onCodeChange,
  }: {
    open: boolean;
    initialCode: string;
    onCodeChange: (code: string) => void;
    onOpenChange: (open: boolean) => void;
  }) => {
    capturedOnCodeChange = onCodeChange;
    return (
      <div data-testid="v0-designer" data-open={open} data-code={initialCode} />
    );
  },
}));

const mockArtifact = {
  id: 'artifact-1',
  title: 'Test',
  content: '<div>Hello</div>',
  type: 'html' as const,
  language: 'html',
  version: 1,
  createdAt: new Date(),
};

describe('ArtifactDesignerWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnCodeChange = undefined;
  });

  it('renders V0Designer with correct props', () => {
    render(
      <ArtifactDesignerWrapper
        artifact={mockArtifact}
        open={true}
        onOpenChange={jest.fn()}
      />
    );
    const designer = screen.getByTestId('v0-designer');
    expect(designer).toBeInTheDocument();
    expect(designer).toHaveAttribute('data-open', 'true');
    expect(designer).toHaveAttribute('data-code', '<div>Hello</div>');
  });

  it('calls updateArtifact when code changes', () => {
    render(
      <ArtifactDesignerWrapper
        artifact={mockArtifact}
        open={true}
        onOpenChange={jest.fn()}
      />
    );
    expect(capturedOnCodeChange).toBeDefined();
    capturedOnCodeChange!('<div>Updated</div>');
    expect(mockUpdateArtifact).toHaveBeenCalledWith('artifact-1', {
      content: '<div>Updated</div>',
    });
  });

  it('passes open=false when closed', () => {
    render(
      <ArtifactDesignerWrapper
        artifact={mockArtifact}
        open={false}
        onOpenChange={jest.fn()}
      />
    );
    const designer = screen.getByTestId('v0-designer');
    expect(designer).toHaveAttribute('data-open', 'false');
  });
});
