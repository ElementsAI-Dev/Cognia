import { test, expect } from '@playwright/test';

test.describe('Server/Client serialization boundaries', () => {
  test('selection toolbar route should not log Set serialization errors', async ({ request, baseURL }) => {
    test.setTimeout(240000);
    const response = await request.get(`${baseURL}/selection-toolbar`, {
      timeout: 180000,
    });
    const bodyText = await response.text();

    expect(bodyText).not.toContain(
      'Only plain objects can be passed to Client Components from Server Components'
    );
    expect(bodyText).not.toContain('Set objects are not supported');
  });
});
