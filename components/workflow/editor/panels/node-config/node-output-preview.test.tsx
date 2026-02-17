import { fireEvent, screen } from '@testing-library/react';
import { NodeOutputPreview } from './node-output-preview';
import { render } from '@testing-library/react';
import { mockClipboardWriteText } from './test-support/test-utils';

jest.mock('@/components/ui/collapsible', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').collapsibleMock);
jest.mock('@/components/ui/switch', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').switchMock);

describe('NodeOutputPreview', () => {
  it('pins live output data when switch is enabled', () => {
    const onPinnedDataChange = jest.fn();
    render(
      <NodeOutputPreview
        executionOutput={{ ok: true }}
        pinnedData={{ isPinned: false }}
        onPinnedDataChange={onPinnedDataChange}
      />
    );

    fireEvent.click(screen.getByRole('switch'));
    expect(onPinnedDataChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isPinned: true,
        data: { ok: true },
      })
    );
  });

  it('copies output to clipboard', () => {
    const writeText = mockClipboardWriteText();
    render(
      <NodeOutputPreview
        executionOutput={{ foo: 'bar' }}
        pinnedData={{ isPinned: false }}
        onPinnedDataChange={jest.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);
    expect(writeText).toHaveBeenCalledWith(JSON.stringify({ foo: 'bar' }, null, 2));
  });
});
