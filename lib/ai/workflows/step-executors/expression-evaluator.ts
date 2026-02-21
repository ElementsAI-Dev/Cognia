/**
 * Restricted expression evaluator for workflow step expressions.
 * Evaluates a safe subset of JavaScript expressions without using eval/new Function.
 */

import { parseExpression } from '@babel/parser';
import type { Node } from '@babel/types';

type EvalContext = Record<string, unknown>;

const BLOCKED_IDENTIFIERS = new Set([
  'globalThis',
  'window',
  'document',
  'process',
  'Function',
  'eval',
  'require',
  'module',
  'exports',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function getMemberValue(target: unknown, key: string | number): unknown {
  if (Array.isArray(target)) {
    if (key === 'length') {
      return target.length;
    }
    if (typeof key === 'number' && Number.isInteger(key)) {
      return target[key];
    }
    return undefined;
  }

  if (!isPlainObject(target)) {
    return undefined;
  }

  return target[key as keyof typeof target];
}

function toBoolean(value: unknown): boolean {
  return Boolean(value);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return Number.NaN;
}

function evaluateCall(
  callee: Node,
  args: unknown[],
  context: EvalContext
): unknown {
  if (callee.type === 'Identifier') {
    switch (callee.name) {
      case 'Number':
        return Number(args[0]);
      case 'String':
        return String(args[0] ?? '');
      case 'Boolean':
        return Boolean(args[0]);
      case 'Array':
        return Array.from(args);
      case 'Object':
        return Object(args[0] ?? {});
      default:
        break;
    }
  }

  if (callee.type === 'MemberExpression') {
    if (callee.object.type === 'Identifier' && callee.object.name === 'Math') {
      const method =
        callee.property.type === 'Identifier'
          ? callee.property.name
          : callee.property.type === 'StringLiteral'
            ? callee.property.value
            : null;
      const allowedMathMethods = new Set(['max', 'min', 'abs', 'round', 'floor', 'ceil', 'pow']);
      if (!method || !allowedMathMethods.has(method)) {
        throw new Error(`Unsupported Math method: ${method || 'unknown'}`);
      }
      const fn = (Math as unknown as Record<string, (...values: number[]) => number>)[method];
      return fn(...args.map((arg) => Number(arg)));
    }

    if (
      callee.object.type === 'Identifier' &&
      callee.object.name === 'Array' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'isArray'
    ) {
      return Array.isArray(args[0]);
    }

    const objectValue = evaluateNode(callee.object, context);
      const propertyKey =
        callee.property.type === 'Identifier' && !callee.computed
          ? callee.property.name
          : evaluateNode(callee.property, context);

    if (typeof propertyKey !== 'string' && typeof propertyKey !== 'number') {
      throw new Error('Unsupported call property key');
    }

    const fn = getMemberValue(objectValue, propertyKey);
    if (typeof fn !== 'function') {
      throw new Error('Attempted to call non-function value');
    }

    return fn.apply(objectValue, args);
  }

  throw new Error('Unsupported call expression');
}

function evaluateBinary(operator: string, left: unknown, right: unknown): unknown {
  switch (operator) {
    case '==':
      return left == right;  
    case '===':
      return left === right;
    case '!=':
      return left != right;  
    case '!==':
      return left !== right;
    case '>':
      return toNumber(left) > toNumber(right);
    case '>=':
      return toNumber(left) >= toNumber(right);
    case '<':
      return toNumber(left) < toNumber(right);
    case '<=':
      return toNumber(left) <= toNumber(right);
    case '+':
      if (typeof left === 'string' || typeof right === 'string') {
        return `${left ?? ''}${right ?? ''}`;
      }
      return toNumber(left) + toNumber(right);
    case '-':
      return toNumber(left) - toNumber(right);
    case '*':
      return toNumber(left) * toNumber(right);
    case '/':
      return toNumber(left) / toNumber(right);
    case '%':
      return toNumber(left) % toNumber(right);
    default:
      throw new Error(`Unsupported binary operator: ${operator}`);
  }
}

function evaluateNode(node: Node, context: EvalContext): unknown {
  switch (node.type) {
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'Identifier': {
      if (BLOCKED_IDENTIFIERS.has(node.name)) {
        throw new Error(`Identifier is blocked: ${node.name}`);
      }
      if (!(node.name in context)) {
        throw new Error(`Unknown identifier: ${node.name}`);
      }
      return context[node.name];
    }
    case 'ObjectExpression': {
      const output: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (property.type !== 'ObjectProperty') {
          throw new Error('Unsupported object property');
        }
        const key =
          property.key.type === 'Identifier'
            ? property.key.name
            : property.key.type === 'StringLiteral'
              ? property.key.value
              : null;
        if (!key) {
          throw new Error('Unsupported object key type');
        }
        output[key] = evaluateNode(property.value, context);
      }
      return output;
    }
    case 'ArrayExpression':
      return node.elements.map((element) => {
        if (!element) return null;
        if (element.type === 'SpreadElement') {
          throw new Error('Spread element is not supported');
        }
        return evaluateNode(element, context);
      });
    case 'MemberExpression': {
      const objectValue = evaluateNode(node.object, context);
      const key =
        node.property.type === 'Identifier' && !node.computed
          ? node.property.name
          : evaluateNode(node.property, context);
      if (typeof key !== 'string' && typeof key !== 'number') {
        throw new Error('Unsupported member access key');
      }
      return getMemberValue(objectValue, key);
    }
    case 'UnaryExpression': {
      const value = evaluateNode(node.argument, context);
      switch (node.operator) {
        case '!':
          return !toBoolean(value);
        case '+':
          return +toNumber(value);
        case '-':
          return -toNumber(value);
        default:
          throw new Error(`Unsupported unary operator: ${node.operator}`);
      }
    }
    case 'BinaryExpression':
      return evaluateBinary(
        node.operator,
        evaluateNode(node.left, context),
        evaluateNode(node.right, context)
      );
    case 'LogicalExpression': {
      const left = evaluateNode(node.left, context);
      switch (node.operator) {
        case '&&':
          return toBoolean(left) ? evaluateNode(node.right, context) : left;
        case '||':
          return toBoolean(left) ? left : evaluateNode(node.right, context);
        case '??':
          return left ?? evaluateNode(node.right, context);
        default:
          throw new Error('Unsupported logical operator');
      }
    }
    case 'ConditionalExpression':
      return toBoolean(evaluateNode(node.test, context))
        ? evaluateNode(node.consequent, context)
        : evaluateNode(node.alternate, context);
    case 'TemplateLiteral': {
      let output = '';
      for (let i = 0; i < node.quasis.length; i += 1) {
        output += node.quasis[i]?.value.cooked || '';
        if (node.expressions[i]) {
          output += String(evaluateNode(node.expressions[i], context) ?? '');
        }
      }
      return output;
    }
    case 'CallExpression':
      return evaluateCall(
        node.callee,
        node.arguments.map((arg) => {
          if (arg.type === 'SpreadElement') {
            throw new Error('Spread arguments are not supported');
          }
          return evaluateNode(arg, context);
        }),
        context
      );
    case 'ParenthesizedExpression':
      return evaluateNode(node.expression, context);
    default:
      throw new Error(`Unsupported expression node: ${node.type}`);
  }
}

export function evaluateRestrictedExpression(
  expression: string,
  context: EvalContext
): unknown {
  const ast = parseExpression(expression, {
    sourceType: 'module',
    plugins: ['typescript'],
  });
  return evaluateNode(ast, context);
}

export function evaluateRestrictedBooleanExpression(
  expression: string,
  context: EvalContext
): boolean {
  return Boolean(evaluateRestrictedExpression(expression, context));
}
