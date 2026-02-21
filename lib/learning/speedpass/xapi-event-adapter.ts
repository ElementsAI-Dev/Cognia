import { nanoid } from 'nanoid';
import { isTauri } from '@/lib/utils';
import type {
  SpeedPassEventStatement,
  SpeedPassEventVerb,
  XApiActor,
  XApiImportResult,
  XApiStatement,
  XApiVerb,
} from '@/types/learning/speedpass';

export interface CreateSpeedPassEventInput {
  actorId: string;
  actorName?: string;
  verb: SpeedPassEventVerb;
  object: SpeedPassEventStatement['object'];
  result?: SpeedPassEventStatement['result'];
  context?: Omit<NonNullable<SpeedPassEventStatement['context']>, 'platform'>;
}

export interface SerializeStatementsOptions {
  format?: 'xapi' | 'speedpass';
}

const XAPI_DEFAULT_LOCALE = 'en-US';
const COGNIA_XAPI_NAMESPACE = 'https://cognia.ai/xapi/verbs';
const COGNIA_ACTOR_HOME_PAGE = 'https://cognia.ai';
const COGNIA_SPEEDPASS_PROFILE = 'https://cognia.ai/xapi/profiles/speedpass/v1';
const XAPI_PROFILE_ACTIVITY_TYPE = 'https://w3id.org/xapi/profiles#profile';

const SPEEDPASS_OBJECT_TYPE_IRI: Record<SpeedPassEventStatement['object']['type'], string> = {
  textbook: 'https://w3id.org/xapi/acrossx/activities/textbook',
  tutorial: 'https://w3id.org/xapi/acrossx/activities/lesson',
  quiz: 'http://adlnet.gov/expapi/activities/assessment',
  question: 'http://adlnet.gov/expapi/activities/question',
  session: 'https://w3id.org/xapi/acrossx/activities/session',
  'wrong-question': 'https://cognia.ai/xapi/activities/wrong-question',
  settings: 'https://cognia.ai/xapi/activities/settings',
  system: 'http://adlnet.gov/expapi/activities/system',
};

const VERB_IRI_BY_SPEEDPASS: Record<SpeedPassEventVerb, string> = {
  experienced: 'http://adlnet.gov/expapi/verbs/experienced',
  answered: 'http://adlnet.gov/expapi/verbs/answered',
  completed: 'http://adlnet.gov/expapi/verbs/completed',
  failed: 'http://adlnet.gov/expapi/verbs/failed',
  initialized: `${COGNIA_XAPI_NAMESPACE}/initialized`,
  mastered: `${COGNIA_XAPI_NAMESPACE}/mastered`,
};

const SPEEDPASS_BY_VERB_IRI: Record<string, SpeedPassEventVerb> = Object.entries(
  VERB_IRI_BY_SPEEDPASS
).reduce(
  (accumulator, [verb, iri]) => {
    accumulator[iri] = verb as SpeedPassEventVerb;
    return accumulator;
  },
  {} as Record<string, SpeedPassEventVerb>
);

function msToXApiDuration(durationMs?: number): string | undefined {
  if (!durationMs || durationMs <= 0) {
    return undefined;
  }
  const seconds = Math.max(0, durationMs / 1000);
  return `PT${seconds.toFixed(3)}S`;
}

function xapiDurationToMs(duration?: string): number | undefined {
  if (!duration) {
    return undefined;
  }
  const match = duration.match(/^PT(?:(\d+(?:\.\d+)?)S)$/i);
  if (!match) {
    return undefined;
  }
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : undefined;
}

function resolveVerbDisplay(verb: SpeedPassEventVerb): string {
  switch (verb) {
    case 'initialized':
      return 'initialized';
    case 'experienced':
      return 'experienced';
    case 'answered':
      return 'answered';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'mastered':
      return 'mastered';
    default:
      return verb;
  }
}

function resolveSpeedPassVerb(statement: XApiStatement): SpeedPassEventVerb | undefined {
  if (statement.verb?.id && SPEEDPASS_BY_VERB_IRI[statement.verb.id]) {
    return SPEEDPASS_BY_VERB_IRI[statement.verb.id];
  }

  const fallback = statement.verb?.display?.[XAPI_DEFAULT_LOCALE] ?? statement.verb?.display?.en;
  if (!fallback) {
    return undefined;
  }
  return (
    (Object.keys(VERB_IRI_BY_SPEEDPASS) as SpeedPassEventVerb[]).find((verb) => verb === fallback) ??
    undefined
  );
}

function createActor(actorId: string, actorName?: string): XApiActor {
  return {
    objectType: 'Agent',
    name: actorName,
    account: {
      homePage: COGNIA_ACTOR_HOME_PAGE,
      name: actorId,
    },
  };
}

function createVerb(verb: SpeedPassEventVerb): XApiVerb {
  return {
    id: VERB_IRI_BY_SPEEDPASS[verb],
    display: {
      [XAPI_DEFAULT_LOCALE]: resolveVerbDisplay(verb),
    },
  };
}

export function toXApiStatement(statement: SpeedPassEventStatement): XApiStatement {
  return {
    id: statement.id,
    timestamp: statement.timestamp,
    stored: statement.storedAt,
    actor: createActor(statement.actor.id, statement.actor.name),
    verb: createVerb(statement.verb),
    object: {
      objectType: 'Activity',
      id: statement.object.id,
      definition: {
        name: statement.object.name
          ? { [XAPI_DEFAULT_LOCALE]: statement.object.name }
          : undefined,
        type: SPEEDPASS_OBJECT_TYPE_IRI[statement.object.type],
      },
    },
    result: statement.result
      ? {
          success: statement.result.success,
          response: statement.result.response,
          duration: msToXApiDuration(statement.result.durationMs),
          completion: statement.verb === 'completed' ? true : undefined,
          score: statement.result.score,
          extensions: statement.result.extensions,
        }
      : undefined,
    context: statement.context
      ? {
          platform: statement.context.platform,
          contextActivities: {
            category: [
              {
                objectType: 'Activity',
                id: COGNIA_SPEEDPASS_PROFILE,
                definition: {
                  type: XAPI_PROFILE_ACTIVITY_TYPE,
                  name: {
                    [XAPI_DEFAULT_LOCALE]: 'Cognia SpeedPass Profile',
                  },
                },
              },
            ],
          },
          extensions: {
            textbookId: statement.context.textbookId,
            tutorialId: statement.context.tutorialId,
            quizId: statement.context.quizId,
            questionId: statement.context.questionId,
            sessionId: statement.context.sessionId,
            mode: statement.context.mode,
            profile: COGNIA_SPEEDPASS_PROFILE,
            ...(statement.context.extensions || {}),
          },
        }
      : undefined,
  };
}

export function fromXApiStatement(statement: XApiStatement): SpeedPassEventStatement | null {
  const verb = resolveSpeedPassVerb(statement);
  if (!verb) {
    return null;
  }

  const extensions = statement.context?.extensions || {};
  const actorId = statement.actor.account?.name || statement.actor.name || 'anonymous-user';

  return {
    id: statement.id || nanoid(),
    timestamp: statement.timestamp || new Date().toISOString(),
    storedAt: statement.stored || statement.timestamp || new Date().toISOString(),
    actor: {
      id: actorId,
      name: statement.actor.name,
    },
    verb,
    object: {
      id: statement.object.id,
      type:
        ((Object.entries(SPEEDPASS_OBJECT_TYPE_IRI).find(
          ([, iri]) => iri === statement.object.definition?.type
        )?.[0] as SpeedPassEventStatement['object']['type']) || 'system'),
      name: statement.object.definition?.name?.[XAPI_DEFAULT_LOCALE] || statement.object.definition?.name?.en,
    },
    result: statement.result
      ? {
          success: statement.result.success,
          response: statement.result.response,
          durationMs: xapiDurationToMs(statement.result.duration),
          score: statement.result.score,
          extensions: statement.result.extensions,
        }
      : undefined,
    context: {
      platform: statement.context?.platform === 'tauri' ? 'tauri' : 'web',
      textbookId: typeof extensions.textbookId === 'string' ? extensions.textbookId : undefined,
      tutorialId: typeof extensions.tutorialId === 'string' ? extensions.tutorialId : undefined,
      quizId: typeof extensions.quizId === 'string' ? extensions.quizId : undefined,
      questionId: typeof extensions.questionId === 'string' ? extensions.questionId : undefined,
      sessionId: typeof extensions.sessionId === 'string' ? extensions.sessionId : undefined,
      mode:
        extensions.mode === 'extreme' || extensions.mode === 'speed' || extensions.mode === 'comprehensive'
          ? extensions.mode
          : undefined,
      extensions:
        Object.keys(extensions).length > 0
          ? extensions
          : undefined,
    },
  };
}

export function parseXApiPayload(payload: string): XApiImportResult {
  const importedStatements: SpeedPassEventStatement[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const validateStrictXApiStatement = (
    candidate: Partial<XApiStatement>
  ): string[] => {
    const validationErrors: string[] = [];
    const actorId = candidate.actor?.account?.name || candidate.actor?.mbox || candidate.actor?.name;
    if (!candidate.actor || typeof actorId !== 'string' || actorId.trim().length === 0) {
      validationErrors.push('Missing xAPI actor identity.');
    }
    if (!candidate.verb || typeof candidate.verb.id !== 'string' || candidate.verb.id.trim().length === 0) {
      validationErrors.push('Missing xAPI verb.id IRI.');
    }
    if (
      !candidate.object ||
      typeof candidate.object.id !== 'string' ||
      candidate.object.id.trim().length === 0
    ) {
      validationErrors.push('Missing xAPI object.id.');
    }
    if (candidate.object?.objectType && candidate.object.objectType !== 'Activity') {
      validationErrors.push('xAPI objectType must be Activity.');
    }
    return validationErrors;
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    return {
      importedStatements: [],
      errors: [`Invalid JSON payload: ${(error as Error).message}`],
      warnings: [],
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      importedStatements: [],
      errors: ['xAPI payload must be a JSON array of statements.'],
      warnings: [],
    };
  }

  parsed.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      errors.push(`Statement at index ${index} is not an object.`);
      return;
    }

    const candidate = entry as Partial<XApiStatement> & Partial<SpeedPassEventStatement>;
    const isXApiCandidate =
      typeof candidate.verb === 'object' &&
      !!candidate.verb &&
      typeof candidate.object === 'object' &&
      !!candidate.object &&
      'timestamp' in candidate;

    if (isXApiCandidate && candidate.actor && candidate.object) {
      const strictValidationErrors = validateStrictXApiStatement(candidate);
      const normalized = fromXApiStatement(candidate as XApiStatement);
      if (!normalized) {
        errors.push(`Statement at index ${index} has unsupported verb.`);
        return;
      }
      if (strictValidationErrors.length > 0) {
        warnings.push(
          `Statement at index ${index} parsed via compatibility fallback: ${strictValidationErrors.join(
            ' '
          )}`
        );
      }
      importedStatements.push(normalized);
      return;
    }

    if (
      candidate.id &&
      candidate.actor &&
      candidate.object &&
      typeof candidate.verb === 'string'
    ) {
      importedStatements.push(candidate as SpeedPassEventStatement);
      return;
    }

    errors.push(`Statement at index ${index} does not match xAPI or legacy SpeedPass format.`);
  });

  return { importedStatements, errors, warnings };
}

export function createSpeedPassEventStatement(
  input: CreateSpeedPassEventInput
): SpeedPassEventStatement {
  const timestamp = new Date().toISOString();
  const platform: 'web' | 'tauri' = isTauri() ? 'tauri' : 'web';

  return {
    id: nanoid(),
    timestamp,
    storedAt: timestamp,
    actor: {
      id: input.actorId,
      name: input.actorName,
    },
    verb: input.verb,
    object: input.object,
    result: input.result,
    context: {
      platform,
      ...(input.context || {}),
    },
  };
}

export function serializeSpeedPassEventStatements(
  statements: Record<string, SpeedPassEventStatement>,
  options: SerializeStatementsOptions = {}
): string {
  const format = options.format ?? 'xapi';
  const ordered = Object.values(statements).sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
  );

  if (format === 'speedpass') {
    return JSON.stringify(ordered, null, 2);
  }

  return JSON.stringify(ordered.map((statement) => toXApiStatement(statement)), null, 2);
}

export default createSpeedPassEventStatement;
