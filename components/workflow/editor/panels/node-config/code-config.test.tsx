import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { CodeNodeConfig } from './code-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('next/dynamic', () => {
  return () =>
    function MockMonaco(props: { value: string; onChange?: (value: string) => void }) {
      return (
        <textarea
          data-testid="mock-monaco"
          value={props.value}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      );
    };
});

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);
jest.mock('@/lib/monaco', () => ({
  createEditorOptions: jest.fn(() => ({})),
  getMonacoLanguage: jest.fn((lang: string) => lang),
}));
jest.mock('./variable-selector', () => ({
  VariableSelector: ({ onChange }: { onChange: (value: { nodeId: string; variableName: string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ nodeId: 'up', variableName: 'payload' })}>pick-code-var</button>
  ),
}));

describe('CodeNodeConfig', () => {
  it('updates language and code editor value', () => {
    const { onUpdate } = renderNodeConfig(CodeNodeConfig, {
      id: 'n1',
      nodeType: 'code',
      label: 'Code',
      language: 'javascript',
      code: 'return 1;',
      sandbox: { runtime: 'auto', networkEnabled: false },
    } as any);

    fireEvent.click(screen.getByText('Python'));
    fireEvent.change(screen.getByTestId('mock-monaco'), { target: { value: 'return 2;' } });

    expect(onUpdate).toHaveBeenCalledWith({ language: 'python' });
    expect(onUpdate).toHaveBeenCalledWith({ code: 'return 2;' });
  });

  it('updates sandbox fields and inserts variable reference', () => {
    const { onUpdate } = renderNodeConfig(CodeNodeConfig, {
      id: 'n1',
      nodeType: 'code',
      label: 'Code',
      language: 'javascript',
      code: 'const x = ',
      sandbox: { runtime: 'auto', networkEnabled: false },
    } as any);

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '3000' } });
    fireEvent.click(screen.getAllByRole('switch')[0]);
    fireEvent.click(screen.getByText('pick-code-var'));

    expect(onUpdate).toHaveBeenCalledWith({ sandbox: { runtime: 'auto', networkEnabled: false, timeoutMs: 3000 } });
    expect(onUpdate).toHaveBeenCalledWith({ sandbox: { runtime: 'auto', networkEnabled: true } });
    expect(onUpdate).toHaveBeenCalledWith({ code: 'const x = inputs.up.payload' });
  });
});
