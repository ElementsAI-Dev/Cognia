import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface ParityIssue {
  category: string;
  message: string;
  missing?: string[];
  extra?: string[];
}

interface PluginPointContractsModule {
  CANONICAL_ACTIVATION_PATTERNS: readonly string[];
  CANONICAL_EXTENSION_POINTS: readonly string[];
  CANONICAL_HOOK_POINTS: readonly string[];
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
}

function extractLiteralUnionValues(text: string, typeName: string): Set<string> {
  const marker = `export type ${typeName} =`;
  const start = text.indexOf(marker);
  if (start === -1) return new Set();

  const end = text.indexOf(';', start);
  if (end === -1) return new Set();

  const block = text.slice(start, end + 1);
  const matches = block.match(/'([^']+)'/g) || [];
  return new Set(matches.map((entry) => entry.slice(1, -1)));
}

function extractHookNames(text: string, interfaceName: string): Set<string> {
  const marker = `export interface ${interfaceName}`;
  const start = text.indexOf(marker);
  if (start === -1) return new Set();

  const openBrace = text.indexOf('{', start);
  if (openBrace === -1) return new Set();

  let depth = 0;
  let end = openBrace;
  for (let i = openBrace; i < text.length; i++) {
    const char = text[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  const block = text.slice(openBrace, end + 1);
  const matches = block.match(/\bon[A-Za-z0-9]+\?(?=:)/g) || [];
  return new Set(matches.map((entry) => entry.replace('?','')));
}

function extractPythonEnumValues(text: string, enumName: string): Set<string> {
  const marker = `class ${enumName}(Enum):`;
  const start = text.indexOf(marker);
  if (start === -1) return new Set();

  const rest = text.slice(start + marker.length);
  const lines = rest.split('\n');
  const values = new Set<string>();

  for (const line of lines) {
    if (!line.trim()) {
      if (values.size > 0) break;
      continue;
    }

    if (!line.startsWith('    ')) {
      if (values.size > 0) break;
      continue;
    }

    const match = line.match(/=\s*"([^"]+)"/);
    if (match?.[1]) {
      values.add(match[1]);
    }
  }

  return values;
}

function diffSets(expected: Set<string>, actual: Set<string>): { missing: string[]; extra: string[] } {
  const missing = [...expected].filter((entry) => !actual.has(entry)).sort();
  const extra = [...actual].filter((entry) => !expected.has(entry)).sort();
  return { missing, extra };
}

async function loadContracts(): Promise<PluginPointContractsModule> {
  const contractPath = pathToFileURL(
    path.join(process.cwd(), 'lib', 'plugin', 'contracts', 'plugin-points.ts'),
  ).href;
  return import(contractPath) as Promise<PluginPointContractsModule>;
}

async function main(): Promise<void> {
  const contracts = await loadContracts();
  const issues: ParityIssue[] = [];

  const tsExtended = readFile('plugin-sdk/typescript/src/context/extended.ts');
  const tsManifest = readFile('plugin-sdk/typescript/src/manifest/types.ts');
  const tsHooksBase = readFile('plugin-sdk/typescript/src/hooks/base.ts');
  const tsHooksExtended = readFile('plugin-sdk/typescript/src/hooks/extended.ts');
  const pyTypes = readFile('plugin-sdk/python/src/cognia/types.py');

  const hostExtensions = new Set<string>(contracts.CANONICAL_EXTENSION_POINTS);
  const hostHooks = new Set<string>(contracts.CANONICAL_HOOK_POINTS);
  const hostActivationPatterns = new Set<string>(contracts.CANONICAL_ACTIVATION_PATTERNS);

  const tsExtensions = extractLiteralUnionValues(tsExtended, 'ExtensionPoint');
  const tsActivations = extractLiteralUnionValues(tsManifest, 'PluginActivationEvent');
  const tsHooks = new Set<string>([
    ...extractHookNames(tsHooksBase, 'PluginHooks'),
    ...extractHookNames(tsHooksExtended, 'PluginHooksAll'),
  ]);

  const pyExtensions = extractPythonEnumValues(pyTypes, 'ExtensionPoint');
  const pyActivations = extractPythonEnumValues(pyTypes, 'PluginActivationEvent');

  const extensionDiffTs = diffSets(hostExtensions, tsExtensions);
  if (extensionDiffTs.missing.length || extensionDiffTs.extra.length) {
    issues.push({
      category: 'typescript.extensions',
      message: 'TypeScript SDK extension point set diverges from host contract.',
      ...extensionDiffTs,
    });
  }

  const activationDiffTs = diffSets(hostActivationPatterns, tsActivations);
  if (activationDiffTs.missing.length || activationDiffTs.extra.length) {
    issues.push({
      category: 'typescript.activation',
      message: 'TypeScript SDK activation pattern set diverges from host contract.',
      ...activationDiffTs,
    });
  }

  const hookDiffTs = diffSets(hostHooks, tsHooks);
  if (hookDiffTs.missing.length || hookDiffTs.extra.length) {
    issues.push({
      category: 'typescript.hooks',
      message: 'TypeScript SDK hook set diverges from host contract.',
      ...hookDiffTs,
    });
  }

  const extensionDiffPy = diffSets(hostExtensions, pyExtensions);
  if (extensionDiffPy.missing.length || extensionDiffPy.extra.length) {
    issues.push({
      category: 'python.extensions',
      message: 'Python SDK extension point set diverges from host contract.',
      ...extensionDiffPy,
    });
  }

  const activationDiffPy = diffSets(hostActivationPatterns, pyActivations);
  if (activationDiffPy.missing.length || activationDiffPy.extra.length) {
    issues.push({
      category: 'python.activation',
      message: 'Python SDK activation pattern set diverges from host contract.',
      ...activationDiffPy,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    passed: issues.length === 0,
    issues,
    stats: {
      host: {
        extensions: hostExtensions.size,
        hooks: hostHooks.size,
        activationPatterns: hostActivationPatterns.size,
      },
      typescript: {
        extensions: tsExtensions.size,
        hooks: tsHooks.size,
        activationPatterns: tsActivations.size,
      },
      python: {
        extensions: pyExtensions.size,
        activationPatterns: pyActivations.size,
      },
    },
  };

  const reportPath = path.join(process.cwd(), 'artifacts', 'plugin-point-parity-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  if (!report.passed) {
    console.error('Plugin point parity check failed.');
    for (const issue of issues) {
      console.error(`- ${issue.category}: ${issue.message}`);
      if (issue.missing?.length) {
        console.error(`  Missing: ${issue.missing.join(', ')}`);
      }
      if (issue.extra?.length) {
        console.error(`  Extra: ${issue.extra.join(', ')}`);
      }
    }
    process.exit(1);
  }

  console.log('Plugin point parity check passed.');
}

void main();
