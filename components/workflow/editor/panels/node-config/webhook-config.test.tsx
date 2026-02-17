import { fireEvent, screen } from '@testing-library/react';
import { WebhookNodeConfig } from './webhook-config';
import { renderNodeConfig } from './test-support/test-utils';

jest.mock('@/components/ui/select', () => require('@/components/workflow/editor/panels/node-config/test-support/ui-mocks').selectMock);

describe('WebhookNodeConfig', () => {
  it('updates webhook url and body', () => {
    const { onUpdate } = renderNodeConfig(WebhookNodeConfig, {
      id: 'n1',
      nodeType: 'webhook',
      label: 'Webhook',
      method: 'POST',
      webhookUrl: '',
      body: '',
    } as any);

    fireEvent.change(screen.getByPlaceholderText('https://api.example.com/webhook'), { target: { value: 'https://acme.test/hook' } });
    fireEvent.change(screen.getByPlaceholderText('{"key": "value"}'), { target: { value: '{"ok":true}' } });

    expect(onUpdate).toHaveBeenCalledWith({ webhookUrl: 'https://acme.test/hook' });
    expect(onUpdate).toHaveBeenCalledWith({ body: '{"ok":true}' });
  });

  it('updates method via select', () => {
    const { onUpdate } = renderNodeConfig(WebhookNodeConfig, {
      id: 'n1',
      nodeType: 'webhook',
      label: 'Webhook',
      method: 'POST',
    } as any);

    fireEvent.click(screen.getByText('GET'));
    expect(onUpdate).toHaveBeenCalledWith({ method: 'GET' });
  });
});
