import {
  createSpeedPassEventStatement,
  fromXApiStatement,
  parseXApiPayload,
  serializeSpeedPassEventStatements,
  toXApiStatement,
} from './xapi-event-adapter';
import { isTauri } from '@/lib/utils';

jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => false),
}));

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('xapi-event-adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
  });

  it('creates statement with platform metadata', () => {
    const statement = createSpeedPassEventStatement({
      actorId: 'local-user',
      verb: 'initialized',
      object: {
        id: 'tutorial-1',
        type: 'tutorial',
      },
    });

    expect(statement.id).toBeDefined();
    expect(statement.context?.platform).toBe('web');
    expect(statement.verb).toBe('initialized');
  });

  it('creates statement with tauri platform', () => {
    mockIsTauri.mockReturnValue(true);
    const statement = createSpeedPassEventStatement({
      actorId: 'local-user',
      verb: 'completed',
      object: {
        id: 'quiz-1',
        type: 'quiz',
      },
    });
    expect(statement.context?.platform).toBe('tauri');
  });

  it('maps speedpass statement to xAPI statement', () => {
    const source = createSpeedPassEventStatement({
      actorId: 'user-1',
      actorName: 'Learner',
      verb: 'answered',
      object: { id: 'question-1', type: 'question', name: 'Question 1' },
      result: {
        success: true,
        response: 'B',
        durationMs: 1200,
        score: { raw: 1, min: 0, max: 1 },
      },
      context: {
        sessionId: 'session-1',
      },
    });

    const statement = toXApiStatement(source);

    expect(statement.verb.id).toBe('http://adlnet.gov/expapi/verbs/answered');
    expect(statement.actor.account?.name).toBe('user-1');
    expect(statement.object.id).toBe('question-1');
    expect(statement.result?.duration).toBe('PT1.200S');
    expect(statement.context?.extensions?.sessionId).toBe('session-1');
  });

  it('round-trips xAPI statements through adapter parser', () => {
    const source = createSpeedPassEventStatement({
      actorId: 'user-1',
      verb: 'completed',
      object: { id: 'session-1', type: 'session' },
      result: {
        success: true,
        durationMs: 320000,
      },
      context: {
        mode: 'speed',
      },
    });

    const xapi = toXApiStatement(source);
    const restored = fromXApiStatement(xapi);

    expect(restored).toBeDefined();
    expect(restored?.verb).toBe('completed');
    expect(restored?.object.id).toBe('session-1');
    expect(restored?.result?.durationMs).toBe(320000);
    expect(restored?.context?.mode).toBe('speed');
  });

  it('parses mixed payload formats and reports errors', () => {
    const legacy = createSpeedPassEventStatement({
      actorId: 'legacy-user',
      verb: 'initialized',
      object: { id: 'system', type: 'system' },
    });
    const xapi = toXApiStatement(
      createSpeedPassEventStatement({
        actorId: 'xapi-user',
        verb: 'failed',
        object: { id: 'quiz-2', type: 'quiz' },
      })
    );

    const payload = JSON.stringify([legacy, xapi, 'invalid-entry']);
    const parsed = parseXApiPayload(payload);

    expect(parsed.importedStatements).toHaveLength(2);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.warnings).toHaveLength(0);
  });

  it('parses compatibility xAPI payload and reports strict-validation warnings', () => {
    const payload = JSON.stringify([
      {
        id: 'legacy-xapi-without-verb-id',
        timestamp: new Date().toISOString(),
        actor: {
          objectType: 'Agent',
          name: 'Compatibility User',
        },
        verb: {
          display: {
            'en-US': 'completed',
          },
        },
        object: {
          objectType: 'Activity',
          id: 'session-compat',
        },
      },
    ]);

    const parsed = parseXApiPayload(payload);

    expect(parsed.importedStatements).toHaveLength(1);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.warnings).toHaveLength(1);
    expect(parsed.warnings[0]).toContain('compatibility fallback');
  });

  it('serializes statements as xAPI by default and supports legacy format', () => {
    const statement = createSpeedPassEventStatement({
      actorId: 'user',
      verb: 'mastered',
      object: { id: 'kp-1', type: 'question' },
    });

    const xapiJson = serializeSpeedPassEventStatements({ [statement.id]: statement });
    expect(xapiJson).toContain('"objectType": "Activity"');
    expect(xapiJson).toContain('https://cognia.ai/xapi/verbs/mastered');

    const speedpassJson = serializeSpeedPassEventStatements(
      { [statement.id]: statement },
      { format: 'speedpass' }
    );
    expect(speedpassJson).toContain('"verb": "mastered"');
  });
});
