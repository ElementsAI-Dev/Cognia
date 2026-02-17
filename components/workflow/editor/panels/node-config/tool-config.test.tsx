import { fireEvent, screen } from '@testing-library/react';
import { ToolNodeConfig } from './tool-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);

describe('ToolNodeConfig', () => {
  it('shows selected tool details', () => {
    renderNodeConfig(ToolNodeConfig, {
      id: 'n1',
      nodeType: 'tool',
      label: 'Tool',
      toolName: 'web_search',
      toolCategory: 'search',
    } as any);

    expect(screen.getAllByText('Web Search').length).toBeGreaterThan(1);
    expect(screen.getByText('Search the web for information')).toBeInTheDocument();
  });

  it('updates tool selection and category', () => {
    const { onUpdate } = renderNodeConfig(ToolNodeConfig, {
      id: 'n1',
      nodeType: 'tool',
      label: 'Tool',
      toolName: 'web_search',
      toolCategory: 'search',
    } as any);

    fireEvent.click(screen.getByText('Calculator'));
    expect(onUpdate).toHaveBeenCalledWith({ toolName: 'calculator', toolCategory: 'system' });
  });
});
