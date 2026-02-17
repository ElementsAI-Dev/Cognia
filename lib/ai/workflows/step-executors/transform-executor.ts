/**
 * Transform Step Executor
 * Transforms data using expressions (map, filter, reduce, sort, custom)
 */

import type { WorkflowStepDefinition } from './types';
import { evaluateRestrictedExpression } from './expression-evaluator';

interface ParsedLambda {
  params: string[];
  body: string;
}

function parseLambda(expression: string): ParsedLambda | null {
  const index = expression.indexOf('=>');
  if (index < 0) {
    return null;
  }

  const left = expression.slice(0, index).trim();
  const right = expression.slice(index + 2).trim();
  const params = left
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    params,
    body: right,
  };
}

function evaluateLambdaOrExpression(
  expression: string,
  context: Record<string, unknown>,
  defaultParams: Array<[string, unknown]>
): unknown {
  const lambda = parseLambda(expression);
  if (!lambda) {
    return evaluateRestrictedExpression(expression, context);
  }

  const lambdaContext = { ...context };
  lambda.params.forEach((name, index) => {
    const fallback = defaultParams[index];
    if (fallback) {
      lambdaContext[name] = fallback[1];
    }
  });
  return evaluateRestrictedExpression(lambda.body, lambdaContext);
}

export async function executeTransformStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  const expression = step.expression;
  if (!expression) {
    return input;
  }

  try {
    const data = input.data || input;
    
    switch (step.transformType) {
      case 'map': {
        if (!Array.isArray(data)) {
          throw new Error('Map transform requires array input');
        }
        return {
          result: data.map((item, index) =>
            evaluateLambdaOrExpression(expression, { ...input, item, index, data }, [
              ['item', item],
              ['index', index],
            ])
          ),
        };
      }
      case 'filter': {
        if (!Array.isArray(data)) {
          throw new Error('Filter transform requires array input');
        }
        return {
          result: data.filter((item, index) =>
            Boolean(
              evaluateLambdaOrExpression(expression, { ...input, item, index, data }, [
                ['item', item],
                ['index', index],
              ])
            )
          ),
        };
      }
      case 'reduce': {
        if (!Array.isArray(data)) {
          throw new Error('Reduce transform requires array input');
        }
        return {
          result: data.reduce(
            (acc, item, index) =>
              evaluateLambdaOrExpression(
                expression,
                { ...input, acc, item, index, data },
                [
                  ['acc', acc],
                  ['item', item],
                  ['index', index],
                ]
              ),
            null as unknown
          ),
        };
      }
      case 'sort': {
        if (!Array.isArray(data)) {
          throw new Error('Sort transform requires array input');
        }
        const sorted = [...data].sort((a, b) => {
          const value = evaluateLambdaOrExpression(expression, { ...input, a, b, data }, [
            ['a', a],
            ['b', b],
          ]);
          if (typeof value === 'number') return value;
          if (value === true) return 1;
          if (value === false) return -1;
          return 0;
        });
        return { result: sorted };
      }
      case 'custom':
      default: {
        return {
          result: evaluateLambdaOrExpression(expression, { ...input, data, input }, [
            ['data', data],
            ['input', input],
          ]),
        };
      }
    }
  } catch (error) {
    throw new Error(`Transform failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
