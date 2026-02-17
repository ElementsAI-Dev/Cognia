import { fireEvent, screen } from '@testing-library/react';
import { EndNodeConfig } from './end-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('./io-schema-editor', () => ({
  IOSchemaEditor: ({ onChange }: { onChange: (schema: Record<string, unknown>) => void }) => (
    <button type="button" onClick={() => onChange({ result: { type: 'string', description: 'output' } })}>
      update-output-schema
    </button>
  ),
}));

describe('EndNodeConfig', () => {
  it('renders end node description', () => {
    renderNodeConfig(EndNodeConfig, {
      id: 'n1',
      nodeType: 'end',
      label: 'End',
      workflowOutputs: {},
    } as any);

    expect(screen.getByText(/configure the workflow outputs/i)).toBeInTheDocument();
  });

  it('maps schema changes to workflowOutputs', () => {
    const { onUpdate } = renderNodeConfig(EndNodeConfig, {
      id: 'n1',
      nodeType: 'end',
      label: 'End',
      workflowOutputs: {},
    } as any);

    fireEvent.click(screen.getByText('update-output-schema'));
    expect(onUpdate).toHaveBeenCalledWith({
      workflowOutputs: { result: { type: 'string', description: 'output' } },
    });
  });
});
