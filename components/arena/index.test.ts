jest.mock('./arena-dialog', () => ({ ArenaDialog: jest.fn() }));
jest.mock('./arena-error-boundary', () => ({ ArenaErrorBoundary: jest.fn() }));
jest.mock('./arena-diff-view', () => ({ ArenaDiffView: jest.fn() }));
jest.mock('./arena-contestant-card', () => ({ ArenaContestantCard: jest.fn() }));
jest.mock('./arena-battle-view', () => ({ ArenaBattleView: jest.fn() }));
jest.mock('./arena-leaderboard', () => ({ ArenaLeaderboard: jest.fn() }));
jest.mock('./arena-heatmap', () => ({ ArenaHeatmap: jest.fn() }));
jest.mock('./arena-history', () => ({ ArenaHistory: jest.fn() }));
jest.mock('./arena-quick-battle', () => ({ ArenaQuickBattle: jest.fn() }));
jest.mock('./arena-chat-view', () => ({ ArenaChatView: jest.fn() }));
jest.mock('./arena-inline-battle', () => ({ ArenaInlineBattle: jest.fn() }));
jest.mock('./arena-stats', () => ({ ArenaStats: jest.fn() }));

describe('components/arena/index', () => {
  it('exports all arena components via barrel file', () => {
    const arenaExports = require('./index');

    expect(Object.keys(arenaExports).sort()).toEqual([
      'ArenaDialog',
      'ArenaErrorBoundary',
      'ArenaDiffView',
      'ArenaContestantCard',
      'ArenaBattleView',
      'ArenaLeaderboard',
      'ArenaHeatmap',
      'ArenaHistory',
      'ArenaQuickBattle',
      'ArenaChatView',
      'ArenaInlineBattle',
      'ArenaStats',
    ].sort());
  });

  it('does not provide a default export', () => {
    const arenaExports = require('./index');
    expect(arenaExports.default).toBeUndefined();
  });
});
