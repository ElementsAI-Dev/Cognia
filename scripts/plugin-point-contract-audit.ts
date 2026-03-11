import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

interface AuditIssue {
  check: string;
  message: string;
  details?: string;
}

interface PluginPointContractsModule {
  CANONICAL_EXTENSION_POINTS: readonly string[];
  getExtensionPointContract: (point: string) => { status: string };
}

function walkFiles(dir: string, predicate: (file: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function checkMountedExtensionPoints(
  issues: AuditIssue[],
  contracts: PluginPointContractsModule,
): void {
  const hostFiles = [
    ...walkFiles(path.join(process.cwd(), 'components'), (file) => /\.(ts|tsx)$/.test(file)),
    ...walkFiles(path.join(process.cwd(), 'app'), (file) => /\.(ts|tsx)$/.test(file)),
  ];

  const hostContents = hostFiles.map((file) => ({
    file,
    content: fs.readFileSync(file, 'utf-8'),
  }));

  for (const point of contracts.CANONICAL_EXTENSION_POINTS) {
    const contract = contracts.getExtensionPointContract(point);
    if (contract.status !== 'implemented') {
      continue;
    }

    const escapedPoint = point.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`point\\s*=\\s*["']${escapedPoint}["']`);
    const found = hostContents.some((entry) => regex.test(entry.content));

    if (!found) {
      issues.push({
        check: 'mounted-extension-point',
        message: `Implemented extension point "${point}" has no host mount occurrence.`,
        details: `Expected a <PluginExtensionPoint point=\"${point}\" /> usage in app/components.`,
      });
    }
  }
}

function checkRuntimeValidationWiring(issues: AuditIssue[]): void {
  const checks: Array<{ file: string; pattern: RegExp; message: string }> = [
    {
      file: 'lib/plugin/api/extension-api.ts',
      pattern: /validateExtensionPoint\(/,
      message: 'Extension API does not call validateExtensionPoint().',
    },
    {
      file: 'lib/plugin/core/validation.ts',
      pattern: /validateActivationEvent\(/,
      message: 'Manifest validation does not call validateActivationEvent().',
    },
    {
      file: 'lib/plugin/core/manager.ts',
      pattern: /validateHookPoint\(/,
      message: 'Plugin manager does not call validateHookPoint().',
    },
  ];

  for (const check of checks) {
    const fullPath = path.join(process.cwd(), check.file);
    const exists = fs.existsSync(fullPath);
    if (!exists) {
      issues.push({ check: 'runtime-wiring', message: `Missing file: ${check.file}` });
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!check.pattern.test(content)) {
      issues.push({ check: 'runtime-wiring', message: check.message, details: check.file });
    }
  }
}

function checkDocumentationCoverage(
  issues: AuditIssue[],
  contracts: PluginPointContractsModule,
): void {
  const docPath = path.join(process.cwd(), 'docs', 'features', 'plugin-development.md');
  if (!fs.existsSync(docPath)) {
    issues.push({
      check: 'docs-coverage',
      message: 'Plugin development doc is missing.',
      details: docPath,
    });
    return;
  }

  const doc = fs.readFileSync(docPath, 'utf-8');
  const missingPoints = contracts.CANONICAL_EXTENSION_POINTS.filter((point) => !doc.includes(point));

  if (missingPoints.length > 0) {
    issues.push({
      check: 'docs-coverage',
      message: 'Plugin development doc is missing canonical extension point entries.',
      details: missingPoints.join(', '),
    });
  }
}

function checkRequiredTests(issues: AuditIssue[]): void {
  const required = [
    'lib/plugin/contracts/plugin-points.test.ts',
    'lib/plugin/api/extension-api.test.ts',
    'lib/plugin/core/validation.test.ts',
    'lib/plugin/core/manager.test.ts',
  ];

  for (const relative of required) {
    const fullPath = path.join(process.cwd(), relative);
    if (!fs.existsSync(fullPath)) {
      issues.push({
        check: 'test-coverage',
        message: `Missing required plugin point test file: ${relative}`,
      });
    }
  }
}

async function loadContracts(): Promise<PluginPointContractsModule> {
  const contractPath = pathToFileURL(
    path.join(process.cwd(), 'lib', 'plugin', 'contracts', 'plugin-points.ts'),
  ).href;
  return import(contractPath) as Promise<PluginPointContractsModule>;
}

async function main(): Promise<void> {
  const contracts = await loadContracts();
  const issues: AuditIssue[] = [];

  checkMountedExtensionPoints(issues, contracts);
  checkRuntimeValidationWiring(issues);
  checkDocumentationCoverage(issues, contracts);
  checkRequiredTests(issues);

  const report = {
    generatedAt: new Date().toISOString(),
    passed: issues.length === 0,
    issues,
  };

  const reportPath = path.join(process.cwd(), 'artifacts', 'plugin-point-audit-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  if (!report.passed) {
    console.error('Plugin point contract audit failed.');
    for (const issue of issues) {
      console.error(`- [${issue.check}] ${issue.message}`);
      if (issue.details) {
        console.error(`  ${issue.details}`);
      }
    }
    process.exit(1);
  }

  console.log('Plugin point contract audit passed.');
}

void main();
