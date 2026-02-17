import { fireEvent, screen } from '@testing-library/react';
import { NodeErrorConfigPanel } from './node-error-config';
import { render } from '@testing-library/react';
import { DEFAULT_NODE_ERROR_CONFIG } from '@/types/workflow/workflow-editor';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);
jest.mock('@/components/ui/accordion', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').accordionMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);
jest.mock('@/components/ui/slider', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').sliderMock);

describe('NodeErrorConfigPanel', () => {
  it('uses default config when undefined and updates retry toggle', () => {
    const onChange = jest.fn();
    render(<NodeErrorConfigPanel config={undefined} onChange={onChange} />);

    expect(screen.getByText('Retry on Failure')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('switch')[0]);

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_NODE_ERROR_CONFIG,
      retryOnFailure: true,
    });
  });

  it('updates timeout and error branch', () => {
    const onChange = jest.fn();
    render(
      <NodeErrorConfigPanel
        config={{
          retryOnFailure: true,
          maxRetries: 2,
          retryInterval: 1000,
          continueOnFail: false,
          errorBranch: 'stop',
          timeout: 10000,
        }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '30' } });
    fireEvent.click(screen.getByText('Use Fallback Output'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ timeout: 30000 }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ errorBranch: 'fallback' }));
  });
});
