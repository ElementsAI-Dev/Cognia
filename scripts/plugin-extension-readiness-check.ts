import fs from 'node:fs';
import path from 'node:path';

interface ReadinessCheckResult {
  checked: boolean;
  passed: boolean;
  issues: string[];
}

interface PluginExtensionReadinessReport {
  generatedAt: string;
  passed: boolean;
  checks: {
    capabilityParity: ReadinessCheckResult;
    catalogSourceIntegrity: ReadinessCheckResult;
    devExtensionFlow: ReadinessCheckResult;
  };
}

function read(relativePath: string, cwd: string): string {
  return fs.readFileSync(path.join(cwd, relativePath), 'utf-8');
}

function extractLiteralUnionValues(text: string, typeName: string): Set<string> {
  const marker = `export type ${typeName} =`;
  const start = text.indexOf(marker);
  if (start === -1) return new Set();
  const end = text.indexOf(';', start);
  const block = text.slice(start, end + 1);
  const matches = block.match(/'([^']+)'/g) || [];
  return new Set(matches.map((entry) => entry.slice(1, -1)));
}

function extractPythonEnumValues(text: string, enumName: string): Set<string> {
  const marker = `class ${enumName}(Enum):`;
  const start = text.indexOf(marker);
  if (start === -1) return new Set();
  const rest = text.slice(start + marker.length);
  const values = new Set<string>();
  for (const line of rest.split('\n')) {
    if (!line.startsWith('    ')) {
      if (values.size > 0) break;
      continue;
    }
    const match = line.match(/=\s*"([^"]+)"/);
    if (match?.[1]) values.add(match[1]);
  }
  return values;
}

function collectPluginJsonFiles(root: string): string[] {
  const targets = [
    path.join(root, 'plugins'),
    path.join(root, 'plugin-sdk', 'examples'),
    path.join(root, 'plugin-sdk', 'python', 'examples'),
  ];
  const results: string[] = [];

  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stack = [target];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.name === 'plugin.json') {
          results.push(full);
        }
      }
    }
  }

  return results.sort();
}

export function collectPluginExtensionReadiness(cwd: string): PluginExtensionReadinessReport {
  const hostTypes = read('types/plugin/plugin.ts', cwd);
  const sdkTypes = read('plugin-sdk/typescript/src/core/types.ts', cwd);
  const pyTypes = read('plugin-sdk/python/src/cognia/types.py', cwd);

  const hostCapabilities = extractLiteralUnionValues(hostTypes, 'PluginCapability');
  const sdkCapabilities = extractLiteralUnionValues(sdkTypes, 'PluginCapability');
  const pyCapabilities = extractPythonEnumValues(pyTypes, 'PluginCapability');

  const capabilityIssues: string[] = [];
  for (const capability of hostCapabilities) {
    if (!sdkCapabilities.has(capability)) {
      capabilityIssues.push(`TypeScript SDK missing capability: ${capability}`);
    }
    if (!pyCapabilities.has(capability)) {
      capabilityIssues.push(`Python SDK missing capability: ${capability}`);
    }
  }

  const manifestIssues: string[] = [];
  for (const pluginJson of collectPluginJsonFiles(cwd)) {
    const manifest = JSON.parse(fs.readFileSync(pluginJson, 'utf-8')) as Record<string, unknown>;
    const engines = (manifest.engines || {}) as Record<string, unknown>;
    if (typeof engines.cognia !== 'string') {
      manifestIssues.push(`${path.relative(cwd, pluginJson)} missing engines.cognia`);
    }
    if (
      (manifest.type === 'python' || manifest.type === 'hybrid') &&
      typeof engines.python !== 'string'
    ) {
      manifestIssues.push(`${path.relative(cwd, pluginJson)} missing engines.python`);
    }
  }

  const devFlowIssues: string[] = [];
  if (!fs.existsSync(path.join(cwd, 'lib/plugin/devtools/dev-extension-controller.ts'))) {
    devFlowIssues.push('Missing host dev extension controller');
  }
  if (!read('plugin-sdk/typescript/cli/commands/dev-events.ts', cwd).includes('cognia-dev-extension-update')) {
    devFlowIssues.push('TypeScript SDK dev events do not emit cognia-dev-extension-update');
  }
  if (!read('plugin-sdk/python/src/cognia/cli.py', cwd).includes('create_dev_reload_event')) {
    devFlowIssues.push('Python SDK dev flow does not expose create_dev_reload_event');
  }

  const report: PluginExtensionReadinessReport = {
    generatedAt: new Date().toISOString(),
    passed: capabilityIssues.length === 0 && manifestIssues.length === 0 && devFlowIssues.length === 0,
    checks: {
      capabilityParity: {
        checked: true,
        passed: capabilityIssues.length === 0,
        issues: capabilityIssues,
      },
      catalogSourceIntegrity: {
        checked: true,
        passed: manifestIssues.length === 0,
        issues: manifestIssues,
      },
      devExtensionFlow: {
        checked: true,
        passed: devFlowIssues.length === 0,
        issues: devFlowIssues,
      },
    },
  };

  return report;
}

function main(): void {
  const report = collectPluginExtensionReadiness(process.cwd());
  const outputPath = path.join(process.cwd(), 'artifacts', 'plugin-extension-readiness-report.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  if (!report.passed) {
    console.error('Plugin extension readiness check failed.');
    for (const [name, check] of Object.entries(report.checks)) {
      if (!check.passed) {
        console.error(`- ${name}`);
        for (const issue of check.issues) {
          console.error(`  ${issue}`);
        }
      }
    }
    process.exit(1);
  }

  console.log('Plugin extension readiness check passed.');
}

if (process.argv[1] && path.basename(process.argv[1]) === 'plugin-extension-readiness-check.ts') {
  main();
}
