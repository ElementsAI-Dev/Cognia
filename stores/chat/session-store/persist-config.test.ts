import { sessionStorePersistConfig } from './persist-config';

describe('sessionStorePersistConfig', () => {
  it('persists only lightweight ui state', () => {
    const state = {
      sessions: [{ id: 'session-1', title: 'Persisted session should be excluded' }],
      activeSessionId: 'session-1',
      modeHistory: [
        {
          mode: 'chat',
          sessionId: 'session-1',
          timestamp: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      folders: [
        {
          id: 'folder-1',
          name: 'Folder',
          order: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
      inputDrafts: { 'session-1': 'draft' },
    } as never;

    const partialized = sessionStorePersistConfig.partialize?.(state);
    expect(partialized).toEqual({
      activeSessionId: 'session-1',
      inputDrafts: { 'session-1': 'draft' },
      modeHistory: [
        {
          mode: 'chat',
          sessionId: 'session-1',
          timestamp: '2026-01-01T00:00:00.000Z',
        },
      ],
      folders: [
        {
          id: 'folder-1',
          name: 'Folder',
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('rehydrates mode and folder dates', () => {
    const rehydrate = sessionStorePersistConfig.onRehydrateStorage?.(undefined as never);
    const persisted = {
      activeSessionId: 'session-1',
      inputDrafts: {},
      modeHistory: [
        { mode: 'chat', sessionId: 'session-1', timestamp: '2026-01-01T00:00:00.000Z' },
      ],
      folders: [
        {
          id: 'folder-1',
          name: 'Folder',
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as never;

    rehydrate?.(persisted);

    expect((persisted as any).modeHistory[0].timestamp).toBeInstanceOf(Date);
    expect((persisted as any).folders[0].createdAt).toBeInstanceOf(Date);
    expect((persisted as any).folders[0].updatedAt).toBeInstanceOf(Date);
  });
});
