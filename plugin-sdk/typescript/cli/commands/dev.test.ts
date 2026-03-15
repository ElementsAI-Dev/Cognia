import { createDevReloadEvent } from './dev-events';

describe('createDevReloadEvent', () => {
  it('creates a structured host-consumable update event for successful builds', () => {
    const event = createDevReloadEvent(
      {
        id: 'dev-plugin',
        name: 'Dev Plugin',
        version: '1.0.0',
        main: 'dist/index.js',
      },
      {
        ok: true,
      },
      '/workspace/dev-plugin/src/index.ts',
    );

    expect(event).toEqual(
      expect.objectContaining({
        type: 'cognia-dev-extension-update',
        pluginId: 'dev-plugin',
        payload: expect.objectContaining({
          event: 'reload-ready',
          output: 'dist/index.js',
        }),
      })
    );
  });

  it('creates a structured error event for failed builds', () => {
    const event = createDevReloadEvent(
      {
        id: 'dev-plugin',
        name: 'Dev Plugin',
        version: '1.0.0',
        main: 'dist/index.js',
      },
      {
        ok: false,
        error: 'build exploded',
      },
      '/workspace/dev-plugin/src/index.ts',
    );

    expect(event).toEqual(
      expect.objectContaining({
        type: 'cognia-dev-extension-update',
        pluginId: 'dev-plugin',
        payload: expect.objectContaining({
          event: 'reload-error',
          error: 'build exploded',
        }),
      })
    );
  });
});
