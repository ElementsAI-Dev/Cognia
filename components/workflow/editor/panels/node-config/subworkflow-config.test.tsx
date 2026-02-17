import { fireEvent, screen } from '@testing-library/react';
import { SubworkflowNodeConfig } from './subworkflow-config';
import { renderNodeConfig } from './test-support/test-utils';

describe('SubworkflowNodeConfig', () => {
  it('renders workflow hint', () => {
    renderNodeConfig(SubworkflowNodeConfig, {
      id: 'n1',
      nodeType: 'subworkflow',
      label: 'Sub',
      workflowId: 'wf-1',
      workflowName: 'Flow 1',
    } as any);

    expect(screen.getByText(/input and output mappings/i)).toBeInTheDocument();
  });

  it('updates workflow id and name', () => {
    const { onUpdate } = renderNodeConfig(SubworkflowNodeConfig, {
      id: 'n1',
      nodeType: 'subworkflow',
      label: 'Sub',
      workflowId: 'wf-1',
      workflowName: 'Flow 1',
    } as any);

    fireEvent.change(screen.getByPlaceholderText('workflow-123'), { target: { value: 'wf-2' } });
    fireEvent.change(screen.getByPlaceholderText('My Subworkflow'), { target: { value: 'Flow 2' } });

    expect(onUpdate).toHaveBeenCalledWith({ workflowId: 'wf-2' });
    expect(onUpdate).toHaveBeenCalledWith({ workflowName: 'Flow 2' });
  });
});
