import { fireEvent, screen } from '@testing-library/react';
import { StartNodeConfig } from './start-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('./io-schema-editor', () => ({
  IOSchemaEditor: ({ onChange }: { onChange: (schema: Record<string, unknown>) => void }) => (
    <button type="button" onClick={() => onChange({ user_input: { type: 'string', description: 'input', required: true } })}>
      update-schema
    </button>
  ),
}));

describe('StartNodeConfig', () => {
  it('renders start node description', () => {
    renderNodeConfig(StartNodeConfig, {
      id: 'n1',
      nodeType: 'start',
      label: 'Start',
      workflowInputs: {},
    } as any);

    expect(screen.getByText(/configure the workflow inputs/i)).toBeInTheDocument();
  });

  it('maps schema changes to workflowInputs', () => {
    const { onUpdate } = renderNodeConfig(StartNodeConfig, {
      id: 'n1',
      nodeType: 'start',
      label: 'Start',
      workflowInputs: {},
    } as any);

    fireEvent.click(screen.getByText('update-schema'));
    expect(onUpdate).toHaveBeenCalledWith({
      workflowInputs: { user_input: { type: 'string', description: 'input', required: true } },
    });
  });
});
